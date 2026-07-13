import crypto from "crypto";
import bcrypt from "bcryptjs";

import {
  PlatformRole,
  UserAccountType,
  UserModel,
} from "../../models/User.model";
import { merchantConfig } from "./merchant.config";
import {
  MAX_ROOM_WELCOME_MESSAGE_LENGTH,
  MERCHANT_EDITABLE_FIELDS,
  MerchantEditableField,
  PLATFORM_ROLES,
  USER_ACCOUNT_TYPES,
} from "./merchant.constants";

function clean(value: unknown): string {
  return String(value || "").trim();
}

function normalizeUsername(value: unknown): string {
  return clean(value).toLowerCase();
}

function generatePassword(): string {
  return crypto.randomBytes(9).toString("base64url");
}

async function generateUniqueUserId(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const userId = String(
      Math.floor(100000000 + Math.random() * 900000000)
    );

    const exists = await UserModel.exists({ userId });

    if (!exists) {
      return userId;
    }
  }

  throw new Error("failed_to_generate_user_id");
}

function parseBoolean(value: unknown): boolean | null {
  const normalized = clean(value).toLowerCase();

  if (
    normalized === "true" ||
    normalized === "1" ||
    normalized === "yes" ||
    normalized === "on"
  ) {
    return true;
  }

  if (
    normalized === "false" ||
    normalized === "0" ||
    normalized === "no" ||
    normalized === "off"
  ) {
    return false;
  }

  return null;
}

