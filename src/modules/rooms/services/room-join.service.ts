import bcrypt from "bcryptjs";

import { RoomModel } from "../models/Room.model";
import { UserModel } from "../../../models/User.model";

import {
  addUserToRoom,
  removeUserFromRoom,
  getRoomActiveCount,
} from "../../../websocket/stores/roomClients.store";

import { getRoomRole } from "./room-role.service";
import { updateRoomLastJoinedAtService } from "./room-favorite.service";

import {
  sanitizeRoomId,
  sanitizeUserId,
  sanitizeRoomPassword,
} from "../utils/room.sanitize";

import { isIpBanned, normalizeIp } from "../utils/room.ip";

const MAX_ROOM_USERS = 50;

function clean(value: any) {
  return String(value || "").trim();
}

async function getUserDisplayData(input: {
  userId: string;
  fallbackUsername?: string;
  fallbackPhotoUrl?: string;
}) {
  const userId = sanitizeUserId(input.userId);

  const user = await UserModel.findOne({ userId })
    .select(
      "userId username photoUrl accountColor badgeKey badgeName badgeValue verificationType"
    )
    .lean();

  return {
    userId,
    username: clean(user?.username || input.fallbackUsername || "User"),
    photoUrl: clean(user?.photoUrl || input.fallbackPhotoUrl || ""),

    accountColor: clean(user?.accountColor || ""),
    badgeKey: clean(user?.badgeKey || ""),
    badgeName: clean(user?.badgeName || ""),
    badgeValue: clean(user?.badgeValue || ""),
    verificationType: clean(user?.verificationType || "none"),
  };
}

export async function joinRoomService(input: {
  userId: string;
  username?: string;
  photoUrl?: string;

  roomId: string;
  password?: string;

  ip?: string;
  socketId: string;

  /*
    true لو المستخدم راجع بعد disconnect
  */
  dc?: boolean;
}) {
  const userId = sanitizeUserId(input.userId);
  const roomId = sanitizeRoomId(input.roomId);
  const password = sanitizeRoomPassword(input.password);
  const ip = normalizeIp(input.ip);
  const socketId = clean(input.socketId);

  console.log("\n===== joinRoomService START =====");
  console.log("[joinRoomService] raw input:", {
    userId: input.userId,
    username: input.username,
    photoUrl: input.photoUrl,
    roomId: input.roomId,
    hasPassword: clean(input.password).length > 0,
    ip: input.ip,
    socketId: input.socketId,
    dc: input.dc,
  });

  console.log("[joinRoomService] sanitized input:", {
    userId,
    roomId,
    hasPassword: password.length > 0,
    ip,
    socketId,
    dc: input.dc === true,
  });

  if (!userId || !roomId || !socketId) {
    console.log("[joinRoomService] failed: invalid_join_payload");
    console.log("===== joinRoomService END =====\n");

    return {
      ok: false as const,
      reason: "invalid_join_payload",
    };
  }

  const room = await RoomModel.findOne({ roomId });

  if (!room) {
    console.log("[joinRoomService] failed: room_not_found", { roomId });
    console.log("===== joinRoomService END =====\n");

    return {
      ok: false as const,
      reason: "room_not_found",
    };
  }

  /*
    حظر user
  */
  if (room.bannedUsers.includes(userId)) {
    console.log("[joinRoomService] failed: user_banned_from_room", {
      userId,
      roomId,
    });
    console.log("===== joinRoomService END =====\n");

    return {
      ok: false as const,
      reason: "user_banned_from_room",
    };
  }

  /*
    حظر IP
  */
  if (
    isIpBanned({
      ip,
      bannedIps: room.bannedIps,
    })
  ) {
    console.log("[joinRoomService] failed: ip_banned_from_room", {
      userId,
      roomId,
      ip,
    });
    console.log("===== joinRoomService END =====\n");

    return {
      ok: false as const,
      reason: "ip_banned_from_room",
    };
  }

  const role = getRoomRole(room, userId);

  /*
    لو الغرفة مقفولة للـ members فقط:
    none ممنوع يدخل.
  */
if (room.isLockedForNone && role === "none") {
  console.log("[joinRoomService] failed: room_locked_for_none", {
    userId,
    roomId,
    role,
  });
  console.log("===== joinRoomService END =====\n");

  return {
    ok: false as const,
    reason: "room_locked_for_none",
  };
}
  /*
    أقصى عدد 50 مستخدم live.
    لو نفس المستخدم موجود بالفعل لا نمنعه بسبب الحد.
  */
  const activeCountBefore = getRoomActiveCount(roomId);
  const activeUsers = Array.isArray(room.activeUsers) ? room.activeUsers : [];
  const alreadyActive = activeUsers.includes(userId);

  if (
    !alreadyActive &&
    activeCountBefore >= Math.min(room.maxUsers || MAX_ROOM_USERS, MAX_ROOM_USERS)
  ) {
    console.log("[joinRoomService] failed: room_full", {
      userId,
      roomId,
      activeCountBefore,
      maxUsers: room.maxUsers,
    });
    console.log("===== joinRoomService END =====\n");

    return {
      ok: false as const,
      reason: "room_full",
    };
  }

  /*
    باسورد الغرفة:
    creator يدخل بدون باسورد.
    باقي الأدوار تحتاج باسورد لو hasPassword = true.
  */
  if (room.hasPassword && role !== "creator") {
    const ok = await bcrypt.compare(password, room.passwordHash || "");

    if (!ok) {
      console.log("[joinRoomService] failed: wrong_room_password", {
        userId,
        roomId,
        role,
      });
      console.log("===== joinRoomService END =====\n");

      return {
        ok: false as const,
        reason: "wrong_room_password",
      };
    }
  }

  /*
    جلب بيانات المستخدم كاملة:
    الصورة، لون الحساب، البادج، التوثيق.
  */
  const userDisplay = await getUserDisplayData({
    userId,
    fallbackUsername: input.username,
    fallbackPhotoUrl: input.photoUrl,
  });

  console.log("[joinRoomService] userDisplay:", userDisplay);

  /*
    أضف المستخدم للـ live memory store.
    هذا لا يحفظ رسائل.
    مهم جدًا: نمرر كل بيانات المستخدم هنا.
  */
  const liveUser = addUserToRoom({
    roomId,
    userId,
    username: userDisplay.username,
    photoUrl: userDisplay.photoUrl,
    socketId,
    dc: input.dc === true,

    role,

    accountColor: userDisplay.accountColor,
    badgeKey: userDisplay.badgeKey,
    badgeName: userDisplay.badgeName,
    badgeValue: userDisplay.badgeValue,
    verificationType: userDisplay.verificationType,
  } as any);

  /*
    اختياري:
    نخلي activeUsers في MongoDB للعرض أو debugging فقط.
  */
  if (!room.activeUsers.includes(userId)) {
    room.activeUsers.push(userId);
    await room.save();
  }

  /*
    حفظ آخر دخول فقط في RoomUserState.
    لا علاقة له بالرسائل.
  */
  await updateRoomLastJoinedAtService({
    userId,
    roomId,
  });

  const activeCountAfter = getRoomActiveCount(roomId);

  console.log("[joinRoomService] success:", {
    roomId,
    userId,
    username: userDisplay.username,
    role,
    activeCountBefore,
    activeCountAfter,
    liveUser,
  });

  console.log("===== joinRoomService END =====\n");

  return {
    ok: true as const,
    room,
    role,
    liveUser,
    dc: input.dc === true,

    /*
      عند دخول المستخدم، الفرونت يعرض pinned فقط.
      لا نرجع رسائل قديمة.
    */
    pinnedMessage: room.pinnedMessage,

    activeCount: activeCountAfter,
  };
}

