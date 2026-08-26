"use strict";
// import { LoginPayload, RegisterPayload } from "./auth.types";
// import { UserModel } from "../../models/User.model";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerService = registerService;
exports.loginService = loginService;
exports.resumeService = resumeService;
exports.logoutService = logoutService;
exports.forgotPasswordService = forgotPasswordService;
exports.verifyOtpService = verifyOtpService;
exports.resetPasswordService = resetPasswordService;
// function generatePublicUserId() {
//   return Math.floor(100000000 + Math.random() * 900000000).toString();
// }
// function normalizeUsername(username: string) {
//   return String(username || "").trim().toLowerCase();
// }
// function sanitizeUser(user: any) {
//   const obj = user.toObject ? user.toObject() : user;
//   const { password, __v, ...safeUser } = obj;
//   return {
//     ...safeUser,
//     mongoId: String(obj._id),
//     _id: String(obj._id),
//     createdAt: obj.createdAt,
//     updatedAt: obj.updatedAt,
//   };
// }
// function getDuplicateReason(error: any) {
//   const field = Object.keys(error?.keyPattern || {})[0];
//   console.log("[REGISTER] Duplicate field:", field);
//   if (field === "username") {
//     return "username_already_exists";
//   }
//   if (field === "userId") {
//     return "user_id_already_exists";
//   }
//   if (field === "email") {
//     return "email_already_exists";
//   }
//   if (field === "atUsername") {
//     return "old_atUsername_index_error";
//   }
//   return `duplicate_${field || "unknown"}`;
// }
// export async function registerService(payload: RegisterPayload) {
//   console.log("========== REGISTER START ==========");
//   const username = normalizeUsername(payload.username);
//   const password = String(payload.password || "").trim();
//   console.log("[REGISTER] Normalized data:", {
//     username,
//     username_length: username.length,
//     password_length: password.length,
//   });
//   if (!username || !password) {
//     console.log("[REGISTER] Failed: missing_username_or_password");
//     console.log("========== REGISTER END ==========");
//     return {
//       ok: false as const,
//       reason: "missing_username_or_password",
//     };
//   }
//   if (username.length < 3) {
//     console.log("[REGISTER] Failed: username_too_short");
//     console.log("========== REGISTER END ==========");
//     return {
//       ok: false as const,
//       reason: "username_too_short",
//     };
//   }
//   if (password.length < 6) {
//     console.log("[REGISTER] Failed: password_too_short");
//     console.log("========== REGISTER END ==========");
//     return {
//       ok: false as const,
//       reason: "password_too_short",
//     };
//   }
//   const exists = await UserModel.findOne({ username }).lean();
//   console.log(
//     "[REGISTER] Exists result:",
//     exists
//       ? {
//         _id: String(exists._id),
//         userId: exists.userId,
//         username: exists.username,
//         createdAt: exists.createdAt,
//       }
//       : null
//   );
//   if (exists) {
//     console.log("[REGISTER] Failed: username_already_exists");
//     console.log("========== REGISTER END ==========");
//     return {
//       ok: false as const,
//       reason: "username_already_exists",
//     };
//   }
//   let userId = generatePublicUserId();
//   while (await UserModel.exists({ userId })) {
//     userId = generatePublicUserId();
//   }
//   try {
//     const user = await UserModel.create({
//       userId,
//       username,
//       password,
//       points: 100,
//       photoUrl: "",
//       photoPublicId: "",
//       coverUrl: "",
//       coverPublicId: "",
//       accountColor: "#2BCB00",
//       badgeKey: "",
//       badgeName: "",
//       badgeValue: "",
//       verificationType: "none",
//       inventory: [],
//       current: "1",
//       statusMessage: "",
//       email: "",
//       birthdate: "",
//       country: "",
//       gender: "",
//       privateLock: false,
//       autoJoinStream: false,
//       hideActivityStatus: false,
//       isManualOffline: false,
//       privacy: {
//         dmPrivacy: "open",
//         friendRequestPrivacy: "open",
//         allowCalls: "all",
//       },
//       blockedUsers: [],
//       features: {
//         isVip: false,
//         badge: null,
//         level: 1,
//         roomLimit: 5,
//         canCreatePrivateRoom: false,
//         canUseSpecialEffects: false,
//       },
//     });
//     const safeUser = sanitizeUser(user);
//     console.log("[REGISTER] User created successfully:", {
//       _id: safeUser._id,
//       userId: safeUser.userId,
//       username: safeUser.username,
//     });
//     console.log("========== REGISTER END ==========");
//     return {
//       ok: true as const,
//       user: safeUser,
//     };
//   } catch (error: any) {
//     console.log("[REGISTER] Mongo create error:", {
//       message: error?.message,
//       code: error?.code,
//       keyPattern: error?.keyPattern,
//       keyValue: error?.keyValue,
//     });
//     console.log("========== REGISTER END ==========");
//     if (error?.code === 11000) {
//       return {
//         ok: false as const,
//         reason: getDuplicateReason(error),
//       };
//     }
//     return {
//       ok: false as const,
//       reason: "register_failed",
//     };
//   }
// }
// export async function loginService(payload: LoginPayload) {
//   console.log("========== LOGIN START ==========");
//   const username = normalizeUsername(payload.username);
//   const password = String(payload.password || "").trim();
//   console.log("[LOGIN] Normalized data:", {
//     username,
//     username_length: username.length,
//     password_length: password.length,
//   });
//   if (!username || !password) {
//     console.log("[LOGIN] Failed: missing_username_or_password");
//     console.log("========== LOGIN END ==========");
//     return {
//       ok: false as const,
//       reason: "missing_username_or_password",
//     };
//   }
//   const user = await UserModel.findOne({ username });
//   console.log(
//     "[LOGIN] User found:",
//     user
//       ? {
//         _id: String(user._id),
//         userId: user.userId,
//         username: user.username,
//       }
//       : null
//   );
//   if (!user) {
//     console.log("[LOGIN] Failed: user_not_found");
//     console.log("========== LOGIN END ==========");
//     return {
//       ok: false as const,
//       reason: "user_not_found",
//     };
//   }
//   if (user.password !== password) {
//     console.log("[LOGIN] Failed: wrong_password");
//     console.log("========== LOGIN END ==========");
//     return {
//       ok: false as const,
//       reason: "wrong_password",
//     };
//   }
//   if (!user.userId) {
//     console.log("[LOGIN] Failed: user_missing_userId", {
//       _id: String(user._id),
//       username: user.username,
//     });
//     console.log("========== LOGIN END ==========");
//     return {
//       ok: false as const,
//       reason: "user_missing_userId",
//     };
//   }
//   user.current = "1";
//   user.isManualOffline = false;
//   await user.save();
//   const safeUser = sanitizeUser(user);
//   console.log("[LOGIN] Login success:", {
//     userId: safeUser.userId,
//     username: safeUser.username,
//   });
//   console.log("========== LOGIN END ==========");
//   return {
//     ok: true as const,
//     user: safeUser,
//   };
// }
// export async function logoutService(input?: { userId?: string }) {
//   console.log("[LOGOUT] logoutService called");
//   const userId = input?.userId;
//   if (userId) {
//     await UserModel.updateOne(
//       { userId },
//       {
//         $set: {
//           current: "0",
//           isManualOffline: true,
//         },
//       }
//     );
//   }
//   return {
//     ok: true as const,
//   };
// }
const crypto_1 = __importDefault(require("crypto"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const User_model_1 = require("../../models/User.model");
/*
  مدة صلاحية تسجيل الدخول: 30 يومًا.
*/
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
function generatePublicUserId() {
    return Math.floor(100000000 + Math.random() * 900000000).toString();
}
function normalizeUsername(username) {
    return String(username || "").trim().toLowerCase();
}
/*
  إنشاء رمز آمن يعاد للتطبيق.
*/
function generateSessionToken() {
    return crypto_1.default.randomBytes(48).toString("hex");
}
/*
  لا نخزن الرمز نفسه داخل قاعدة البيانات.
  نخزن SHA-256 فقط.
*/
function hashSessionToken(token) {
    return crypto_1.default
        .createHash("sha256")
        .update(String(token || ""))
        .digest("hex");
}
function sanitizeUser(user) {
    const obj = user.toObject ? user.toObject() : user;
    const { password, __v, sessionTokenHash, sessionExpiresAt, ...safeUser } = obj;
    return {
        ...safeUser,
        mongoId: String(obj._id),
        _id: String(obj._id),
        createdAt: obj.createdAt,
        updatedAt: obj.updatedAt,
    };
}
/*
  إنشاء جلسة جديدة أو تدوير الجلسة القديمة.
*/
async function createSessionForUser(user) {
    const token = generateSessionToken();
    const tokenHash = hashSessionToken(token);
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    user.sessionTokenHash = tokenHash;
    user.sessionExpiresAt = expiresAt;
    await user.save();
    console.log("[AUTH SESSION] Session created:", {
        userId: user.userId,
        expiresAt,
    });
    return {
        token,
        expiresAt,
    };
}
function getDuplicateReason(error) {
    const field = Object.keys(error?.keyPattern || {})[0];
    console.log("[REGISTER] Duplicate field:", field);
    if (field === "username") {
        return "username_already_exists";
    }
    if (field === "userId") {
        return "user_id_already_exists";
    }
    if (field === "email") {
        return "email_already_exists";
    }
    if (field === "atUsername") {
        return "old_atUsername_index_error";
    }
    return `duplicate_${field || "unknown"}`;
}
async function registerService(payload) {
    console.log("========== REGISTER START ==========");
    const username = normalizeUsername(payload.username);
    const password = String(payload.password || "").trim();
    console.log("[REGISTER] Normalized data:", {
        username,
        username_length: username.length,
        password_length: password.length,
    });
    if (!username || !password) {
        console.log("[REGISTER] Failed: missing_username_or_password");
        console.log("========== REGISTER END ==========");
        return {
            ok: false,
            reason: "missing_username_or_password",
        };
    }
    if (username.length < 3) {
        console.log("[REGISTER] Failed: username_too_short");
        console.log("========== REGISTER END ==========");
        return {
            ok: false,
            reason: "username_too_short",
        };
    }
    if (password.length < 6) {
        console.log("[REGISTER] Failed: password_too_short");
        console.log("========== REGISTER END ==========");
        return {
            ok: false,
            reason: "password_too_short",
        };
    }
    const exists = await User_model_1.UserModel.findOne({
        username,
    }).lean();
    console.log("[REGISTER] Exists result:", exists
        ? {
            _id: String(exists._id),
            userId: exists.userId,
            username: exists.username,
            createdAt: exists.createdAt,
        }
        : null);
    if (exists) {
        console.log("[REGISTER] Failed: username_already_exists");
        console.log("========== REGISTER END ==========");
        return {
            ok: false,
            reason: "username_already_exists",
        };
    }
    let userId = generatePublicUserId();
    while (await User_model_1.UserModel.exists({ userId })) {
        userId = generatePublicUserId();
    }
    try {
        const user = await User_model_1.UserModel.create({
            userId,
            username,
            password,
            points: 100,
            photoUrl: "",
            photoPublicId: "",
            coverUrl: "",
            coverPublicId: "",
            accountColor: "#2BCB00",
            badgeKey: "",
            badgeName: "",
            badgeValue: "",
            verificationType: "none",
            inventory: [],
            current: "1",
            statusMessage: "",
            email: "",
            birthdate: "",
            country: "",
            gender: "",
            privateLock: false,
            autoJoinStream: false,
            hideActivityStatus: false,
            isManualOffline: false,
            privacy: {
                dmPrivacy: "open",
                friendRequestPrivacy: "open",
                allowCalls: "all",
            },
            blockedUsers: [],
            features: {
                isVip: false,
                badge: null,
                level: 1,
                roomLimit: 5,
                canCreatePrivateRoom: false,
                canUseSpecialEffects: false,
            },
        });
        const session = await createSessionForUser(user);
        const safeUser = sanitizeUser(user);
        console.log("[REGISTER] User created successfully:", {
            _id: safeUser._id,
            userId: safeUser.userId,
            username: safeUser.username,
            sessionExpiresAt: session.expiresAt,
        });
        console.log("========== REGISTER END ==========");
        return {
            ok: true,
            user: safeUser,
            token: session.token,
            sessionExpiresAt: session.expiresAt.toISOString(),
        };
    }
    catch (error) {
        console.log("[REGISTER] Mongo create error:", {
            message: error?.message,
            code: error?.code,
            keyPattern: error?.keyPattern,
            keyValue: error?.keyValue,
        });
        console.log("========== REGISTER END ==========");
        if (error?.code === 11000) {
            return {
                ok: false,
                reason: getDuplicateReason(error),
            };
        }
        return {
            ok: false,
            reason: "register_failed",
        };
    }
}
async function loginService(payload) {
    console.log("========== LOGIN START ==========");
    const username = normalizeUsername(payload.username);
    const password = String(payload.password || "").trim();
    console.log("[LOGIN] Normalized data:", {
        username,
        username_length: username.length,
        password_length: password.length,
    });
    if (!username || !password) {
        console.log("[LOGIN] Failed: missing_username_or_password");
        console.log("========== LOGIN END ==========");
        return {
            ok: false,
            reason: "missing_username_or_password",
        };
    }
    /*
      نحتاج sessionTokenHash بسبب select:false،
      حتى نستطيع تغييره على الوثيقة عند تسجيل الدخول.
    */
    const user = await User_model_1.UserModel.findOne({
        username,
    }).select("+sessionTokenHash +sessionExpiresAt");
    console.log("[LOGIN] User found:", user
        ? {
            _id: String(user._id),
            userId: user.userId,
            username: user.username,
        }
        : null);
    if (!user) {
        console.log("[LOGIN] Failed: user_not_found");
        console.log("========== LOGIN END ==========");
        return {
            ok: false,
            reason: "user_not_found",
        };
    }
    if (user.password !== password) {
        console.log("[LOGIN] Failed: wrong_password");
        console.log("========== LOGIN END ==========");
        return {
            ok: false,
            reason: "wrong_password",
        };
    }
    if (!user.userId) {
        console.log("[LOGIN] Failed: user_missing_userId", {
            _id: String(user._id),
            username: user.username,
        });
        console.log("========== LOGIN END ==========");
        return {
            ok: false,
            reason: "user_missing_userId",
        };
    }
    user.current = "1";
    user.isManualOffline = false;
    /*
      createSessionForUser يقوم بالحفظ.
    */
    const session = await createSessionForUser(user);
    const safeUser = sanitizeUser(user);
    console.log("[LOGIN] Login success:", {
        userId: safeUser.userId,
        username: safeUser.username,
        sessionExpiresAt: session.expiresAt,
    });
    console.log("========== LOGIN END ==========");
    return {
        ok: true,
        user: safeUser,
        token: session.token,
        sessionExpiresAt: session.expiresAt.toISOString(),
    };
}
/*
  استعادة تسجيل الدخول بعد تشغيل التطبيق.

  التطبيق يرسل token المحفوظ.
  نقارن hash الرمز مع الموجود في MongoDB.
*/
async function resumeService(payload) {
    console.log("========== AUTH RESUME START ==========");
    const token = String(payload.token || "").trim();
    if (!token) {
        console.log("[AUTH RESUME] Failed: missing_session_token");
        console.log("========== AUTH RESUME END ==========");
        return {
            ok: false,
            reason: "missing_session_token",
        };
    }
    const tokenHash = hashSessionToken(token);
    const user = await User_model_1.UserModel.findOne({
        sessionTokenHash: tokenHash,
        sessionExpiresAt: {
            $gt: new Date(),
        },
    }).select("+sessionTokenHash +sessionExpiresAt");
    if (!user) {
        console.log("[AUTH RESUME] Failed: invalid_or_expired_session");
        console.log("========== AUTH RESUME END ==========");
        return {
            ok: false,
            reason: "invalid_or_expired_session",
        };
    }
    user.current = "1";
    user.isManualOffline = false;
    /*
      تدوير الرمز بعد كل استعادة ناجحة.
      الرمز القديم يصبح غير صالح.
    */
    const newSession = await createSessionForUser(user);
    const safeUser = sanitizeUser(user);
    console.log("[AUTH RESUME] Success:", {
        userId: safeUser.userId,
        username: safeUser.username,
        sessionExpiresAt: newSession.expiresAt,
    });
    console.log("========== AUTH RESUME END ==========");
    return {
        ok: true,
        user: safeUser,
        token: newSession.token,
        sessionExpiresAt: newSession.expiresAt.toISOString(),
    };
}
async function logoutService(input) {
    console.log("[LOGOUT] logoutService called");
    const userId = input?.userId;
    if (userId) {
        await User_model_1.UserModel.updateOne({
            userId,
        }, {
            $set: {
                current: "0",
                isManualOffline: true,
            },
            /*
              إبطال جلسة التطبيق المحفوظة.
            */
            $unset: {
                sessionTokenHash: "",
                sessionExpiresAt: "",
            },
        });
    }
    return {
        ok: true,
    };
}
function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
function createTransporter() {
    const smtpUser = process.env.SMTP_USER || "";
    const smtpPass = process.env.SMTP_PASS || "";
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = Number(process.env.SMTP_PORT) || 587;
    if (smtpUser && smtpPass) {
        return nodemailer_1.default.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
        });
    }
    return nodemailer_1.default.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER || "",
            pass: process.env.SMTP_PASS || "",
        },
    });
}
const OTP_EXPIRY_MS = 10 * 60 * 1000;
async function forgotPasswordService(payload) {
    console.log("========== FORGOT PASSWORD START ==========");
    const email = String(payload.email || "").trim().toLowerCase();
    if (!email) {
        console.log("[FORGOT PASSWORD] Failed: missing_email");
        console.log("========== FORGOT PASSWORD END ==========");
        return {
            ok: false,
            reason: "missing_email",
        };
    }
    const user = await User_model_1.UserModel.findOne({ email }).select("+resetPasswordOTP +resetPasswordExpires");
    if (!user) {
        console.log("[FORGOT PASSWORD] User not found for email");
        console.log("========== FORGOT PASSWORD END ==========");
        return {
            ok: false,
            reason: "user_not_found",
        };
    }
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
    user.resetPasswordOTP = otp;
    user.resetPasswordExpires = expiresAt;
    await user.save();
    console.log("[FORGOT PASSWORD] OTP generated:", {
        userId: user.userId,
        email,
        expiresAt,
    });
    try {
        const transporter = createTransporter();
        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@app.com",
            to: email,
            subject: "Password Reset Code",
            text: `Your password reset code is: ${otp}. It expires in 10 minutes.`,
            html: `<p>Your password reset code is: <b>${otp}</b></p><p>This code expires in 10 minutes.</p>`,
        });
        console.log("[FORGOT PASSWORD] Email sent:", { email });
    }
    catch (emailError) {
        console.log("[FORGOT PASSWORD] Email send failed:", {
            message: emailError?.message,
        });
    }
    console.log("========== FORGOT PASSWORD END ==========");
    return {
        ok: true,
        message: "otp_sent",
    };
}
async function verifyOtpService(payload) {
    console.log("========== VERIFY OTP START ==========");
    const email = String(payload.email || "").trim().toLowerCase();
    const otp = String(payload.otp || "").trim();
    const user = await User_model_1.UserModel.findOne({ email }).select("+resetPasswordOTP +resetPasswordExpires");
    if (!user) {
        console.log("[VERIFY OTP] User not found");
        console.log("========== VERIFY OTP END ==========");
        return {
            ok: false,
            reason: "user_not_found",
        };
    }
    if (!user.resetPasswordOTP || !user.resetPasswordExpires) {
        console.log("[VERIFY OTP] No OTP pending");
        console.log("========== VERIFY OTP END ==========");
        return {
            ok: false,
            reason: "no_otp_pending",
        };
    }
    if (new Date() > new Date(user.resetPasswordExpires)) {
        console.log("[VERIFY OTP] OTP expired");
        console.log("========== VERIFY OTP END ==========");
        return {
            ok: false,
            reason: "otp_expired",
        };
    }
    if (user.resetPasswordOTP !== otp) {
        console.log("[VERIFY OTP] Invalid OTP");
        console.log("========== VERIFY OTP END ==========");
        return {
            ok: false,
            reason: "invalid_otp",
        };
    }
    console.log("[VERIFY OTP] OTP verified:", { userId: user.userId });
    console.log("========== VERIFY OTP END ==========");
    return {
        ok: true,
        message: "otp_verified",
    };
}
async function resetPasswordService(payload) {
    console.log("========== RESET PASSWORD START ==========");
    const email = String(payload.email || "").trim().toLowerCase();
    const otp = String(payload.otp || "").trim();
    const newPassword = String(payload.newPassword || "").trim();
    if (newPassword.length < 6) {
        console.log("[RESET PASSWORD] Password too short");
        console.log("========== RESET PASSWORD END ==========");
        return {
            ok: false,
            reason: "password_too_short",
        };
    }
    const user = await User_model_1.UserModel.findOne({ email }).select("+resetPasswordOTP +resetPasswordExpires +sessionTokenHash +sessionExpiresAt");
    if (!user) {
        console.log("[RESET PASSWORD] User not found");
        console.log("========== RESET PASSWORD END ==========");
        return {
            ok: false,
            reason: "user_not_found",
        };
    }
    if (!user.resetPasswordOTP || !user.resetPasswordExpires) {
        console.log("[RESET PASSWORD] No OTP pending");
        console.log("========== RESET PASSWORD END ==========");
        return {
            ok: false,
            reason: "no_otp_pending",
        };
    }
    if (new Date() > new Date(user.resetPasswordExpires)) {
        console.log("[RESET PASSWORD] OTP expired");
        console.log("========== RESET PASSWORD END ==========");
        return {
            ok: false,
            reason: "otp_expired",
        };
    }
    if (user.resetPasswordOTP !== otp) {
        console.log("[RESET PASSWORD] Invalid OTP");
        console.log("========== RESET PASSWORD END ==========");
        return {
            ok: false,
            reason: "invalid_otp",
        };
    }
    user.password = newPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;
    user.sessionTokenHash = undefined;
    user.sessionExpiresAt = undefined;
    await user.save();
    console.log("[RESET PASSWORD] Password reset:", {
        userId: user.userId,
        email,
    });
    console.log("========== RESET PASSWORD END ==========");
    return {
        ok: true,
        message: "password_reset_success",
    };
}
//# sourceMappingURL=auth.service.js.map