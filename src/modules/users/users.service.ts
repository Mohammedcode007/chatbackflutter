import { UserModel } from "../../models/User.model";

function sanitizeUser(user: any) {
  const obj = user.toObject ? user.toObject() : user;

  const { password, __v, ...safeUser } = obj;

  return {
    ...safeUser,
    _id: String(obj._id),
    mongoId: String(obj._id),
  };
}

function isValidEmail(email: string) {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function updateUserProfileService(input: {
  userId: string;
  payload: any;
}) {
  const { userId, payload } = input;

  const update: Record<string, any> = {};

  /*
    status message
  */
  if (payload.status_message !== undefined) {
    update.statusMessage = String(payload.status_message || "").trim();
    update.current = String(payload.status_message || "").trim();
  }

  if (payload.statusMessage !== undefined) {
    update.statusMessage = String(payload.statusMessage || "").trim();
    update.current = String(payload.statusMessage || "").trim();
  }

  /*
    private lock
  */
  if (typeof payload.private_lock === "boolean") {
    update.privateLock = payload.private_lock;
  }

  if (typeof payload.privateLock === "boolean") {
    update.privateLock = payload.privateLock;
  }

  /*
    private message / dm privacy
    allowed: open, friends_only, closed
  */
  if (payload.private_message !== undefined) {
    const value = String(payload.private_message || "").trim();

    if (!["open", "friends_only", "closed"].includes(value)) {
      return {
        ok: false as const,
        reason: "invalid_private_message_value",
      };
    }

    update["privacy.dmPrivacy"] = value;
  }

  if (payload.dm_privacy !== undefined) {
    const value = String(payload.dm_privacy || "").trim();

    if (!["open", "friends_only", "closed"].includes(value)) {
      return {
        ok: false as const,
        reason: "invalid_dm_privacy",
      };
    }

    update["privacy.dmPrivacy"] = value;
  }

  /*
    allow calls
    allowed: all, friends_only, none
  */
  if (payload.allow_calls !== undefined) {
    const value = String(payload.allow_calls || "").trim();

    if (!["all", "friends_only", "none"].includes(value)) {
      return {
        ok: false as const,
        reason: "invalid_allow_calls",
      };
    }

    update["privacy.allowCalls"] = value;
  }

  /*
    auto join stream
  */
  if (typeof payload.auto_join_stream === "boolean") {
    update.autoJoinStream = payload.auto_join_stream;
  }

  if (typeof payload.autoJoinStream === "boolean") {
    update.autoJoinStream = payload.autoJoinStream;
  }

  /*
    hide activity status
  */
  if (typeof payload.hide_activity_status === "boolean") {
    update.hideActivityStatus = payload.hide_activity_status;

    /*
      لو المستخدم أخفى النشاط، اعتبره manual offline
      حتى لا يظهر Online للأصدقاء.
    */
    update.isManualOffline = payload.hide_activity_status;
  }

  if (typeof payload.hideActivityStatus === "boolean") {
    update.hideActivityStatus = payload.hideActivityStatus;
    update.isManualOffline = payload.hideActivityStatus;
  }

  /*
    email
  */
  if (payload.email !== undefined) {
    const email = String(payload.email || "").trim().toLowerCase();

    if (!isValidEmail(email)) {
      return {
        ok: false as const,
        reason: "invalid_email",
      };
    }

    update.email = email;
  }

  /*
    birth day
  */
  if (payload.birth_day !== undefined) {
    update.birthdate = String(payload.birth_day || "").trim();
  }

  if (payload.birthdate !== undefined) {
    update.birthdate = String(payload.birthdate || "").trim();
  }

  /*
    country
  */
  if (payload.country !== undefined) {
    update.country = String(payload.country || "").trim();
  }

  /*
    gender
    allowed: male, female, other, empty
  */
  if (payload.gender !== undefined) {
    const gender = String(payload.gender || "").trim();

    if (!["male", "female", "other", ""].includes(gender)) {
      return {
        ok: false as const,
        reason: "invalid_gender",
      };
    }

    update.gender = gender;
  }

  /*
    change password
    لا يحتاج القديم
  */
  if (payload.new_password !== undefined) {
    const newPassword = String(payload.new_password || "").trim();

    if (newPassword.length < 6) {
      return {
        ok: false as const,
        reason: "password_too_short",
      };
    }

    update.password = newPassword;
  }

  if (payload.password !== undefined) {
    const newPassword = String(payload.password || "").trim();

    if (newPassword.length < 6) {
      return {
        ok: false as const,
        reason: "password_too_short",
      };
    }

    update.password = newPassword;
  }

  if (Object.keys(update).length === 0) {
    return {
      ok: false as const,
      reason: "no_valid_fields",
    };
  }

  const user = await UserModel.findOneAndUpdate(
    { userId },
    {
      $set: update,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!user) {
    return {
      ok: false as const,
      reason: "user_not_found",
    };
  }

  return {
    ok: true as const,
    user: sanitizeUser(user),
  };
}