export async function leaveRoomService(input: {
  userId: string;
  roomId: string;
  socketId?: string;
}) {
  const userId = sanitizeUserId(input.userId);
  const roomId = sanitizeRoomId(input.roomId);
  const socketId = clean(input.socketId);

  console.log("\n===== leaveRoomService START =====");
  console.log("[leaveRoomService] input:", {
    userId,
    roomId,
    socketId,
  });

  if (!userId || !roomId) {
    console.log("[leaveRoomService] failed: invalid_leave_payload");
    console.log("===== leaveRoomService END =====\n");

    return {
      ok: false as const,
      reason: "invalid_leave_payload",
    };
  }

  const room = await RoomModel.findOne({ roomId });

  if (!room) {
    console.log("[leaveRoomService] failed: room_not_found", { roomId });
    console.log("===== leaveRoomService END =====\n");

    return {
      ok: false as const,
      reason: "room_not_found",
    };
  }

  /*
    خروج لايف فقط.
    لا نحذف role.
    لا نحذف owner/admin/member.
  */
  removeUserFromRoom({
    roomId,
    userId,
    socketId,
  });

  /*
    تحديث activeUsers في MongoDB.
    لا تلمس الأدوار.
  */
  room.activeUsers = room.activeUsers.filter((id) => id !== userId);
  await room.save();

  const activeCount = getRoomActiveCount(roomId);

  console.log("[leaveRoomService] success:", {
    userId,
    roomId,
    activeCount,
  });

  console.log("===== leaveRoomService END =====\n");

  return {
    ok: true as const,
    room,
    activeCount,
  };
}

export async function canJoinRoomService(input: {
  userId: string;
  roomId: string;
  password?: string;
  ip?: string;
}) {
  const userId = sanitizeUserId(input.userId);
  const roomId = sanitizeRoomId(input.roomId);
  const password = sanitizeRoomPassword(input.password);
  const ip = normalizeIp(input.ip);

  if (!userId || !roomId) {
    return {
      ok: false as const,
      reason: "invalid_join_payload",
    };
  }

  const room = await RoomModel.findOne({ roomId }).lean();

  if (!room) {
    return {
      ok: false as const,
      reason: "room_not_found",
    };
  }

  if (room.bannedUsers.includes(userId)) {
    return {
      ok: false as const,
      reason: "user_banned_from_room",
    };
  }

  if (
    isIpBanned({
      ip,
      bannedIps: room.bannedIps,
    })
  ) {
    return {
      ok: false as const,
      reason: "ip_banned_from_room",
    };
  }

  const role = getRoomRole(room, userId);

if (room.isLockedForNone && role === "none") {
  return {
    ok: false as const,
    reason: "room_locked_for_none",
  };
}
  if (room.hasPassword && role !== "creator") {
    const ok = await bcrypt.compare(password, room.passwordHash || "");

    if (!ok) {
      return {
        ok: false as const,
        reason: "wrong_room_password",
      };
    }
  }

  return {
    ok: true as const,
    room,
    role,
  };
}