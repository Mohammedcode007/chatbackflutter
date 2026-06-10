import { randomUUID } from "crypto";

import { UserModel } from "../../models/User.model";
import { ProfileViewModel } from "../../models/ProfileView.model";
import { FriendRequestModel } from "../../models/FriendRequest.model";

import {
  deleteCloudinaryFile,
  uploadBase64ToCloudinary,
} from "../media/cloudinary.service";

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

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function calculateAge(birthdate?: string | null) {
  if (!birthdate) return null;

  const date = new Date(birthdate);

  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();

  let age = now.getFullYear() - date.getFullYear();

  const monthDiff = now.getMonth() - date.getMonth();
  const dayDiff = now.getDate() - date.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }

  if (age < 0 || age > 120) return null;

  return age;
}

function publicUserCard(user: any) {
  const obj = user.toObject ? user.toObject() : user;

  return {
    userId: obj.userId,
    username: obj.username,

    photoUrl: obj.photoUrl || "",
    coverUrl: obj.coverUrl || "",

    accountColor: obj.accountColor || "#2BCB00",

    badgeKey: obj.badgeKey || "",
    badgeName: obj.badgeName || "",
    badgeValue: obj.badgeValue || "",

    verificationType: obj.verificationType || "none",

    statusMessage: obj.statusMessage || "",
    current: obj.current || "",

    country: obj.country || "",
    gender: obj.gender || "",
    birthdate: obj.birthdate || "",
    age: calculateAge(obj.birthdate),

    points: obj.points || 0,

    stats: {
      friendsCount: obj.stats?.friendsCount || 0,
      profileViewsCount: obj.stats?.profileViewsCount || 0,
      giftsSentCount: obj.stats?.giftsSentCount || 0,
      giftsReceivedCount: obj.stats?.giftsReceivedCount || 0,
    },

    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

function ensureUserStats(user: any) {
  if (!user.stats) {
    user.stats = {
      friendsCount: 0,
      profileViewsCount: 0,
      giftsSentCount: 0,
      giftsReceivedCount: 0,
    };
  }

  if (typeof user.stats.friendsCount !== "number") {
    user.stats.friendsCount = Array.isArray(user.friends)
      ? user.friends.length
      : 0;
  }

  if (typeof user.stats.profileViewsCount !== "number") {
    user.stats.profileViewsCount = 0;
  }

  if (typeof user.stats.giftsSentCount !== "number") {
    user.stats.giftsSentCount = 0;
  }

  if (typeof user.stats.giftsReceivedCount !== "number") {
    user.stats.giftsReceivedCount = 0;
  }

  if (!Array.isArray(user.friends)) {
    user.friends = [];
  }
}

/*
  Update profile
*/
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

  ensureUserStats(user);

  return {
    ok: true as const,
    user: sanitizeUser(user),
  };
}

/*
  Update avatar / cover
*/
export async function updateUserProfileImageService(input: {
  userId: string;
  imageType: "avatar" | "cover";
  base64: string;
}) {
  const { userId, imageType, base64 } = input;

  const user = await UserModel.findOne({ userId });

  if (!user) {
    return {
      ok: false as const,
      reason: "user_not_found",
    };
  }

  const oldUrl = imageType === "avatar" ? user.photoUrl : user.coverUrl;
  const oldPublicId =
    imageType === "avatar"
      ? (user as any).photoPublicId
      : (user as any).coverPublicId;

  const upload = await uploadBase64ToCloudinary({
    base64,
    userId,
    kind: imageType === "avatar" ? "profile_avatar" : "profile_cover",
  });

  if (!upload.ok) {
    return upload;
  }

  /*
    حذف القديم بعد نجاح رفع الجديد
  */
  if (oldUrl || oldPublicId) {
    await deleteCloudinaryFile({
      url: oldUrl,
      publicId: oldPublicId,
      resourceType: "image",
    });
  }

  if (imageType === "avatar") {
    user.photoUrl = upload.url;
    (user as any).photoPublicId = upload.publicId;
  } else {
    user.coverUrl = upload.url;
    (user as any).coverPublicId = upload.publicId;
  }

  ensureUserStats(user);

  await user.save();

  return {
    ok: true as const,
    user: sanitizeUser(user),
    imageType,
    url: upload.url,
    publicId: upload.publicId,
  };
}

/*
  Delete account
*/
export async function deleteMyAccountService(input: {
  userId: string;
}) {
  const { userId } = input;

  const user = await UserModel.findOne({ userId });

  if (!user) {
    return {
      ok: false as const,
      reason: "user_not_found",
    };
  }

  /*
    حذف صور المستخدم من Cloudinary
  */
  await deleteCloudinaryFile({
    url: user.photoUrl,
    publicId: (user as any).photoPublicId,
    resourceType: "image",
  });

  await deleteCloudinaryFile({
    url: user.coverUrl,
    publicId: (user as any).coverPublicId,
    resourceType: "image",
  });

  /*
    حذف علاقات الصداقة من الآخرين
  */
  await UserModel.updateMany(
    {
      friends: userId,
    },
    {
      $pull: {
        friends: userId,
      },
    }
  );

  /*
    تحديث friendsCount للناس الذين كان عندهم هذا المستخدم
    بسيط: هنحدثهم بعد الحذف بطريقة عامة
  */
  const affectedUsers = await UserModel.find({});

  for (const affected of affectedUsers) {
    ensureUserStats(affected);
    affected.stats.friendsCount = affected.friends.length;
    await affected.save();
  }

  /*
    حذف طلبات الصداقة الخاصة به
  */
  await FriendRequestModel.deleteMany({
    $or: [
      {
        fromUserId: userId,
      },
      {
        toUserId: userId,
      },
    ],
  });

  /*
    حذف زيارات البروفايل الخاصة به
  */
  await ProfileViewModel.deleteMany({
    $or: [
      {
        targetUserId: userId,
      },
      {
        viewerUserId: userId,
      },
    ],
  });

  /*
    حذف الحساب نفسه
  */
  await UserModel.deleteOne({ userId });

  return {
    ok: true as const,
  };
}

/*
  Get full user profile
  - يرجع اللون / البادج / التوثيق / الإحصائيات / العمر
  - يحسب زيارة واحدة يوميًا من كل حساب
*/
export async function getFullUserProfileService(input: {
  viewerUserId: string;
  targetUserId: string;
}) {
  const { viewerUserId, targetUserId } = input;

  const target = await UserModel.findOne({ userId: targetUserId });

  if (!target) {
    return {
      ok: false as const,
      reason: "user_not_found",
    };
  }

  ensureUserStats(target);

  const viewer = await UserModel.findOne({ userId: viewerUserId });

  if (viewer) {
    ensureUserStats(viewer);
  }

  const isSelf = viewerUserId === targetUserId;

  let viewAdded = false;

  /*
    لا نحسب زيارة المستخدم لنفسه
  */
  if (!isSelf) {
    try {
      await ProfileViewModel.create({
        targetUserId,
        viewerUserId,
        viewedDay: todayKey(),
      });

      target.stats.profileViewsCount += 1;
      await target.save();

      viewAdded = true;
    } catch (error: any) {
      /*
        11000 معناها نفس الشخص زار نفس البروفايل في نفس اليوم
        لا نكرر العد
      */
      if (error?.code !== 11000) {
        console.log("[PROFILE VIEW ERROR]", error?.message);
      }
    }
  } else {
    await target.save();
  }

  const isFriend =
    !!viewer && Array.isArray(viewer.friends)
      ? viewer.friends.includes(targetUserId)
      : false;

  const pendingRequest = await FriendRequestModel.findOne({
    status: "pending",
    $or: [
      {
        fromUserId: viewerUserId,
        toUserId: targetUserId,
      },
      {
        fromUserId: targetUserId,
        toUserId: viewerUserId,
      },
    ],
  }).lean();

  return {
    ok: true as const,
    profile: {
      ...publicUserCard(target),

      isSelf,
      isFriend,

      hasPendingFriendRequest: !!pendingRequest,

      pendingFriendRequest: pendingRequest
        ? {
            requestId: pendingRequest.requestId,
            fromUserId: pendingRequest.fromUserId,
            toUserId: pendingRequest.toUserId,
            status: pendingRequest.status,
            createdAt: pendingRequest.createdAt,
          }
        : null,

      viewAdded,
    },
  };
}

/*
  Search users
  يرجع صورة / اسم / لون / بادج / توثيق
*/
export async function searchUsersService(input: {
  viewerUserId: string;
  query: string;
  limit?: number;
}) {
  const { viewerUserId, query } = input;

  const q = String(query || "").trim().toLowerCase();

  if (!q) {
    return {
      ok: true as const,
      users: [],
    };
  }

  const limit = Math.min(Math.max(input.limit || 20, 1), 50);

  const safeRegex = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const users = await UserModel.find({
    userId: {
      $ne: viewerUserId,
    },
    username: {
      $regex: safeRegex,
      $options: "i",
    },
  })
    .limit(limit)
    .select(
      "userId username photoUrl coverUrl accountColor badgeKey badgeName badgeValue verificationType statusMessage current country gender birthdate stats createdAt updatedAt"
    )
    .lean();

  return {
    ok: true as const,
    users: users.map(publicUserCard),
  };
}

/*
  Send friend request
*/
export async function sendFriendRequestService(input: {
  fromUserId: string;
  toUserId: string;
}) {
  const { fromUserId, toUserId } = input;

  if (fromUserId === toUserId) {
    return {
      ok: false as const,
      reason: "cannot_add_yourself",
    };
  }

  const fromUser = await UserModel.findOne({ userId: fromUserId });
  const toUser = await UserModel.findOne({ userId: toUserId });

  if (!fromUser || !toUser) {
    return {
      ok: false as const,
      reason: "user_not_found",
    };
  }

  ensureUserStats(fromUser);
  ensureUserStats(toUser);

  if (fromUser.friends.includes(toUserId)) {
    return {
      ok: false as const,
      reason: "already_friends",
    };
  }

  const existingPending = await FriendRequestModel.findOne({
    status: "pending",
    $or: [
      {
        fromUserId,
        toUserId,
      },
      {
        fromUserId: toUserId,
        toUserId: fromUserId,
      },
    ],
  });

  if (existingPending) {
    return {
      ok: false as const,
      reason: "friend_request_already_pending",
    };
  }

  const request = await FriendRequestModel.create({
    requestId: randomUUID(),
    fromUserId,
    toUserId,
    status: "pending",
  });

  return {
    ok: true as const,
    request: {
      requestId: request.requestId,
      fromUserId: request.fromUserId,
      toUserId: request.toUserId,
      status: request.status,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    },
    fromUser: publicUserCard(fromUser),
    toUser: publicUserCard(toUser),
  };
}

/*
  Accept / reject friend request
*/
export async function respondFriendRequestService(input: {
  userId: string;
  requestId: string;
  action: "accept" | "reject";
}) {
  const { userId, requestId, action } = input;

  const request = await FriendRequestModel.findOne({
    requestId,
    toUserId: userId,
    status: "pending",
  });

  if (!request) {
    return {
      ok: false as const,
      reason: "friend_request_not_found",
    };
  }

  const fromUser = await UserModel.findOne({ userId: request.fromUserId });
  const toUser = await UserModel.findOne({ userId: request.toUserId });

  if (!fromUser || !toUser) {
    return {
      ok: false as const,
      reason: "user_not_found",
    };
  }

  ensureUserStats(fromUser);
  ensureUserStats(toUser);

  if (action === "reject") {
    request.status = "rejected";
    await request.save();

    return {
      ok: true as const,
      action,
      request: {
        requestId: request.requestId,
        fromUserId: request.fromUserId,
        toUserId: request.toUserId,
        status: request.status,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
      },
      fromUser: publicUserCard(fromUser),
      toUser: publicUserCard(toUser),
    };
  }

  request.status = "accepted";

  if (!fromUser.friends.includes(toUser.userId)) {
    fromUser.friends.push(toUser.userId);
  }

  if (!toUser.friends.includes(fromUser.userId)) {
    toUser.friends.push(fromUser.userId);
  }

  fromUser.stats.friendsCount = fromUser.friends.length;
  toUser.stats.friendsCount = toUser.friends.length;

  await fromUser.save();
  await toUser.save();
  await request.save();

  return {
    ok: true as const,
    action,
    request: {
      requestId: request.requestId,
      fromUserId: request.fromUserId,
      toUserId: request.toUserId,
      status: request.status,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    },
    fromUser: publicUserCard(fromUser),
    toUser: publicUserCard(toUser),
  };
}