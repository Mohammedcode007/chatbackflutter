import { RoomModel } from "../models/Room.model";

import type {
  RoomPermissionAction,
  RoomRole,
  RoomRoleWithoutCreator,
} from "../types/room.types";

import { makeRoomRoleLogId } from "../utils/room.ids";

import {
  sanitizeRoomId,
  sanitizeUserId,
  cleanText,
} from "../utils/room.sanitize";

/*
  تحديد رتبة المستخدم داخل الغرفة.
  مهم:
  نقرأ الدور من RoomModel المحفوظ، وليس من الذاكرة.
*/
export function getRoomRole(room: any, userIdValue: string): RoomRole {
  const userId = sanitizeUserId(userIdValue);

  if (!room || !userId) return "none";

  if (String(room.creatorId || "") === userId) {
    return "creator";
  }

  if (Array.isArray(room.owners) && room.owners.includes(userId)) {
    return "owner";
  }

  if (Array.isArray(room.admins) && room.admins.includes(userId)) {
    return "admin";
  }

  if (Array.isArray(room.members) && room.members.includes(userId)) {
    return "member";
  }

  return "none";
}

/*
  ترتيب الرتب.
*/
export function roleRank(role: RoomRole) {
  switch (role) {
    case "creator":
      return 4;

    case "owner":
      return 3;

    case "admin":
      return 2;

    case "member":
      return 1;

    case "none":
    default:
      return 0;
  }
}

/*
  هل الدور يسمح بالفعل؟
*/
export function canRoomAction(role: RoomRole, action: RoomPermissionAction) {
  /*
    creator يستطيع فعل كل شيء.
  */
  if (role === "creator") return true;

  /*
    owner:
    كل شيء تقريبًا ما عدا إنشاء creator.
  */
  if (role === "owner") {
    return [
      "set_owner",
      "set_admin",
      "set_member",
      "remove_role",

      "ban_user",
      "ban_ip",
      "unban_user",
      "unban_ip",

      "set_password",
      "remove_password",

      "lock_room",
      "unlock_room",

      "set_pinned_message",

      "send_message",
      "send_gift",
      "join_room",

      "boost_room",
      "favorite_room",
    ].includes(action);
  }

  /*
    admin:
    يحظر member/none
    ويعطي member فقط
    ولا يتحكم في owner/admin/creator.
  */
  if (role === "admin") {
    return [
      "set_member",
      "remove_role",

      "ban_user",

      "send_message",
      "send_gift",
      "join_room",

      "boost_room",
      "favorite_room",
    ].includes(action);
  }

  /*
    member:
    يرسل ويدخل ويعمل هدايا/boost/favorite.
  */
  if (role === "member") {
    return [
      "send_message",
      "send_gift",
      "join_room",

      "boost_room",
      "favorite_room",
    ].includes(action);
  }

  /*
    none:
    ليس له دور محفوظ.
    يستطيع يدخل ويرسل فقط لو الغرفة غير مقفولة.
    هذا الشرط نفسه يتم فحصه في join/message service.
  */
  if (role === "none") {
    return [
      "send_message",
      "join_room",

      "boost_room",
      "favorite_room",
    ].includes(action);
  }

  return false;
}

