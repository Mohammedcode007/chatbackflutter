"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRoomUsersByRoleService = listRoomUsersByRoleService;
exports.listRoomLogsService = listRoomLogsService;
exports.listRoomBannedService = listRoomBannedService;
const Room_model_1 = require("../models/Room.model");
const User_model_1 = require("../../../models/User.model");
const room_role_service_1 = require("./room-role.service");
const room_sanitize_1 = require("../utils/room.sanitize");
function clean(value) {
    return String(value || "").trim();
}
function normalizeRole(value) {
    const role = clean(value).toLowerCase();
    if (role === "creator" ||
        role === "owner" ||
        role === "admin" ||
        role === "member" ||
        role === "none") {
        return role;
    }
    return "none";
}
function canManageRoom(role) {
    return role === "creator" || role === "owner" || role === "admin";
}
async function hydrateUsers(userIds) {
    const ids = Array.from(new Set(userIds
        .map((id) => (0, room_sanitize_1.sanitizeUserId)(id))
        .filter(Boolean)));
    if (ids.length === 0)
        return [];
    const users = await User_model_1.UserModel.find({ userId: { $in: ids } })
        .select("userId username photoUrl accountColor badgeKey badgeName badgeValue verificationType")
        .lean();
    const map = new Map(users.map((user) => [clean(user.userId), user]));
    return ids.map((userId) => {
        const user = map.get(userId);
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
async function listRoomUsersByRoleService(input) {
    const actorId = (0, room_sanitize_1.sanitizeUserId)(input.actorId);
    const roomId = (0, room_sanitize_1.sanitizeRoomId)(input.roomId);
    const role = normalizeRole(input.role);
    if (!actorId || !roomId) {
        return {
            ok: false,
            reason: "invalid_payload",
        };
    }
    const room = await Room_model_1.RoomModel.findOne({ roomId }).lean();
    if (!room) {
        return {
            ok: false,
            reason: "room_not_found",
        };
    }
    const actorRole = (0, room_role_service_1.getRoomRole)(room, actorId);
    if (!canManageRoom(actorRole)) {
        return {
            ok: false,
            reason: "permission_denied",
        };
    }
    let userIds = [];
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
        ok: true,
        roomId,
        role,
        users,
        count: users.length,
    };
}
async function listRoomLogsService(input) {
    const actorId = (0, room_sanitize_1.sanitizeUserId)(input.actorId);
    const roomId = (0, room_sanitize_1.sanitizeRoomId)(input.roomId);
    const limit = Math.min(Math.max(Number(input.limit || 50), 1), 100);
    if (!actorId || !roomId) {
        return {
            ok: false,
            reason: "invalid_payload",
        };
    }
    const room = await Room_model_1.RoomModel.findOne({ roomId }).lean();
    if (!room) {
        return {
            ok: false,
            reason: "room_not_found",
        };
    }
    const actorRole = (0, room_role_service_1.getRoomRole)(room, actorId);
    if (!canManageRoom(actorRole)) {
        return {
            ok: false,
            reason: "permission_denied",
        };
    }
    const logs = Array.isArray(room.roleLogs) ? room.roleLogs : [];
    const sortedLogs = [...logs]
        .sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
        .slice(0, limit);
    return {
        ok: true,
        roomId,
        logs: sortedLogs,
    };
}
async function listRoomBannedService(input) {
    const actorId = (0, room_sanitize_1.sanitizeUserId)(input.actorId);
    const roomId = (0, room_sanitize_1.sanitizeRoomId)(input.roomId);
    if (!actorId || !roomId) {
        return {
            ok: false,
            reason: "invalid_payload",
        };
    }
    const room = await Room_model_1.RoomModel.findOne({ roomId }).lean();
    if (!room) {
        return {
            ok: false,
            reason: "room_not_found",
        };
    }
    const actorRole = (0, room_role_service_1.getRoomRole)(room, actorId);
    if (!canManageRoom(actorRole)) {
        return {
            ok: false,
            reason: "permission_denied",
        };
    }
    const bannedUsersIds = Array.isArray(room.bannedUsers) ? room.bannedUsers : [];
    const bannedUsers = await hydrateUsers(bannedUsersIds);
    return {
        ok: true,
        roomId,
        bannedUsers,
        bannedIps: Array.isArray(room.bannedIps) ? room.bannedIps : [],
    };
}
//# sourceMappingURL=room-admin-query.service.js.map