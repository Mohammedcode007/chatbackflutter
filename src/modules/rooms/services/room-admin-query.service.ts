import { RoomModel } from "../models/Room.model";
import { UserModel } from "../../../models/User.model";
import { getRoomRole } from "./room-role.service";
import { sanitizeRoomId, sanitizeUserId } from "../utils/room.sanitize";

type QueryRole = "creator" | "owner" | "admin" | "member" | "none";

function clean(value: any) {
  return String(value || "").trim();
}

function normalizeRole(value: any): QueryRole {
  const role = clean(value).toLowerCase();

  if (
    role === "creator" ||
    role === "owner" ||
    role === "admin" ||
    role === "member" ||
    role === "none"
  ) {
    return role;
  }

  return "none";
}

function canManageRoom(role: string) {
  return role === "creator" || role === "owner" || role === "admin";
}

async function hydrateUsers(userIds: string[]) {
  const ids = Array.from(
    new Set(
      userIds
        .map((id) => sanitizeUserId(id))
        .filter(Boolean)
    )
  );

  if (ids.length === 0) return [];

  const users = await UserModel.find({ userId: { $in: ids } })
    .select(
      "userId username photoUrl accountColor badgeKey badgeName badgeValue verificationType"
    )
    .lean();

  const map = new Map(users.map((user: any) => [clean(user.userId), user]));

  return ids.map((userId) => {
    const user: any = map.get(userId);

    return {
      userId,
      username: clean(user?.username || userId),
      photoUrl: clean(user?.photoUrl || ""),

      accountColor: clean(user?.accountColor || ""),
      badgeKey: clean(user?.badgeKey || ""),
      badgeName: clean(user?.badgeName || ""),
      badgeValue: clean(user?.badgeValue || ""),
      verificationType: clean(user?.verificationType || "none"),
    };
  });
}

export async function listRoomUsersByRoleService(input: {
  actorId: string;
  roomId: string;
  role: string;
}) {
  const actorId = sanitizeUserId(input.actorId);
  const roomId = sanitizeRoomId(input.roomId);
  const role = normalizeRole(input.role);

  if (!actorId || !roomId) {
    return {
      ok: false as const,
      reason: "invalid_payload",
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

  if (!canManageRoom(actorRole)) {
    return {
      ok: false as const,
      reason: "permission_denied",
    };
  }

  let userIds: string[] = [];

  if (role === "creator") {
    userIds = [clean(room.creatorId)];
  }

  if (role === "owner") {
    userIds = Array.isArray(room.owners) ? room.owners : [];
  }

  if (role === "admin") {
    userIds = Array.isArray(room.admins) ? room.admins : [];
  }

  if (role === "member") {
    userIds = Array.isArray(room.members) ? room.members : [];
  }

  /*
    none لا يوجد لها قائمة محفوظة في RoomModel.
    هي تعني أي شخص ليس creator/owner/admin/member.
    لذلك لا يمكن جلب كل none من الغرفة لأنها ليست محفوظة.
  */
  if (role === "none") {
    userIds = [];
  }

  const users = await hydrateUsers(userIds);

  return {
    ok: true as const,
    roomId,
    role,
    users,
    count: users.length,
  };
}

export async function listRoomLogsService(input: {
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
      reason: "invalid_payload",
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

  if (!canManageRoom(actorRole)) {
    return {
      ok: false as const,
      reason: "permission_denied",
    };
  }

  const logs = Array.isArray(room.roleLogs) ? room.roleLogs : [];

  const sortedLogs = [...logs]
    .sort((a: any, b: any) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, limit);

  return {
    ok: true as const,
    roomId,
    logs: sortedLogs,
  };
}

export async function listRoomBannedService(input: {
  actorId: string;
  roomId: string;
}) {
  const actorId = sanitizeUserId(input.actorId);
  const roomId = sanitizeRoomId(input.roomId);

  if (!actorId || !roomId) {
    return {
      ok: false as const,
      reason: "invalid_payload",
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

  if (!canManageRoom(actorRole)) {
    return {
      ok: false as const,
      reason: "permission_denied",
    };
  }

  const bannedUsersIds = Array.isArray(room.bannedUsers) ? room.bannedUsers : [];
  const bannedUsers = await hydrateUsers(bannedUsersIds);

  return {
    ok: true as const,
    roomId,
    bannedUsers,
    bannedIps: Array.isArray(room.bannedIps) ? room.bannedIps : [],
  };
}