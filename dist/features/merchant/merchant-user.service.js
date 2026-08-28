"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserFromMerchant = createUserFromMerchant;
exports.transferUserPoints = transferUserPoints;
exports.findMerchantTargetUser = findMerchantTargetUser;
exports.setUserPlatformRole = setUserPlatformRole;
exports.setUserAccountType = setUserAccountType;
exports.setMerchantUserField = setMerchantUserField;
exports.getMerchantUserDetails = getMerchantUserDetails;
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_model_1 = require("../../models/User.model");
const merchant_config_1 = require("./merchant.config");
const merchant_constants_1 = require("./merchant.constants");
function clean(value) {
    return String(value || "").trim();
}
function normalizeUsername(value) {
    return clean(value).toLowerCase();
}
function generatePassword() {
    return crypto_1.default.randomBytes(9).toString("base64url");
}
async function generateUniqueUserId() {
    for (let attempt = 0; attempt < 20; attempt += 1) {
        const userId = String(Math.floor(100000000 + Math.random() * 900000000));
        const exists = await User_model_1.UserModel.exists({ userId });
        if (!exists) {
            return userId;
        }
    }
    throw new Error("failed_to_generate_user_id");
}
function parseBoolean(value) {
    const normalized = clean(value).toLowerCase();
    if (normalized === "true" ||
        normalized === "1" ||
        normalized === "yes" ||
        normalized === "on") {
        return true;
    }
    if (normalized === "false" ||
        normalized === "0" ||
        normalized === "no" ||
        normalized === "off") {
        return false;
    }
    return null;
}
function isValidUrlOrEmpty(value) {
    if (!value)
        return true;
    try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:";
    }
    catch {
        return false;
    }
}
async function createUserFromMerchant(input) {
    const creatorUserId = clean(input.creatorUserId);
    const username = normalizeUsername(input.username);
    if (!creatorUserId) {
        return {
            ok: false,
            reason: "creator_user_not_found",
        };
    }
    if (!username) {
        return {
            ok: false,
            reason: "empty_username",
        };
    }
    /*
      نتأكد أولًا أن الاسم غير موجود
      قبل خصم النقاط.
    */
    const existingUser = await User_model_1.UserModel.exists({
        username,
    });
    if (existingUser) {
        return {
            ok: false,
            reason: "username_already_exists",
        };
    }
    const cost = merchant_config_1.merchantConfig.accountCreationCost;
    /*
      خصم ذري:
      لا يتم الخصم إلا إذا كان رصيد المستخدم
      أكبر من أو يساوي تكلفة إنشاء الحساب.
    */
    const creatorAfterDebit = await User_model_1.UserModel.findOneAndUpdate({
        userId: creatorUserId,
        points: {
            $gte: cost,
        },
    }, {
        $inc: {
            points: -cost,
        },
    }, {
        new: true,
        runValidators: true,
    });
    if (!creatorAfterDebit) {
        const creatorExists = await User_model_1.UserModel.exists({
            userId: creatorUserId,
        });
        if (!creatorExists) {
            return {
                ok: false,
                reason: "creator_user_not_found",
            };
        }
        return {
            ok: false,
            reason: "insufficient_points",
            requiredPoints: cost,
        };
    }
    try {
        const userId = await generateUniqueUserId();
        const plainPassword = clean(input.requestedPassword) ||
            generatePassword();
        const hashedPassword = await bcryptjs_1.default.hash(plainPassword, 12);
        const user = await User_model_1.UserModel.create({
            userId,
            username,
            password: hashedPassword,
            platformRole: "user",
            accountType: "none",
            roomEntryMediaUrl: "",
            profileEntryMediaUrl: "",
            roomWelcomeMessage: "",
            roomEntryEnabled: false,
            profileEntryEnabled: false,
        });
        console.log("[PAID_ACCOUNT_CREATED]", {
            creatorUserId,
            createdUserId: user.userId,
            username: user.username,
            cost,
            remainingPoints: creatorAfterDebit.points,
        });
        return {
            ok: true,
            user: {
                userId: user.userId,
                username: user.username,
                platformRole: user.platformRole,
                accountType: user.accountType,
            },
            plainPassword,
            cost,
            remainingPoints: creatorAfterDebit.points,
        };
    }
    catch (error) {
        /*
          لو فشل إنشاء الحساب بعد الخصم،
          نعيد النقاط للمستخدم.
        */
        await User_model_1.UserModel.updateOne({
            userId: creatorUserId,
        }, {
            $inc: {
                points: cost,
            },
        });
        if (error?.code === 11000) {
            return {
                ok: false,
                reason: "username_already_exists",
            };
        }
        console.error("[PAID_ACCOUNT_CREATE_ERROR]", error);
        return {
            ok: false,
            reason: "account_creation_failed",
        };
    }
}
async function transferUserPoints(input) {
    const fromUserId = clean(input.fromUserId);
    const targetValue = clean(input.target);
    const amount = Number(input.amount);
    if (!fromUserId || !targetValue) {
        return {
            ok: false,
            reason: "invalid_transfer_target",
        };
    }
    if (!Number.isFinite(amount) ||
        !Number.isInteger(amount) ||
        amount <= 0) {
        return {
            ok: false,
            reason: "invalid_transfer_amount",
        };
    }
    if (amount <
        merchant_config_1.merchantConfig.pointTransferMinAmount) {
        return {
            ok: false,
            reason: "transfer_amount_too_small",
            minAmount: merchant_config_1.merchantConfig.pointTransferMinAmount,
        };
    }
    /*
      الحد الأقصى لا يطبق على مالك الشات.
    */
    if (!input.ownerUnlimited &&
        amount >
            merchant_config_1.merchantConfig.pointTransferMaxAmount) {
        return {
            ok: false,
            reason: "transfer_amount_too_large",
            maxAmount: merchant_config_1.merchantConfig.pointTransferMaxAmount,
        };
    }
    const sender = await User_model_1.UserModel.findOne({
        userId: fromUserId,
    });
    if (!sender) {
        return {
            ok: false,
            reason: "sender_user_not_found",
        };
    }
    const targetUser = await findMerchantTargetUser(targetValue);
    if (!targetUser) {
        return {
            ok: false,
            reason: "user_not_found",
        };
    }
    if (targetUser.userId === fromUserId) {
        return {
            ok: false,
            reason: "cannot_transfer_to_yourself",
        };
    }
    /*
      مالك الشات:
      يضيف النقاط للمستخدم دون خصمها من رصيده.
    */
    if (input.ownerUnlimited) {
        const updatedTarget = await User_model_1.UserModel.findOneAndUpdate({
            userId: targetUser.userId,
        }, {
            $inc: {
                points: amount,
            },
        }, {
            new: true,
            runValidators: true,
        });
        if (!updatedTarget) {
            return {
                ok: false,
                reason: "user_not_found",
            };
        }
        console.log("[OWNER_UNLIMITED_POINTS_TRANSFER]", {
            ownerUserId: fromUserId,
            targetUserId: updatedTarget.userId,
            targetUsername: updatedTarget.username,
            amount,
            targetNewBalance: updatedTarget.points,
        });
        return {
            ok: true,
            ownerUnlimited: true,
            amount,
            sender: {
                userId: sender.userId,
                username: sender.username,
                points: sender.points,
            },
            target: {
                userId: updatedTarget.userId,
                username: updatedTarget.username,
                points: updatedTarget.points,
            },
        };
    }
    /*
      المستخدم العادي:
      خصم ذري بشرط امتلاكه رصيدًا كافيًا.
    */
    const senderAfterDebit = await User_model_1.UserModel.findOneAndUpdate({
        userId: fromUserId,
        points: {
            $gte: amount,
        },
    }, {
        $inc: {
            points: -amount,
        },
    }, {
        new: true,
        runValidators: true,
    });
    if (!senderAfterDebit) {
        return {
            ok: false,
            reason: "insufficient_points",
            requiredPoints: amount,
        };
    }
    try {
        const targetAfterCredit = await User_model_1.UserModel.findOneAndUpdate({
            userId: targetUser.userId,
        }, {
            $inc: {
                points: amount,
            },
        }, {
            new: true,
            runValidators: true,
        });
        if (!targetAfterCredit) {
            /*
              إعادة النقاط للمرسل إذا تعذر
              تحديث حساب المستقبل.
            */
            await User_model_1.UserModel.updateOne({
                userId: fromUserId,
            }, {
                $inc: {
                    points: amount,
                },
            });
            return {
                ok: false,
                reason: "user_not_found",
            };
        }
        console.log("[USER_POINTS_TRANSFER]", {
            fromUserId,
            fromUsername: senderAfterDebit.username,
            targetUserId: targetAfterCredit.userId,
            targetUsername: targetAfterCredit.username,
            amount,
            senderNewBalance: senderAfterDebit.points,
            targetNewBalance: targetAfterCredit.points,
        });
        return {
            ok: true,
            ownerUnlimited: false,
            amount,
            sender: {
                userId: senderAfterDebit.userId,
                username: senderAfterDebit.username,
                points: senderAfterDebit.points,
            },
            target: {
                userId: targetAfterCredit.userId,
                username: targetAfterCredit.username,
                points: targetAfterCredit.points,
            },
        };
    }
    catch (error) {
        /*
          إذا حدث خطأ غير متوقع بعد الخصم،
          نعيد النقاط للمرسل.
        */
        await User_model_1.UserModel.updateOne({
            userId: fromUserId,
        }, {
            $inc: {
                points: amount,
            },
        });
        console.error("[POINT_TRANSFER_ERROR]", error);
        return {
            ok: false,
            reason: "point_transfer_failed",
        };
    }
}
async function findMerchantTargetUser(usernameOrUserId) {
    const target = clean(usernameOrUserId);
    if (!target)
        return null;
    return User_model_1.UserModel.findOne({
        $or: [
            {
                userId: target,
            },
            {
                username: target.toLowerCase(),
            },
        ],
    });
}
async function setUserPlatformRole(input) {
    const role = clean(input.role).toLowerCase();
    if (!merchant_constants_1.PLATFORM_ROLES.includes(role)) {
        return {
            ok: false,
            reason: "invalid_platform_role",
        };
    }
    /*
      المدير لا يستطيع:
      - تعيين owner
      - تعديل مستخدم owner
    */
    if (input.actorAccessLevel !== "owner" &&
        role === "owner") {
        return {
            ok: false,
            reason: "owner_permission_required",
        };
    }
    const user = await findMerchantTargetUser(input.target);
    if (!user) {
        return {
            ok: false,
            reason: "user_not_found",
        };
    }
    if (input.actorAccessLevel !== "owner" &&
        user.platformRole === "owner") {
        return {
            ok: false,
            reason: "cannot_edit_owner",
        };
    }
    user.platformRole = role;
    await user.save();
    return {
        ok: true,
        user,
    };
}
async function setUserAccountType(input) {
    const accountType = clean(input.accountType)
        .toLowerCase();
    if (!merchant_constants_1.USER_ACCOUNT_TYPES.includes(accountType)) {
        return {
            ok: false,
            reason: "invalid_account_type",
        };
    }
    const user = await findMerchantTargetUser(input.target);
    if (!user) {
        return {
            ok: false,
            reason: "user_not_found",
        };
    }
    user.accountType = accountType;
    await user.save();
    return {
        ok: true,
        user,
    };
}
async function setMerchantUserField(input) {
    const field = clean(input.field);
    const rawValue = clean(input.rawValue);
    if (!merchant_constants_1.MERCHANT_EDITABLE_FIELDS.includes(field)) {
        return {
            ok: false,
            reason: "field_not_editable",
        };
    }
    const user = await findMerchantTargetUser(input.target);
    if (!user) {
        return {
            ok: false,
            reason: "user_not_found",
        };
    }
    /*
      المدير لا يعدل بيانات المالك.
    */
    if (input.actorAccessLevel !== "owner" &&
        user.platformRole === "owner") {
        return {
            ok: false,
            reason: "cannot_edit_owner",
        };
    }
    switch (field) {
        case "platformRole": {
            return setUserPlatformRole({
                target: input.target,
                role: rawValue,
                actorAccessLevel: input.actorAccessLevel,
            });
        }
        case "accountType": {
            return setUserAccountType({
                target: input.target,
                accountType: rawValue,
            });
        }
        case "roomEntryMediaUrl":
        case "profileEntryMediaUrl": {
            const value = rawValue.toLowerCase() === "none" ? "" : rawValue;
            if (!isValidUrlOrEmpty(value)) {
                return {
                    ok: false,
                    reason: "invalid_url",
                };
            }
            user[field] = value;
            break;
        }
        case "roomWelcomeMessage": {
            const value = rawValue.toLowerCase() === "none" ? "" : rawValue;
            if (value.length >
                merchant_constants_1.MAX_ROOM_WELCOME_MESSAGE_LENGTH) {
                return {
                    ok: false,
                    reason: "welcome_message_too_long",
                    maxLength: merchant_constants_1.MAX_ROOM_WELCOME_MESSAGE_LENGTH,
                };
            }
            user.roomWelcomeMessage = value;
            break;
        }
        case "roomEntryEnabled":
        case "profileEntryEnabled": {
            const booleanValue = parseBoolean(rawValue);
            if (booleanValue === null) {
                return {
                    ok: false,
                    reason: "invalid_boolean_value",
                };
            }
            user[field] = booleanValue;
            break;
        }
        case "points": {
            const points = Number(rawValue);
            if (!Number.isFinite(points) ||
                points < 0 ||
                !Number.isInteger(points)) {
                return {
                    ok: false,
                    reason: "invalid_points",
                };
            }
            user.points = points;
            break;
        }
        case "accountColor": {
            if (!/^#[0-9a-fA-F]{6}$/.test(rawValue)) {
                return {
                    ok: false,
                    reason: "invalid_hex_color",
                };
            }
            user.accountColor = rawValue.toUpperCase();
            break;
        }
        case "verificationType": {
            const allowed = [
                "none",
                "blue",
                "gold",
                "business",
            ];
            if (!allowed.includes(rawValue.toLowerCase())) {
                return {
                    ok: false,
                    reason: "invalid_verification_type",
                };
            }
            user.verificationType =
                rawValue.toLowerCase();
            break;
        }
        case "statusMessage": {
            if (rawValue.length > 300) {
                return {
                    ok: false,
                    reason: "status_message_too_long",
                };
            }
            user.statusMessage = rawValue;
            break;
        }
        default:
            return {
                ok: false,
                reason: "unsupported_field",
            };
    }
    await user.save();
    return {
        ok: true,
        user,
    };
}
async function getMerchantUserDetails(target) {
    const user = await findMerchantTargetUser(target);
    if (!user) {
        return {
            ok: false,
            reason: "user_not_found",
        };
    }
    return {
        ok: true,
        user: {
            userId: user.userId,
            username: user.username,
            platformRole: user.platformRole || "user",
            accountType: user.accountType || "none",
            points: user.points,
            accountColor: user.accountColor,
            verificationType: user.verificationType,
            roomEntryMediaUrl: user.roomEntryMediaUrl || "",
            profileEntryMediaUrl: user.profileEntryMediaUrl || "",
            roomWelcomeMessage: user.roomWelcomeMessage || "",
            roomEntryEnabled: user.roomEntryEnabled === true,
            profileEntryEnabled: user.profileEntryEnabled === true,
        },
    };
}
//# sourceMappingURL=merchant-user.service.js.map