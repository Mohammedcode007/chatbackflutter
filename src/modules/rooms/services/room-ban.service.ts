import { RoomModel } from "../models/Room.model";
import {
  getRoomRole,
  canRoomAction,
  canModerateTarget,
} from "./room-role.service";

import {
  addBannedIp,
  normalizeIp,
  removeBannedIp,
} from "../utils/room.ip";

import {
  sanitizeRoomId,
  sanitizeUserId,
} from "../utils/room.sanitize";

/*
  طرد مستخدم من الغرفة.
  مهم:
  هذه الدالة تعدل MongoDB فقط.
  إخراج المستخدم من Socket.IO room يتم في الـ handler باستخدام:
  removeUserFromSpecificRoom + socket.leave(roomId)
*/
export async function kickUserFromRoomService(input: {
  actorId: string;
  actorUsername?: string;

  targetUserId: string;
  targetUsername?: string;

  roomId: string;
}) {
  const actorId = sanitizeUserId(input.actorId);
  const targetUserId = sanitizeUserId(input.targetUserId);
  const roomId = sanitizeRoomId(input.roomId);

  if (!actorId || !targetUserId || !roomId) {
    return {
      ok: false as const,
      reason: "invalid_kick_payload",
    };
  }

  if (actorId === targetUserId) {
    return {
      ok: false as const,
      reason: "cannot_kick_yourself",
    };
  }

  const room = await RoomModel.findOne({ roomId });

  if (!room) {
    return {
      ok: false as const,
      reason: "room_not_found",
    };
  }

  const actorRole = getRoomRole(room, actorId);
  const targetRole = getRoomRole(room, targetUserId);

  if (!canRoomAction(actorRole, "kick_user")) {
    return {
      ok: false as const,
      reason: "no_permission",
      actorRole,
      targetRole,
    };
  }

  if (
    !canModerateTarget({
      actorRole,
      targetRole,
      action: "kick_user",
    })
  ) {
    return {
      ok: false as const,
      reason: "cannot_kick_this_user",
      actorRole,
      targetRole,
    };
  }

  /*
    الطرد لا يزيل الرتبة ولا يضيف المستخدم للحظر.
    فقط يخرجه من الموجودين الآن.
  */
  room.activeUsers = Array.isArray(room.activeUsers)
    ? room.activeUsers.filter((id) => String(id) !== targetUserId)
    : [];

  await room.save();

  return {
    ok: true as const,
    room,
    actorRole,
    targetRole,
    roomId,
    targetUserId,
    targetUsername: input.targetUsername || "",
  };
}

/*
  حظر مستخدم من الغرفة.
  مهم:
  هذه الدالة تضيف المستخدم إلى bannedUsers وتزيله من activeUsers.
  إخراجه من Socket.IO يتم في الـ handler.
*/
export async function banUserFromRoomService(input: {
  actorId: string;
  actorUsername?: string;

  targetUserId: string;
  targetUsername?: string;

  roomId: string;

  /*
    IP الخاص بالهدف.
    لو banIp = true سيتم حفظه في bannedIps.
  */
  targetIp?: string;
  banIp?: boolean;
}) {
  const actorId = sanitizeUserId(input.actorId);
  const targetUserId = sanitizeUserId(input.targetUserId);
  const roomId = sanitizeRoomId(input.roomId);

  if (!actorId || !targetUserId || !roomId) {
    return {
      ok: false as const,
      reason: "invalid_ban_payload",
    };
  }

  if (actorId === targetUserId) {
    return {
      ok: false as const,
      reason: "cannot_ban_yourself",
    };
  }

  const room = await RoomModel.findOne({ roomId });

  if (!room) {
    return {
      ok: false as const,
      reason: "room_not_found",
    };
  }

  const actorRole = getRoomRole(room, actorId);
  const targetRole = getRoomRole(room, targetUserId);

  if (!canRoomAction(actorRole, "ban_user")) {
    return {
      ok: false as const,
      reason: "no_permission",
      actorRole,
      targetRole,
    };
  }

  if (
    !canModerateTarget({
      actorRole,
      targetRole,
      action: "ban_user",
    })
  ) {
    return {
      ok: false as const,
      reason: "cannot_ban_this_user",
      actorRole,
      targetRole,
    };
  }

  /*
    أضف user ban.
  */
  if (!Array.isArray(room.bannedUsers)) {
    room.bannedUsers = [];
  }

  if (!room.bannedUsers.includes(targetUserId)) {
    room.bannedUsers.push(targetUserId);
  }

  /*
    عند الحظر نخرجه من الموجودين الآن.
    لا نحذف رتبته هنا.
    لو تريد الحظر يسحب الرتبة، قل لي وسأعدله لك.
  */
  room.activeUsers = Array.isArray(room.activeUsers)
    ? room.activeUsers.filter((id) => String(id) !== targetUserId)
    : [];

  let bannedIp = "";

  if (input.banIp === true) {
    bannedIp = normalizeIp(input.targetIp);

    if (bannedIp) {
      room.bannedIps = addBannedIp({
        ip: bannedIp,
        bannedIps: Array.isArray(room.bannedIps) ? room.bannedIps : [],
      });
    }
  }

  await room.save();

  return {
    ok: true as const,
    room,
    actorRole,
    targetRole,
    roomId,
    targetUserId,
    targetUsername: input.targetUsername || "",
    bannedIp,
    banIp: input.banIp === true && Boolean(bannedIp),
  };
}

