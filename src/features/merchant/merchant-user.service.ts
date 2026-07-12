import crypto from "crypto";
import bcrypt from "bcryptjs";

import {
  PlatformRole,
  UserAccountType,
  UserModel,
} from "../../models/User.model";

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
  username: string;
  requestedPassword?: string;
}) {
  /*
    بناءً على طلبك:
    اسم المستخدم مسموح أن يكون حرفًا واحدًا فقط.
    الشرط الوحيد هنا أن الاسم ليس فارغًا.
  */
  const username = normalizeUsername(input.username);

  if (!username) {
    return {
      ok: false as const,
      reason: "empty_username",
    };
  }

  const exists = await UserModel.exists({ username });

  if (exists) {
    return {
      ok: false as const,
      reason: "username_already_exists",
    };
  }

  const userId = await generateUniqueUserId();

  const plainPassword =
    clean(input.requestedPassword) || generatePassword();

  const hashedPassword = await bcrypt.hash(plainPassword, 12);

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

  return {
    ok: true as const,

    user: {
      userId: user.userId,
      username: user.username,
      platformRole: user.platformRole,
      accountType: user.accountType,
    },

    /*
      تعرض مرة واحدة فقط في رسالة حساب merchant.
      لا تحفظ كلمة المرور الصريحة في قاعدة البيانات.
    */
    plainPassword,
  };
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