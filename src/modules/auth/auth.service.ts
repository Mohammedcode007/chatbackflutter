
import { LoginPayload, RegisterPayload } from "./auth.types";
import { UserModel } from "../../models/User.model";

function generatePublicUserId() {
  return Math.floor(100000000 + Math.random() * 900000000).toString();
}

function normalizeUsername(username: string) {
  return String(username || "").trim().toLowerCase();
}

function sanitizeUser(user: any) {
  const obj = user.toObject ? user.toObject() : user;

  const { password, __v, ...safeUser } = obj;

  return {
    ...safeUser,
    mongoId: String(obj._id),
    _id: String(obj._id),
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

function getDuplicateReason(error: any) {
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

export async function registerService(payload: RegisterPayload) {
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
      ok: false as const,
      reason: "missing_username_or_password",
    };
  }

  if (username.length < 3) {
    console.log("[REGISTER] Failed: username_too_short");
    console.log("========== REGISTER END ==========");

    return {
      ok: false as const,
      reason: "username_too_short",
    };
  }

  if (password.length < 6) {
    console.log("[REGISTER] Failed: password_too_short");
    console.log("========== REGISTER END ==========");

    return {
      ok: false as const,
      reason: "password_too_short",
    };
  }

  const exists = await UserModel.findOne({ username }).lean();

  console.log(
    "[REGISTER] Exists result:",
    exists
      ? {
          _id: String(exists._id),
          userId: exists.userId,
          username: exists.username,
          createdAt: exists.createdAt,
        }
      : null
  );

  if (exists) {
    console.log("[REGISTER] Failed: username_already_exists");
    console.log("========== REGISTER END ==========");

    return {
      ok: false as const,
      reason: "username_already_exists",
    };
  }

  let userId = generatePublicUserId();

  while (await UserModel.exists({ userId })) {
    userId = generatePublicUserId();
  }

  try {
  const user = await UserModel.create({
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

    const safeUser = sanitizeUser(user);

    console.log("[REGISTER] User created successfully:", {
      _id: safeUser._id,
      userId: safeUser.userId,
      username: safeUser.username,
    });

    console.log("========== REGISTER END ==========");

    return {
      ok: true as const,
      user: safeUser,
    };
  } catch (error: any) {
    console.log("[REGISTER] Mongo create error:", {
      message: error?.message,
      code: error?.code,
      keyPattern: error?.keyPattern,
      keyValue: error?.keyValue,
    });

    console.log("========== REGISTER END ==========");

    if (error?.code === 11000) {
      return {
        ok: false as const,
        reason: getDuplicateReason(error),
      };
    }

    return {
      ok: false as const,
      reason: "register_failed",
    };
  }
}

export async function loginService(payload: LoginPayload) {
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
      ok: false as const,
      reason: "missing_username_or_password",
    };
  }

  const user = await UserModel.findOne({ username });

  console.log(
    "[LOGIN] User found:",
    user
      ? {
          _id: String(user._id),
          userId: user.userId,
          username: user.username,
        }
      : null
  );

  if (!user) {
    console.log("[LOGIN] Failed: user_not_found");
    console.log("========== LOGIN END ==========");

    return {
      ok: false as const,
      reason: "user_not_found",
    };
  }

  if (user.password !== password) {
    console.log("[LOGIN] Failed: wrong_password");
    console.log("========== LOGIN END ==========");

    return {
      ok: false as const,
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
      ok: false as const,
      reason: "user_missing_userId",
    };
  }
user.current = "1";
user.isManualOffline = false;

await user.save();
  const safeUser = sanitizeUser(user);

  console.log("[LOGIN] Login success:", {
    userId: safeUser.userId,
    username: safeUser.username,
  });

  console.log("========== LOGIN END ==========");

  return {
    ok: true as const,
    user: safeUser,
  };
}

export async function logoutService(input?: { userId?: string }) {
  console.log("[LOGOUT] logoutService called");

  const userId = input?.userId;

  if (userId) {
    await UserModel.updateOne(
      { userId },
      {
        $set: {
          current: "0",
          isManualOffline: true,
        },
      }
    );
  }

  return {
    ok: true as const,
  };
}