/*
  فك حظر مستخدم.
*/
export async function unbanUserFromRoomService(input: {
  actorId: string;
  targetUserId: string;
  roomId: string;
}) {
  const actorId = sanitizeUserId(input.actorId);
  const targetUserId = sanitizeUserId(input.targetUserId);
  const roomId = sanitizeRoomId(input.roomId);

  if (!actorId || !targetUserId || !roomId) {
    return {
      ok: false as const,
      reason: "invalid_unban_payload",
    };
  }

  const room = await RoomModel.findOne({ roomId });

  if (!room) {
    return {
      ok: false as const,
      reason: "room_not_found",
    };
  }

  const actorRole = getRoomRole(room, actorId);

  /*
    فك الحظر يكون creator/owner فقط حسب canRoomAction.
  */
  if (!canRoomAction(actorRole, "unban_user")) {
    return {
      ok: false as const,
      reason: "no_permission",
    };
  }

  room.bannedUsers = Array.isArray(room.bannedUsers)
    ? room.bannedUsers.filter((id) => String(id) !== targetUserId)
    : [];

  await room.save();

  return {
    ok: true as const,
    room,
    roomId,
    targetUserId,
  };
}

/*
  حظر IP من الغرفة.
*/
export async function banIpFromRoomService(input: {
  actorId: string;
  roomId: string;
  ip: string;
}) {
  const actorId = sanitizeUserId(input.actorId);
  const roomId = sanitizeRoomId(input.roomId);
  const ip = normalizeIp(input.ip);

  if (!actorId || !roomId || !ip) {
    return {
      ok: false as const,
      reason: "invalid_ip_ban_payload",
    };
  }

  const room = await RoomModel.findOne({ roomId });

  if (!room) {
    return {
      ok: false as const,
      reason: "room_not_found",
    };
  }

  const actorRole = getRoomRole(room, actorId);

  if (!canRoomAction(actorRole, "ban_ip")) {
    return {
      ok: false as const,
      reason: "no_permission",
    };
  }

  room.bannedIps = addBannedIp({
    ip,
    bannedIps: Array.isArray(room.bannedIps) ? room.bannedIps : [],
  });

  await room.save();

  return {
    ok: true as const,
    room,
    ip,
  };
}

/*
  فك حظر IP من الغرفة.
*/
export async function unbanIpFromRoomService(input: {
  actorId: string;
  roomId: string;
  ip: string;
}) {
  const actorId = sanitizeUserId(input.actorId);
  const roomId = sanitizeRoomId(input.roomId);
  const ip = normalizeIp(input.ip);

  if (!actorId || !roomId || !ip) {
    return {
      ok: false as const,
      reason: "invalid_ip_unban_payload",
    };
  }

  const room = await RoomModel.findOne({ roomId });

  if (!room) {
    return {
      ok: false as const,
      reason: "room_not_found",
    };
  }

  const actorRole = getRoomRole(room, actorId);

  if (!canRoomAction(actorRole, "unban_ip")) {
    return {
      ok: false as const,
      reason: "no_permission",
    };
  }

  room.bannedIps = removeBannedIp({
    ip,
    bannedIps: Array.isArray(room.bannedIps) ? room.bannedIps : [],
  });

  await room.save();

  return {
    ok: true as const,
    room,
    ip,
  };
}

/*
  فحص هل المستخدم محظور من الغرفة.
  تستخدم داخل joinRoomService قبل إدخال المستخدم.
*/
export async function isUserBannedFromRoomService(input: {
  roomId: string;
  userId: string;
  ip?: string;
}) {
  const roomId = sanitizeRoomId(input.roomId);
  const userId = sanitizeUserId(input.userId);
  const ip = normalizeIp(input.ip);

  const room = await RoomModel.findOne({ roomId }).lean();

  if (!room) {
    return {
      ok: false as const,
      reason: "room_not_found",
      banned: false,
    };
  }

  const userBanned =
    Boolean(userId) &&
    Array.isArray(room.bannedUsers) &&
    room.bannedUsers.map(String).includes(userId);

  const ipBanned =
    Boolean(ip) &&
    Array.isArray(room.bannedIps) &&
    room.bannedIps.map(normalizeIp).includes(ip);

  return {
    ok: true as const,
    banned: userBanned || ipBanned,
    userBanned,
    ipBanned,
    room,
  };
}