function isValidUrlOrEmpty(value: string): boolean {
  if (!value) return true;

  try {
    const url = new URL(value);

    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function createUserFromMerchant(input: {
  creatorUserId: string;
  username: string;
  requestedPassword?: string;
}) {
  const creatorUserId = clean(
    input.creatorUserId
  );

  const username = normalizeUsername(
    input.username
  );

  if (!creatorUserId) {
    return {
      ok: false as const,
      reason: "creator_user_not_found",
    };
  }

  if (!username) {
    return {
      ok: false as const,
      reason: "empty_username",
    };
  }

  /*
    نتأكد أولًا أن الاسم غير موجود
    قبل خصم النقاط.
  */
  const existingUser = await UserModel.exists({
    username,
  });

  if (existingUser) {
    return {
      ok: false as const,
      reason: "username_already_exists",
    };
  }

  const cost =
    merchantConfig.accountCreationCost;

  /*
    خصم ذري:
    لا يتم الخصم إلا إذا كان رصيد المستخدم
    أكبر من أو يساوي تكلفة إنشاء الحساب.
  */
  const creatorAfterDebit =
    await UserModel.findOneAndUpdate(
      {
        userId: creatorUserId,
        points: {
          $gte: cost,
        },
      },
      {
        $inc: {
          points: -cost,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

  if (!creatorAfterDebit) {
    const creatorExists =
      await UserModel.exists({
        userId: creatorUserId,
      });

    if (!creatorExists) {
      return {
        ok: false as const,
        reason: "creator_user_not_found",
      };
    }

    return {
      ok: false as const,
      reason: "insufficient_points",
      requiredPoints: cost,
    };
  }

  try {
    const userId =
      await generateUniqueUserId();

    const plainPassword =
      clean(input.requestedPassword) ||
      generatePassword();

    const hashedPassword =
      await bcrypt.hash(
        plainPassword,
        12
      );

    const user = await UserModel.create({
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
      remainingPoints:
        creatorAfterDebit.points,
    });

    return {
      ok: true as const,

      user: {
        userId: user.userId,
        username: user.username,
        platformRole: user.platformRole,
        accountType: user.accountType,
      },

      plainPassword,
      cost,

      remainingPoints:
        creatorAfterDebit.points,
    };
  } catch (error: any) {
    /*
      لو فشل إنشاء الحساب بعد الخصم،
      نعيد النقاط للمستخدم.
    */
    await UserModel.updateOne(
      {
        userId: creatorUserId,
      },
      {
        $inc: {
          points: cost,
        },
      }
    );

    if (error?.code === 11000) {
      return {
        ok: false as const,
        reason: "username_already_exists",
      };
    }

    console.error(
      "[PAID_ACCOUNT_CREATE_ERROR]",
      error
    );

    return {
      ok: false as const,
      reason: "account_creation_failed",
    };
  }
}
export async function transferUserPoints(input: {
  fromUserId: string;
  target: string;
  amount: number;
  ownerUnlimited: boolean;
}) {
  const fromUserId = clean(
    input.fromUserId
  );

  const targetValue = clean(
    input.target
  );

  const amount = Number(input.amount);

  if (!fromUserId || !targetValue) {
    return {
      ok: false as const,
      reason: "invalid_transfer_target",
    };
  }

  if (
    !Number.isFinite(amount) ||
    !Number.isInteger(amount) ||
    amount <= 0
  ) {
    return {
      ok: false as const,
      reason: "invalid_transfer_amount",
    };
  }

  if (
    amount <
    merchantConfig.pointTransferMinAmount
  ) {
    return {
      ok: false as const,
      reason: "transfer_amount_too_small",
      minAmount:
        merchantConfig.pointTransferMinAmount,
    };
  }

  /*
    الحد الأقصى لا يطبق على مالك الشات.
  */
  if (
    !input.ownerUnlimited &&
    amount >
      merchantConfig.pointTransferMaxAmount
  ) {
    return {
      ok: false as const,
      reason: "transfer_amount_too_large",
      maxAmount:
        merchantConfig.pointTransferMaxAmount,
    };
  }

  const sender = await UserModel.findOne({
    userId: fromUserId,
  });

  if (!sender) {
    return {
      ok: false as const,
      reason: "sender_user_not_found",
    };
  }

  const targetUser =
    await findMerchantTargetUser(
      targetValue
    );

  if (!targetUser) {
    return {
      ok: false as const,
      reason: "user_not_found",
    };
  }

  if (
    targetUser.userId === fromUserId
  ) {
    return {
      ok: false as const,
      reason: "cannot_transfer_to_yourself",
    };
  }

  /*
    مالك الشات:
    يضيف النقاط للمستخدم دون خصمها من رصيده.
  */
  if (input.ownerUnlimited) {
    const updatedTarget =
      await UserModel.findOneAndUpdate(
        {
          userId: targetUser.userId,
        },
        {
          $inc: {
            points: amount,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!updatedTarget) {
      return {
        ok: false as const,
        reason: "user_not_found",
      };
    }

    console.log(
      "[OWNER_UNLIMITED_POINTS_TRANSFER]",
      {
        ownerUserId: fromUserId,
        targetUserId:
          updatedTarget.userId,
        targetUsername:
          updatedTarget.username,
        amount,
        targetNewBalance:
          updatedTarget.points,
      }
    );

    return {
      ok: true as const,
      ownerUnlimited: true,
      amount,

      sender: {
        userId: sender.userId,
        username: sender.username,
        points: sender.points,
      },

      target: {
        userId: updatedTarget.userId,
        username:
          updatedTarget.username,
        points:
          updatedTarget.points,
      },
    };
  }

  /*
    المستخدم العادي:
    خصم ذري بشرط امتلاكه رصيدًا كافيًا.
  */
  const senderAfterDebit =
    await UserModel.findOneAndUpdate(
      {
        userId: fromUserId,
        points: {
          $gte: amount,
        },
      },
      {
        $inc: {
          points: -amount,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

  if (!senderAfterDebit) {
    return {
      ok: false as const,
      reason: "insufficient_points",
      requiredPoints: amount,
    };
  }

  try {
    const targetAfterCredit =
      await UserModel.findOneAndUpdate(
        {
          userId: targetUser.userId,
        },
        {
          $inc: {
            points: amount,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!targetAfterCredit) {
      /*
        إعادة النقاط للمرسل إذا تعذر
        تحديث حساب المستقبل.
      */
      await UserModel.updateOne(
        {
          userId: fromUserId,
        },
        {
          $inc: {
            points: amount,
          },
        }
      );

      return {
        ok: false as const,
        reason: "user_not_found",
      };
    }

    console.log(
      "[USER_POINTS_TRANSFER]",
      {
        fromUserId,
        fromUsername:
          senderAfterDebit.username,

        targetUserId:
          targetAfterCredit.userId,

        targetUsername:
          targetAfterCredit.username,

        amount,

        senderNewBalance:
          senderAfterDebit.points,

        targetNewBalance:
          targetAfterCredit.points,
      }
    );

    return {
      ok: true as const,
      ownerUnlimited: false,
      amount,

      sender: {
        userId:
          senderAfterDebit.userId,

        username:
          senderAfterDebit.username,

        points:
          senderAfterDebit.points,
      },

      target: {
        userId:
          targetAfterCredit.userId,

        username:
          targetAfterCredit.username,

        points:
          targetAfterCredit.points,
      },
    };
  } catch (error) {
    /*
      إذا حدث خطأ غير متوقع بعد الخصم،
      نعيد النقاط للمرسل.
    */
    await UserModel.updateOne(
      {
        userId: fromUserId,
      },
      {
        $inc: {
          points: amount,
        },
      }
    );

    console.error(
      "[POINT_TRANSFER_ERROR]",
      error
    );

    return {
      ok: false as const,
      reason: "point_transfer_failed",
    };
  }
}
export async function findMerchantTargetUser(
  usernameOrUserId: string
) {
  const target = clean(usernameOrUserId);

  if (!target) return null;

  return UserModel.findOne({
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

export async function setUserPlatformRole(input: {
  target: string;
  role: PlatformRole;
  actorAccessLevel: "admin" | "owner";
}) {
  const role = clean(input.role).toLowerCase() as PlatformRole;

  if (!PLATFORM_ROLES.includes(role)) {
    return {
      ok: false as const,
      reason: "invalid_platform_role",
    };
  }

  /*
    المدير لا يستطيع:
    - تعيين owner
    - تعديل مستخدم owner
  */
  if (
    input.actorAccessLevel !== "owner" &&
    role === "owner"
  ) {
    return {
      ok: false as const,
      reason: "owner_permission_required",
    };
  }

  const user = await findMerchantTargetUser(input.target);

  if (!user) {
    return {
      ok: false as const,
      reason: "user_not_found",
    };
  }

  if (
    input.actorAccessLevel !== "owner" &&
    user.platformRole === "owner"
  ) {
    return {
      ok: false as const,
      reason: "cannot_edit_owner",
    };
  }

  user.platformRole = role;

  await user.save();

  return {
    ok: true as const,
    user,
  };
}

export async function setUserAccountType(input: {
  target: string;
  accountType: UserAccountType;
}) {
  const accountType = clean(input.accountType)
    .toLowerCase() as UserAccountType;

  if (!USER_ACCOUNT_TYPES.includes(accountType)) {
    return {
      ok: false as const,
      reason: "invalid_account_type",
    };
  }

  const user = await findMerchantTargetUser(input.target);

  if (!user) {
    return {
      ok: false as const,
      reason: "user_not_found",
    };
  }

  user.accountType = accountType;

  await user.save();

  return {
    ok: true as const,
    user,
  };
}

export async function setMerchantUserField(input: {
  target: string;
  field: string;
  rawValue: string;
  actorAccessLevel: "admin" | "owner";
}) {
  const field = clean(input.field) as MerchantEditableField;
  const rawValue = clean(input.rawValue);

  if (
    !MERCHANT_EDITABLE_FIELDS.includes(
      field as MerchantEditableField
    )
  ) {
    return {
      ok: false as const,
      reason: "field_not_editable",
    };
  }

  const user = await findMerchantTargetUser(input.target);

  if (!user) {
    return {
      ok: false as const,
      reason: "user_not_found",
    };
  }

  /*
    المدير لا يعدل بيانات المالك.
  */
  if (
    input.actorAccessLevel !== "owner" &&
    user.platformRole === "owner"
  ) {
    return {
      ok: false as const,
      reason: "cannot_edit_owner",
    };
  }

  switch (field) {
    case "platformRole": {
      return setUserPlatformRole({
        target: input.target,
        role: rawValue as PlatformRole,
        actorAccessLevel: input.actorAccessLevel,
      });
    }

    case "accountType": {
      return setUserAccountType({
        target: input.target,
        accountType: rawValue as UserAccountType,
      });
    }

    case "roomEntryMediaUrl":
    case "profileEntryMediaUrl": {
      const value =
        rawValue.toLowerCase() === "none" ? "" : rawValue;

      if (!isValidUrlOrEmpty(value)) {
        return {
          ok: false as const,
          reason: "invalid_url",
        };
      }

      (user as any)[field] = value;
      break;
    }

    case "roomWelcomeMessage": {
      const value =
        rawValue.toLowerCase() === "none" ? "" : rawValue;

      if (
        value.length >
        MAX_ROOM_WELCOME_MESSAGE_LENGTH
      ) {
        return {
          ok: false as const,
          reason: "welcome_message_too_long",
          maxLength: MAX_ROOM_WELCOME_MESSAGE_LENGTH,
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
          ok: false as const,
          reason: "invalid_boolean_value",
        };
      }

      (user as any)[field] = booleanValue;
      break;
    }

    case "points": {
      const points = Number(rawValue);

      if (
        !Number.isFinite(points) ||
        points < 0 ||
        !Number.isInteger(points)
      ) {
        return {
          ok: false as const,
          reason: "invalid_points",
        };
      }

      user.points = points;
      break;
    }

    case "accountColor": {
      if (!/^#[0-9a-fA-F]{6}$/.test(rawValue)) {
        return {
          ok: false as const,
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
          ok: false as const,
          reason: "invalid_verification_type",
        };
      }

      user.verificationType =
        rawValue.toLowerCase() as any;

      break;
    }

    case "statusMessage": {
      if (rawValue.length > 300) {
        return {
          ok: false as const,
          reason: "status_message_too_long",
        };
      }

      user.statusMessage = rawValue;
      break;
    }

    default:
      return {
        ok: false as const,
        reason: "unsupported_field",
      };
  }

  await user.save();

  return {
    ok: true as const,
    user,
  };
}

export async function getMerchantUserDetails(
  target: string
) {
  const user = await findMerchantTargetUser(target);

  if (!user) {
    return {
      ok: false as const,
      reason: "user_not_found",
    };
  }

  return {
    ok: true as const,

    user: {
      userId: user.userId,
      username: user.username,
      platformRole: user.platformRole || "user",
      accountType: user.accountType || "none",
      points: user.points,
      accountColor: user.accountColor,
      verificationType: user.verificationType,

      roomEntryMediaUrl:
        user.roomEntryMediaUrl || "",

      profileEntryMediaUrl:
        user.profileEntryMediaUrl || "",

      roomWelcomeMessage:
        user.roomWelcomeMessage || "",

      roomEntryEnabled:
        user.roomEntryEnabled === true,

      profileEntryEnabled:
        user.profileEntryEnabled === true,
    },
  };
}