/*
  هل مسموح للمستخدم أن يغير رتبة الهدف؟
*/
export function canChangeTargetRole(input: {
  actorRole: RoomRole;
  targetRole: RoomRole;
  newRole: RoomRoleWithoutCreator;
}) {
  const { actorRole, targetRole, newRole } = input;

  /*
    لا أحد يغير creator.
  */
  if (targetRole === "creator") return false;

  /*
    creator يغير أي شخص لأي رتبة غير creator.
  */
  if (actorRole === "creator") return true;

  if (actorRole === "owner") {
    if (targetRole === "owner") return false;

    return ["owner", "admin", "member", "none"].includes(newRole);
  }

  if (actorRole === "admin") {
    if (
      targetRole === "owner" ||
      targetRole === "admin"
    ) {
      return false;
    }

    return ["member", "none"].includes(newRole);
  }

  return false;
}
/*
  تغيير رتبة مستخدم وحفظها في RoomModel.
  هذا يحفظ الدور، لكنه لا يحفظ رسالة الشات.
  رسالة النظام ترسل live من الـ handler.
*/
export async function setRoomRoleService(input: {
  actorId: string;
  actorUsername?: string;

  targetUserId: string;
  targetUsername?: string;

  roomId: string;

  newRole: RoomRoleWithoutCreator;
}) {
  const actorId = sanitizeUserId(input.actorId);
  const targetUserId = sanitizeUserId(input.targetUserId);
  const roomId = sanitizeRoomId(input.roomId);

  const actorUsername = cleanText(input.actorUsername);
  const targetUsername = cleanText(input.targetUsername);

  const newRole = input.newRole;

  if (!actorId || !targetUserId || !roomId || !newRole) {
    return {
      ok: false as const,
      reason: "invalid_role_payload",
    };
  }

  if (actorId === targetUserId) {
    return {
      ok: false as const,
      reason: "cannot_change_your_own_role",
    };
  }

  if (!["owner", "admin", "member", "none"].includes(newRole)) {
    return {
      ok: false as const,
      reason: "invalid_new_role",
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

  if (
    !canChangeTargetRole({
      actorRole,
      targetRole,
      newRole,
    })
  ) {
    return {
      ok: false as const,
      reason: "no_permission",
      actorRole,
      targetRole,
    };
  }

  /*
    لا تغيّر creator نهائيًا.
  */
  if (room.creatorId === targetUserId) {
    return {
      ok: false as const,
      reason: "cannot_change_creator",
    };
  }

  /*
    شيل المستخدم من كل القوائم.
  */
  room.owners = room.owners.filter((id) => id !== targetUserId);
  room.admins = room.admins.filter((id) => id !== targetUserId);
  room.members = room.members.filter((id) => id !== targetUserId);

  /*
    أضفه للقائمة الجديدة.
  */
  if (newRole === "owner") {
    room.owners.push(targetUserId);
  }

  if (newRole === "admin") {
    room.admins.push(targetUserId);
  }

  if (newRole === "member") {
    room.members.push(targetUserId);
  }

  /*
    none = لا تضيفه لأي قائمة.
  */

  room.roleLogs.push({
    logId: makeRoomRoleLogId(),
    action: newRole === "none" ? "role_removed" : "role_set",

    actorId,
    actorUsername,

    targetUserId,
    targetUsername,

    oldRole: targetRole,
    newRole,

    createdAt: new Date(),
  });

  await room.save();

  return {
    ok: true as const,
    room,
    actorRole,
    targetRole,
    oldRole: targetRole,
    newRole,
  };
}

/*
  حذف كل أدوار المستخدم وجعله none.
*/
export async function removeRoomRoleService(input: {
  actorId: string;
  actorUsername?: string;

  targetUserId: string;
  targetUsername?: string;

  roomId: string;
}) {
  return setRoomRoleService({
    actorId: input.actorId,
    actorUsername: input.actorUsername,

    targetUserId: input.targetUserId,
    targetUsername: input.targetUsername,

    roomId: input.roomId,

    newRole: "none",
  });
}

/*
  جلب role logs.
  هذا لا يرجع رسائل الغرفة، فقط سجل إداري لتغييرات الأدوار.
*/
export async function getRoomRoleLogsService(input: {
  actorId: string;
  roomId: string;
  limit?: number;
}) {
  const actorId = sanitizeUserId(input.actorId);
  const roomId = sanitizeRoomId(input.roomId);

  const limit = Math.min(Math.max(Number(input.limit || 50), 1), 100);

  if (!actorId || !roomId) {
    return {
      ok: false as const,
      reason: "invalid_role_logs_payload",
    };
  }

  const room = await RoomModel.findOne({ roomId }).lean();

  if (!room) {
    return {
      ok: false as const,
      reason: "room_not_found",
    };
  }

  const actorRole = getRoomRole(room, actorId);

  /*
    logs يشوفها creator/owner فقط.
  */
  if (actorRole !== "creator" && actorRole !== "owner") {
    return {
      ok: false as const,
      reason: "no_permission",
    };
  }

  const logs = Array.isArray((room as any).roleLogs)
    ? [...(room as any).roleLogs]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, limit)
    : [];

  return {
    ok: true as const,
    roomId,
    logs,
  };
}

/*
  إرجاع قائمة المستخدمين حسب الأدوار.
*/
export async function getRoomRolesSnapshotService(input: {
  roomId: string;
}) {
  const roomId = sanitizeRoomId(input.roomId);

  if (!roomId) {
    return {
      ok: false as const,
      reason: "invalid_room_id",
    };
  }

  const room = await RoomModel.findOne({ roomId })
    .select("roomId creatorId owners admins members")
    .lean();

  if (!room) {
    return {
      ok: false as const,
      reason: "room_not_found",
    };
  }

  return {
    ok: true as const,
    roomId,

    creatorId: String(room.creatorId || ""),
    owners: Array.isArray(room.owners) ? room.owners : [],
    admins: Array.isArray(room.admins) ? room.admins : [],
    members: Array.isArray(room.members) ? room.members : [],
  };
}