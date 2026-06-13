import { RoomModel } from "../models/Room.model";
import { getRoomRole, canRoomAction, roleRank } from "./room-role.service";
import {
  addBannedIp,
  normalizeIp,
  removeBannedIp,
} from "../utils/room.ip";
import { sanitizeRoomId, sanitizeUserId } from "../utils/room.sanitize";

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
    return { ok: false as const, reason: "invalid_ban_payload" };
  }

  if (actorId === targetUserId) {
    return { ok: false as const, reason: "cannot_ban_yourself" };
  }

  const room = await RoomModel.findOne({ roomId });

  if (!room) {
    return { ok: false as const, reason: "room_not_found" };
  }

  const actorRole = getRoomRole(room, actorId);
  const targetRole = getRoomRole(room, targetUserId);

  if (!canRoomAction(actorRole, "ban_user")) {
    return { ok: false as const, reason: "no_permission" };
  }

  /*
    لا أحد يحظر creator.
  */
  if (targetRole === "creator") {
    return { ok: false as const, reason: "cannot_ban_creator" };
  }

  /*
    لا يمكن حظر شخص أعلى منك أو مساوي لك.
    creator مستثنى لأنه أعلى الكل.
  */
  if (actorRole !== "creator" && roleRank(actorRole) <= roleRank(targetRole)) {
    return { ok: false as const, reason: "cannot_ban_same_or_higher_role" };
  }

  /*
    admin يحظر member أو none فقط.
  */
  if (
    actorRole === "admin" &&
    targetRole !== "member" &&
    targetRole !== "none"
  ) {
    return { ok: false as const, reason: "admin_can_ban_member_or_none_only" };
  }

  /*
    أضف user ban.
  */
  if (!room.bannedUsers.includes(targetUserId)) {
    room.bannedUsers.push(targetUserId);
  }

  /*
    عند حظره، نزيله من الموجودين الآن.
    لا نزيله من owners/admins/members هنا إلا لو أنت تريد الحظر يسحب رتبته.
    الأفضل: الحظر لا يمسح الرتبة، فقط يمنعه من الدخول.
  */
  room.activeUsers = room.activeUsers.filter((id) => id !== targetUserId);

  let bannedIp = "";

  if (input.banIp === true) {
    bannedIp = normalizeIp(input.targetIp);

    if (bannedIp) {
      room.bannedIps = addBannedIp({
        ip: bannedIp,
        bannedIps: room.bannedIps,
      });
    }
  }

  await room.save();

  return {
    ok: true as const,
    room,
    actorRole,
    targetRole,
    bannedIp,
    banIp: input.banIp === true && Boolean(bannedIp),
  };
}

export async function unbanUserFromRoomService(input: {
  actorId: string;
  targetUserId: string;
  roomId: string;
}) {
  const actorId = sanitizeUserId(input.actorId);
  const targetUserId = sanitizeUserId(input.targetUserId);
  const roomId = sanitizeRoomId(input.roomId);

  if (!actorId || !targetUserId || !roomId) {
    return { ok: false as const, reason: "invalid_unban_payload" };
  }

  const room = await RoomModel.findOne({ roomId });

  if (!room) {
    return { ok: false as const, reason: "room_not_found" };
  }

  const actorRole = getRoomRole(room, actorId);

  /*
    فك الحظر يكون creator/owner فقط.
    لو تريد admin كمان يفك الحظر، أضف unban_user في canRoomAction للadmin.
  */
  if (!canRoomAction(actorRole, "unban_user")) {
    return { ok: false as const, reason: "no_permission" };
  }

  room.bannedUsers = room.bannedUsers.filter((id) => id !== targetUserId);

  await room.save();

  return {
    ok: true as const,
    room,
  };
}

export async function banIpFromRoomService(input: {
  actorId: string;
  roomId: string;
  ip: string;
}) {
  const actorId = sanitizeUserId(input.actorId);
  const roomId = sanitizeRoomId(input.roomId);
  const ip = normalizeIp(input.ip);

  if (!actorId || !roomId || !ip) {
    return { ok: false as const, reason: "invalid_ip_ban_payload" };
  }

  const room = await RoomModel.findOne({ roomId });

  if (!room) {
    return { ok: false as const, reason: "room_not_found" };
  }

  const actorRole = getRoomRole(room, actorId);

  if (!canRoomAction(actorRole, "ban_ip")) {
    return { ok: false as const, reason: "no_permission" };
  }

  room.bannedIps = addBannedIp({
    ip,
    bannedIps: room.bannedIps,
  });

  await room.save();

  return {
    ok: true as const,
    room,
    ip,
  };
}

export async function unbanIpFromRoomService(input: {
  actorId: string;
  roomId: string;
  ip: string;
}) {
  const actorId = sanitizeUserId(input.actorId);
  const roomId = sanitizeRoomId(input.roomId);
  const ip = normalizeIp(input.ip);

  if (!actorId || !roomId || !ip) {
    return { ok: false as const, reason: "invalid_ip_unban_payload" };
  }

  const room = await RoomModel.findOne({ roomId });

  if (!room) {
    return { ok: false as const, reason: "room_not_found" };
  }

  const actorRole = getRoomRole(room, actorId);

  if (!canRoomAction(actorRole, "unban_ip")) {
    return { ok: false as const, reason: "no_permission" };
  }

  room.bannedIps = removeBannedIp({
    ip,
    bannedIps: room.bannedIps,
  });

  await room.save();

  return {
    ok: true as const,
    room,
    ip,
  };
}

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
    Array.isArray(room.bannedUsers) && room.bannedUsers.includes(userId);

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