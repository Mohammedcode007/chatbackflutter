"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kickUserFromRoomService = kickUserFromRoomService;
exports.banUserFromRoomService = banUserFromRoomService;
exports.unbanUserFromRoomService = unbanUserFromRoomService;
exports.banIpFromRoomService = banIpFromRoomService;
exports.unbanIpFromRoomService = unbanIpFromRoomService;
exports.isUserBannedFromRoomService = isUserBannedFromRoomService;
const Room_model_1 = require("../models/Room.model");
const room_role_service_1 = require("./room-role.service");
const room_ip_1 = require("../utils/room.ip");
const room_sanitize_1 = require("../utils/room.sanitize");
/*
  طرد مستخدم من الغرفة.
  مهم:
  هذه الدالة تعدل MongoDB فقط.
  إخراج المستخدم من Socket.IO room يتم في الـ handler باستخدام:
  removeUserFromSpecificRoom + socket.leave(roomId)
*/
async function kickUserFromRoomService(input) {
    const actorId = (0, room_sanitize_1.sanitizeUserId)(input.actorId);
    const targetUserId = (0, room_sanitize_1.sanitizeUserId)(input.targetUserId);
    const roomId = (0, room_sanitize_1.sanitizeRoomId)(input.roomId);
    if (!actorId || !targetUserId || !roomId) {
        return {
            ok: false,
            reason: "invalid_kick_payload",
        };
    }
    if (actorId === targetUserId) {
        return {
            ok: false,
            reason: "cannot_kick_yourself",
        };
    }
    const room = await Room_model_1.RoomModel.findOne({ roomId });
    if (!room) {
        return {
            ok: false,
            reason: "room_not_found",
        };
    }
    const actorRole = (0, room_role_service_1.getRoomRole)(room, actorId);
    const targetRole = (0, room_role_service_1.getRoomRole)(room, targetUserId);
    if (!(0, room_role_service_1.canRoomAction)(actorRole, "kick_user")) {
        return {
            ok: false,
            reason: "no_permission",
            actorRole,
            targetRole,
        };
    }
    if (!(0, room_role_service_1.canModerateTarget)({
        actorRole,
        targetRole,
        action: "kick_user",
    })) {
        return {
            ok: false,
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
        ok: true,
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
async function banUserFromRoomService(input) {
    const actorId = (0, room_sanitize_1.sanitizeUserId)(input.actorId);
    const targetUserId = (0, room_sanitize_1.sanitizeUserId)(input.targetUserId);
    const roomId = (0, room_sanitize_1.sanitizeRoomId)(input.roomId);
    if (!actorId || !targetUserId || !roomId) {
        return {
            ok: false,
            reason: "invalid_ban_payload",
        };
    }
    if (actorId === targetUserId) {
        return {
            ok: false,
            reason: "cannot_ban_yourself",
        };
    }
    const room = await Room_model_1.RoomModel.findOne({ roomId });
    if (!room) {
        return {
            ok: false,
            reason: "room_not_found",
        };
    }
    const actorRole = (0, room_role_service_1.getRoomRole)(room, actorId);
    const targetRole = (0, room_role_service_1.getRoomRole)(room, targetUserId);
    if (!(0, room_role_service_1.canRoomAction)(actorRole, "ban_user")) {
        return {
            ok: false,
            reason: "no_permission",
            actorRole,
            targetRole,
        };
    }
    if (!(0, room_role_service_1.canModerateTarget)({
        actorRole,
        targetRole,
        action: "ban_user",
    })) {
        return {
            ok: false,
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
        bannedIp = (0, room_ip_1.normalizeIp)(input.targetIp);
        if (bannedIp) {
            room.bannedIps = (0, room_ip_1.addBannedIp)({
                ip: bannedIp,
                bannedIps: Array.isArray(room.bannedIps) ? room.bannedIps : [],
            });
        }
    }
    await room.save();
    return {
        ok: true,
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
async function unbanUserFromRoomService(input) {
    const actorId = (0, room_sanitize_1.sanitizeUserId)(input.actorId);
    const targetUserId = (0, room_sanitize_1.sanitizeUserId)(input.targetUserId);
    const roomId = (0, room_sanitize_1.sanitizeRoomId)(input.roomId);
    if (!actorId || !targetUserId || !roomId) {
        return {
            ok: false,
            reason: "invalid_unban_payload",
        };
    }
    const room = await Room_model_1.RoomModel.findOne({ roomId });
    if (!room) {
        return {
            ok: false,
            reason: "room_not_found",
        };
    }
    const actorRole = (0, room_role_service_1.getRoomRole)(room, actorId);
    /*
      فك الحظر يكون creator/owner فقط حسب canRoomAction.
    */
    if (!(0, room_role_service_1.canRoomAction)(actorRole, "unban_user")) {
        return {
            ok: false,
            reason: "no_permission",
        };
    }
    room.bannedUsers = Array.isArray(room.bannedUsers)
        ? room.bannedUsers.filter((id) => String(id) !== targetUserId)
        : [];
    await room.save();
    return {
        ok: true,
        room,
        roomId,
        targetUserId,
    };
}
/*
  حظر IP من الغرفة.
*/
async function banIpFromRoomService(input) {
    const actorId = (0, room_sanitize_1.sanitizeUserId)(input.actorId);
    const roomId = (0, room_sanitize_1.sanitizeRoomId)(input.roomId);
    const ip = (0, room_ip_1.normalizeIp)(input.ip);
    if (!actorId || !roomId || !ip) {
        return {
            ok: false,
            reason: "invalid_ip_ban_payload",
        };
    }
    const room = await Room_model_1.RoomModel.findOne({ roomId });
    if (!room) {
        return {
            ok: false,
            reason: "room_not_found",
        };
    }
    const actorRole = (0, room_role_service_1.getRoomRole)(room, actorId);
    if (!(0, room_role_service_1.canRoomAction)(actorRole, "ban_ip")) {
        return {
            ok: false,
            reason: "no_permission",
        };
    }
    room.bannedIps = (0, room_ip_1.addBannedIp)({
        ip,
        bannedIps: Array.isArray(room.bannedIps) ? room.bannedIps : [],
    });
    await room.save();
    return {
        ok: true,
        room,
        ip,
    };
}
/*
  فك حظر IP من الغرفة.
*/
async function unbanIpFromRoomService(input) {
    const actorId = (0, room_sanitize_1.sanitizeUserId)(input.actorId);
    const roomId = (0, room_sanitize_1.sanitizeRoomId)(input.roomId);
    const ip = (0, room_ip_1.normalizeIp)(input.ip);
    if (!actorId || !roomId || !ip) {
        return {
            ok: false,
            reason: "invalid_ip_unban_payload",
        };
    }
    const room = await Room_model_1.RoomModel.findOne({ roomId });
    if (!room) {
        return {
            ok: false,
            reason: "room_not_found",
        };
    }
    const actorRole = (0, room_role_service_1.getRoomRole)(room, actorId);
    if (!(0, room_role_service_1.canRoomAction)(actorRole, "unban_ip")) {
        return {
            ok: false,
            reason: "no_permission",
        };
    }
    room.bannedIps = (0, room_ip_1.removeBannedIp)({
        ip,
        bannedIps: Array.isArray(room.bannedIps) ? room.bannedIps : [],
    });
    await room.save();
    return {
        ok: true,
        room,
        ip,
    };
}
/*
  فحص هل المستخدم محظور من الغرفة.
  تستخدم داخل joinRoomService قبل إدخال المستخدم.
*/
async function isUserBannedFromRoomService(input) {
    const roomId = (0, room_sanitize_1.sanitizeRoomId)(input.roomId);
    const userId = (0, room_sanitize_1.sanitizeUserId)(input.userId);
    const ip = (0, room_ip_1.normalizeIp)(input.ip);
    const room = await Room_model_1.RoomModel.findOne({ roomId }).lean();
    if (!room) {
        return {
            ok: false,
            reason: "room_not_found",
            banned: false,
        };
    }
    const userBanned = Boolean(userId) &&
        Array.isArray(room.bannedUsers) &&
        room.bannedUsers.map(String).includes(userId);
    const ipBanned = Boolean(ip) &&
        Array.isArray(room.bannedIps) &&
        room.bannedIps.map(room_ip_1.normalizeIp).includes(ip);
    return {
        ok: true,
        banned: userBanned || ipBanned,
        userBanned,
        ipBanned,
        room,
    };
}
//# sourceMappingURL=room-ban.service.js.map