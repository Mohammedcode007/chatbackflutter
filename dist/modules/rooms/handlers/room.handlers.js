"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomHandlers = void 0;
const ws_auth_1 = require("../../../websocket/ws.auth");
const ws_utils_1 = require("../../../websocket/ws.utils");
const clients_store_1 = require("../../../websocket/stores/clients.store");
const roomClients_store_1 = require("../../../websocket/stores/roomClients.store");
const ws_events_1 = require("../../../websocket/ws.events");
const room_admin_query_service_1 = require("../services/room-admin-query.service");
const room_role_service_1 = require("../services/room-role.service");
const room_create_service_1 = require("../services/room-create.service");
const room_join_service_1 = require("../services/room-join.service");
const room_message_service_1 = require("../services/room-message.service");
const room_query_service_1 = require("../services/room-query.service");
const room_favorite_service_1 = require("../services/room-favorite.service");
const room_boost_service_1 = require("../services/room-boost.service");
const room_ip_1 = require("../utils/room.ip");
const room_ban_service_1 = require("../services/room-ban.service");
const Room_model_1 = require("../models/Room.model");
const User_model_1 = require("../../../models/User.model");
const ROOM_MESSAGE_EVENT = "room.message";
const ROOM_USERS_EVENT = "room.users";
const ROOM_ACTIVE_COUNT_EVENT = "room.active_count.update";
function text(value) {
    return String(value || "").trim();
}
function boolValue(value) {
    return value === true || value === "true" || value === 1 || value === "1";
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
async function resolveTargetUser(input) {
    const targetUserId = text(input.targetUserId);
    const targetUsername = text(input.targetUsername);
    /*
      لو الفرونت أرسل ID، نستخدمه عادي.
    */
    if (targetUserId) {
        const user = await User_model_1.UserModel.findOne({ userId: targetUserId })
            .select("userId username photoUrl")
            .lean();
        if (!user) {
            return {
                ok: false,
                reason: "target_user_not_found",
            };
        }
        return {
            ok: true,
            userId: text(user.userId),
            username: text(user.username),
            photoUrl: text(user.photoUrl),
        };
    }
    /*
      لو الفرونت أرسل الاسم فقط.
    */
    if (!targetUsername) {
        return {
            ok: false,
            reason: "target_username_required",
        };
    }
    const users = await User_model_1.UserModel.find({
        username: {
            $regex: `^${escapeRegExp(targetUsername)}$`,
            $options: "i",
        },
    })
        .select("userId username photoUrl")
        .limit(2)
        .lean();
    if (users.length === 0) {
        return {
            ok: false,
            reason: "target_user_not_found",
        };
    }
    if (users.length > 1) {
        return {
            ok: false,
            reason: "target_username_duplicated",
        };
    }
    const user = users[0];
    return {
        ok: true,
        userId: text(user.userId),
        username: text(user.username),
        photoUrl: text(user.photoUrl),
    };
}
function logStart(name, context) {
    console.log(`\n===== ${name}_START =====`);
    console.log(`[${name}] raw message:`, context.message);
    console.log(`[${name}] client:`, {
        userId: context.client?.userId,
        username: context.client?.username,
        photoUrl: context.client?.photoUrl,
        connectionId: context.client?.connectionId,
        isLoggedIn: !!context.client?.userId,
    });
}
function logEnd(name) {
    console.log(`===== ${name}_END =====\n`);
}
function getResultMessage(result) {
    return result?.message || result?.liveMessage || result?.roomMessage || null;
}
function getRoomLiveUser(roomId, userId) {
    const users = (0, roomClients_store_1.getRoomUsers)(roomId);
    return users.find((user) => text(user.userId) === text(userId)) || null;
}
function normalizeActiveUser(user) {
    return {
        userId: text(user.userId),
        username: text(user.username),
        photoUrl: text(user.photoUrl),
        socketId: text(user.socketId),
        joinedAt: user.joinedAt || "",
        dc: user.dc === true,
        role: text(user.role || "none"),
        accountColor: text(user.accountColor),
        badgeKey: text(user.badgeKey),
        badgeName: text(user.badgeName),
        badgeValue: text(user.badgeValue),
        verificationType: text(user.verificationType || "none"),
    };
}
function getActiveUsers(roomId) {
    return (0, roomClients_store_1.getRoomUsers)(roomId).map(normalizeActiveUser);
}
function broadcastToRoomUsers(roomId, payload) {
    const users = (0, roomClients_store_1.getRoomUsers)(roomId);
    console.log("[broadcastToRoomUsers] sending:", {
        roomId,
        usersCount: users.length,
        handler: payload.handler,
        type: payload.type,
    });
    for (const user of users) {
        const userId = text(user.userId);
        if (!userId)
            continue;
        console.log("[broadcastToRoomUsers] to user:", {
            userId,
            username: user.username,
            socketId: user.socketId,
            handler: payload.handler,
        });
        (0, clients_store_1.sendToUserIfOnline)(userId, payload);
    }
}
function forceUserLeaveLiveRoom(input) {
    const roomId = text(input.roomId);
    const targetUserId = text(input.targetUserId);
    if (!roomId || !targetUserId) {
        return {
            socketIds: [],
        };
    }
    const liveLeave = (0, roomClients_store_1.removeUserFromSpecificRoom)({
        roomId,
        userId: targetUserId,
    });
    for (const socketId of liveLeave.socketIds) {
        const targetSocket = input.context.socket.nsp?.sockets?.get(socketId);
        if (targetSocket) {
            targetSocket.leave(roomId);
            targetSocket.emit(input.eventName, {
                roomId,
                message: input.message,
            });
        }
    }
    /*
      احتياطيًا، لأن عندك نظام إرسال حسب userId أيضًا.
    */
    (0, clients_store_1.sendToUserIfOnline)(targetUserId, {
        handler: input.eventName,
        type: input.eventName,
        roomId,
        message: input.message,
    });
    return {
        socketIds: liveLeave.socketIds,
    };
}
function enrichLiveMessage(roomId, message) {
    if (!message)
        return message;
    const fromUserId = text(message.fromUserId || message.userId);
    if (!fromUserId)
        return message;
    const liveUser = getRoomLiveUser(roomId, fromUserId);
    if (!liveUser)
        return message;
    const normalized = normalizeActiveUser(liveUser);
    return {
        ...message,
        fromUserId: text(message.fromUserId || normalized.userId),
        fromUsername: text(message.fromUsername || normalized.username),
        fromPhotoUrl: text(message.fromPhotoUrl || normalized.photoUrl),
        fromRole: text(message.fromRole || normalized.role || "none"),
        accountColor: normalized.accountColor,
        badgeKey: normalized.badgeKey,
        badgeName: normalized.badgeName,
        badgeValue: normalized.badgeValue,
        verificationType: normalized.verificationType,
    };
}
function makeRoomEventMessage(input) {
    const now = Date.now();
    const username = input.username || "User";
    const textValue = input.type === "join" ? `${username} دخل` : `${username} خرج`;
    return {
        messageId: `${input.type}_${input.userId}_${now}`,
        roomId: input.roomId,
        messageKind: input.type,
        type: "none",
        fromUserId: input.userId,
        fromUsername: username,
        fromPhotoUrl: input.photoUrl,
        fromRole: input.role || "none",
        text: textValue,
        media: null,
        mention: null,
        gift: null,
        entryVideo: null,
        replyTo: null,
        reactions: [],
        accountColor: input.accountColor || "",
        badgeKey: input.badgeKey || "",
        badgeName: input.badgeName || "",
        badgeValue: input.badgeValue || "",
        verificationType: input.verificationType || "none",
        system: {
            action: input.type,
            actorId: input.userId,
            actorUsername: username,
            targetUserId: input.userId,
            targetUsername: username,
            dc: false,
        },
        createdAt: new Date().toISOString(),
    };
}
function roleLabel(role) {
    switch (role) {
        case "owner":
            return "owner";
        case "admin":
            return "admin";
        case "member":
            return "member";
        case "none":
            return "no role";
        default:
            return role || "no role";
    }
}
// function roleLabel(role: string) {
//   switch (role) {
//     case "owner":
//       return "اونر";
//     case "admin":
//       return "ادمن";
//     case "member":
//       return "عضو";
//     case "none":
//       return "بدون رتبة";
//     default:
//       return role || "بدون رتبة";
//   }
// }
function makeRoomRoleMessage(input) {
    const now = Date.now();
    const actorUsername = text(input.actorUsername) || "User";
    const targetUsername = text(input.targetUsername) || "User";
    const isRemove = input.newRole === "none";
    const textValue = isRemove
        ? `${actorUsername} removed ${targetUsername}'s role`
        : `${actorUsername} set ${targetUsername} as ${roleLabel(input.newRole)}`;
    return {
        messageId: `role_${input.actorId}_${input.targetUserId}_${now}`,
        roomId: input.roomId,
        /*
          This is like join / leave.
          Frontend should display messageKind = role in the center.
        */
        messageKind: "role",
        type: "none",
        fromUserId: input.actorId,
        fromUsername: actorUsername,
        fromPhotoUrl: "",
        fromRole: "none",
        text: textValue,
        media: null,
        mention: null,
        gift: null,
        entryVideo: null,
        replyTo: null,
        reactions: [],
        accountColor: "",
        badgeKey: "",
        badgeName: "",
        badgeValue: "",
        verificationType: "none",
        system: {
            action: isRemove ? "role_removed" : "role_set",
            actorId: input.actorId,
            actorUsername,
            targetUserId: input.targetUserId,
            targetUsername,
            oldRole: input.oldRole,
            newRole: input.newRole,
        },
        createdAt: new Date().toISOString(),
    };
}
// function makeRoomRoleMessage(input: {
//   roomId: string;
//   actorId: string;
//   actorUsername: string;
//   targetUserId: string;
//   targetUsername: string;
//   oldRole: string;
//   newRole: string;
// }) {
//   const now = Date.now();
//   const actorUsername = text(input.actorUsername) || "User";
//   const targetUsername = text(input.targetUsername) || "User";
//   const isRemove = input.newRole === "none";
//   const textValue = isRemove
//     ? `${actorUsername} أزال رتبة ${targetUsername}`
//     : `${actorUsername} وضع ${targetUsername} ${roleLabel(input.newRole)}`;
//   return {
//     messageId: `role_${input.actorId}_${input.targetUserId}_${now}`,
//     roomId: input.roomId,
//     /*
//       هذه مثل join / leave.
//       الفرونت يجب أن يعرض messageKind = role في المنتصف.
//     */
//     messageKind: "role",
//     type: "none",
//     fromUserId: input.actorId,
//     fromUsername: actorUsername,
//     fromPhotoUrl: "",
//     fromRole: "none",
//     text: textValue,
//     media: null,
//     mention: null,
//     gift: null,
//     entryVideo: null,
//     replyTo: null,
//     reactions: [],
//     accountColor: "",
//     badgeKey: "",
//     badgeName: "",
//     badgeValue: "",
//     verificationType: "none",
//     system: {
//       action: isRemove ? "role_removed" : "role_set",
//       actorId: input.actorId,
//       actorUsername,
//       targetUserId: input.targetUserId,
//       targetUsername,
//       oldRole: input.oldRole,
//       newRole: input.newRole,
//     },
//     createdAt: new Date().toISOString(),
//   };
// }
const handleRoomKick = async (context) => {
    const logName = "ROOM_KICK_HANDLER";
    try {
        logStart(logName, context);
        if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT)) {
            console.log(`[${logName}] requireLogin failed`);
            logEnd(logName);
            return;
        }
        const actorId = context.client.userId;
        const actorUsername = text(context.client?.username);
        const roomId = text(context.message.roomId || context.message.room_id);
        const targetUserId = text(context.message.targetUserId || context.message.target_user_id);
        const targetUsername = text(context.message.targetUsername || context.message.target_username);
        if (!roomId) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, "room_id_required", context.message.request_id);
            logEnd(logName);
            return;
        }
        if (!targetUserId) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, "target_user_id_required", context.message.request_id);
            logEnd(logName);
            return;
        }
        const targetLiveUser = getRoomLiveUser(roomId, targetUserId);
        const finalTargetUsername = targetUsername || text(targetLiveUser?.username) || targetUserId;
        const result = await (0, room_ban_service_1.kickUserFromRoomService)({
            actorId,
            actorUsername,
            targetUserId,
            targetUsername: finalTargetUsername,
            roomId,
        });
        console.log(`[${logName}] service result:`, result);
        if (!result.ok) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, result.reason, context.message.request_id);
            logEnd(logName);
            return;
        }
        forceUserLeaveLiveRoom({
            context,
            roomId,
            targetUserId,
            eventName: "room:kicked",
            message: "تم طردك من الغرفة",
        });
        const activeUsers = getActiveUsers(roomId);
        const activeCount = activeUsers.length;
        (0, ws_utils_1.sendSuccess)(context.socket, {
            handler: ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT,
            type: "kick",
            request_id: context.message.request_id,
            roomId,
            targetUserId,
            targetUsername: finalTargetUsername,
            activeCount,
            activeUsers,
        });
        broadcastToRoomUsers(roomId, {
            handler: ROOM_ACTIVE_COUNT_EVENT,
            type: "active_count",
            roomId,
            activeCount,
            activeUsers,
            users: activeUsers,
        });
        broadcastToRoomUsers(roomId, {
            handler: ROOM_USERS_EVENT,
            type: "users",
            roomId,
            users: activeUsers,
            activeUsers,
            activeCount,
        });
        broadcastToRoomUsers(roomId, {
            handler: ROOM_MESSAGE_EVENT,
            type: "message",
            roomId,
            message: makeRoomModerationMessage({
                roomId,
                actorId,
                actorUsername,
                targetUserId,
                targetUsername: finalTargetUsername,
                action: "kick",
            }),
        });
        logEnd(logName);
    }
    catch (error) {
        console.error(`[${logName}] unexpected error:`, error);
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, "room_kick_failed", context.message.request_id);
        logEnd(logName);
    }
};
function makeRoomModerationMessage(input) {
    const now = Date.now();
    const actorUsername = text(input.actorUsername) || "User";
    const targetUsername = text(input.targetUsername) || "User";
    const isBan = input.action === "ban";
    const textValue = isBan
        ? `${actorUsername} حظر ${targetUsername}`
        : `${actorUsername} طرد ${targetUsername}`;
    return {
        messageId: `${input.action}_${input.actorId}_${input.targetUserId}_${now}`,
        roomId: input.roomId,
        messageKind: "system",
        type: "none",
        fromUserId: input.actorId,
        fromUsername: actorUsername,
        fromPhotoUrl: "",
        fromRole: "none",
        text: textValue,
        media: null,
        mention: null,
        gift: null,
        entryVideo: null,
        replyTo: null,
        reactions: [],
        accountColor: "",
        badgeKey: "",
        badgeName: "",
        badgeValue: "",
        verificationType: "none",
        system: {
            action: isBan ? "user_banned" : "user_kicked",
            actorId: input.actorId,
            actorUsername,
            targetUserId: input.targetUserId,
            targetUsername,
            message: textValue,
        },
        createdAt: new Date().toISOString(),
    };
}
const handleRoomBan = async (context) => {
    const logName = "ROOM_BAN_HANDLER";
    try {
        logStart(logName, context);
        if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT)) {
            console.log(`[${logName}] requireLogin failed`);
            logEnd(logName);
            return;
        }
        const actorId = context.client.userId;
        const actorUsername = text(context.client?.username);
        const roomId = text(context.message.roomId || context.message.room_id);
        const targetUserId = text(context.message.targetUserId || context.message.target_user_id);
        const targetUsername = text(context.message.targetUsername || context.message.target_username);
        const targetIp = text(context.message.targetIp || context.message.target_ip);
        const banIp = boolValue(context.message.banIp || context.message.ban_ip);
        if (!roomId) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, "room_id_required", context.message.request_id);
            logEnd(logName);
            return;
        }
        if (!targetUserId) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, "target_user_id_required", context.message.request_id);
            logEnd(logName);
            return;
        }
        const targetLiveUser = getRoomLiveUser(roomId, targetUserId);
        const finalTargetUsername = targetUsername || text(targetLiveUser?.username) || targetUserId;
        const result = await (0, room_ban_service_1.banUserFromRoomService)({
            actorId,
            actorUsername,
            targetUserId,
            targetUsername: finalTargetUsername,
            roomId,
            targetIp,
            banIp,
        });
        console.log(`[${logName}] service result:`, result);
        if (!result.ok) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, result.reason, context.message.request_id);
            logEnd(logName);
            return;
        }
        forceUserLeaveLiveRoom({
            context,
            roomId,
            targetUserId,
            eventName: "room:banned",
            message: "أنت محظور من هذه الغرفة",
        });
        const activeUsers = getActiveUsers(roomId);
        const activeCount = activeUsers.length;
        (0, ws_utils_1.sendSuccess)(context.socket, {
            handler: ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT,
            type: "ban",
            request_id: context.message.request_id,
            roomId,
            targetUserId,
            targetUsername: finalTargetUsername,
            activeCount,
            activeUsers,
            banIp: result.banIp,
            bannedIp: result.bannedIp,
        });
        broadcastToRoomUsers(roomId, {
            handler: ROOM_ACTIVE_COUNT_EVENT,
            type: "active_count",
            roomId,
            activeCount,
            activeUsers,
            users: activeUsers,
        });
        broadcastToRoomUsers(roomId, {
            handler: ROOM_USERS_EVENT,
            type: "users",
            roomId,
            users: activeUsers,
            activeUsers,
            activeCount,
        });
        broadcastToRoomUsers(roomId, {
            handler: ROOM_MESSAGE_EVENT,
            type: "message",
            roomId,
            message: makeRoomModerationMessage({
                roomId,
                actorId,
                actorUsername,
                targetUserId,
                targetUsername: finalTargetUsername,
                action: "ban",
            }),
        });
        logEnd(logName);
    }
    catch (error) {
        console.error(`[${logName}] unexpected error:`, error);
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, "room_ban_failed", context.message.request_id);
        logEnd(logName);
    }
};
const handleRoomRoleSet = async (context) => {
    const logName = "ROOM_ROLE_SET_HANDLER";
    try {
        logStart(logName, context);
        if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT)) {
            console.log(`[${logName}] requireLogin failed`);
            logEnd(logName);
            return;
        }
        const actorId = context.client.userId;
        const actorUsername = text(context.client?.username);
        const roomId = text(context.message.roomId || context.message.room_id);
        /*
          الجديد:
          ممكن الفرونت يرسل targetUsername فقط بدون targetUserId.
          والباك يبحث عن المستخدم من UserModel.
        */
        const rawTargetUserId = text(context.message.targetUserId || context.message.target_user_id);
        const rawTargetUsername = text(context.message.targetUsername || context.message.target_username);
        const newRole = text(context.message.newRole || context.message.new_role);
        if (!roomId) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, "room_id_required", context.message.request_id);
            logEnd(logName);
            return;
        }
        const resolvedTarget = await resolveTargetUser({
            targetUserId: rawTargetUserId,
            targetUsername: rawTargetUsername,
        });
        if (!resolvedTarget.ok) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, resolvedTarget.reason, context.message.request_id);
            logEnd(logName);
            return;
        }
        const targetUserId = resolvedTarget.userId;
        const targetUsername = resolvedTarget.username;
        const result = await (0, room_role_service_1.setRoomRoleService)({
            actorId,
            actorUsername,
            targetUserId,
            targetUsername,
            roomId,
            newRole,
        });
        console.log(`[${logName}] service result:`, result);
        if (!result.ok) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, result.reason, context.message.request_id);
            logEnd(logName);
            return;
        }
        /*
          تحديث الرتبة داخل اللايف memory
          لو المستخدم موجود داخل الغرفة الآن.
          لو خارج الغرفة، الرتبة تحفظ في MongoDB فقط،
          وستظهر عند دخوله لاحقًا.
        */
        (0, roomClients_store_1.updateRoomUserRole)({
            roomId,
            userId: targetUserId,
            role: result.newRole,
        });
        const targetLiveUser = getRoomLiveUser(roomId, targetUserId);
        const finalTargetUsername = targetUsername || text(targetLiveUser?.username) || targetUserId;
        const activeUsers = getActiveUsers(roomId);
        const activeCount = activeUsers.length;
        (0, ws_utils_1.sendSuccess)(context.socket, {
            handler: ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT,
            type: "role",
            request_id: context.message.request_id,
            roomId,
            targetUserId,
            targetUsername: finalTargetUsername,
            oldRole: result.oldRole,
            newRole: result.newRole,
        });
        broadcastToRoomUsers(roomId, {
            handler: ROOM_USERS_EVENT,
            type: "users",
            roomId,
            users: activeUsers,
            activeUsers,
            activeCount,
        });
        broadcastToRoomUsers(roomId, {
            handler: ROOM_MESSAGE_EVENT,
            type: "message",
            roomId,
            message: makeRoomRoleMessage({
                roomId,
                actorId,
                actorUsername,
                targetUserId,
                targetUsername: finalTargetUsername,
                oldRole: result.oldRole,
                newRole: result.newRole,
            }),
        });
        logEnd(logName);
    }
    catch (error) {
        console.error(`[${logName}] unexpected error:`, error);
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, "room_role_set_failed", context.message.request_id);
        logEnd(logName);
    }
};
const handleRoomCreate = async (context) => {
    const logName = "ROOM_CREATE_HANDLER";
    try {
        logStart(logName, context);
        if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.ROOM_CREATE_EVENT)) {
            console.log(`[${logName}] requireLogin failed`);
            logEnd(logName);
            return;
        }
        const creatorId = context.client.userId;
        const name = text(context.message.name);
        const description = text(context.message.description);
        const password = text(context.message.password);
        const voiceEnabled = boolValue(context.message.voiceEnabled);
        const result = await (0, room_create_service_1.createRoomService)({
            creatorId,
            name,
            password,
            description,
            voiceEnabled,
        });
        console.log(`[${logName}] service result:`, result);
        if (!result.ok) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_CREATE_EVENT, result.reason, context.message.request_id);
            logEnd(logName);
            return;
        }
        (0, ws_utils_1.sendSuccess)(context.socket, {
            handler: ws_events_1.WS_EVENTS.ROOM_CREATE_EVENT,
            type: "success",
            request_id: context.message.request_id,
            room: result.room,
        });
        logEnd(logName);
    }
    catch (error) {
        console.error(`[${logName}] unexpected error:`, error);
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_CREATE_EVENT, "room_create_failed", context.message.request_id);
        logEnd(logName);
    }
};
const handleRoomJoin = async (context) => {
    const logName = "ROOM_JOIN_HANDLER";
    try {
        logStart(logName, context);
        if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.ROOM_JOIN_EVENT)) {
            console.log(`[${logName}] requireLogin failed`);
            logEnd(logName);
            return;
        }
        const userId = context.client.userId;
        const username = text(context.client?.username);
        const photoUrl = text(context.client?.photoUrl);
        const roomId = text(context.message.roomId || context.message.room_id);
        const password = text(context.message.password);
        const ip = (0, room_ip_1.getClientIp)(context);
        const socketId = text(context.client?.connectionId);
        if (!roomId) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_JOIN_EVENT, "room_id_required", context.message.request_id);
            logEnd(logName);
            return;
        }
        if (!socketId) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_JOIN_EVENT, "socket_id_missing", context.message.request_id);
            logEnd(logName);
            return;
        }
        const usersBeforeJoin = (0, roomClients_store_1.getRoomUsers)(roomId);
        const wasAlreadyInRoom = usersBeforeJoin.some((user) => text(user.userId) === userId);
        const result = await (0, room_join_service_1.joinRoomService)({
            userId,
            username,
            photoUrl,
            roomId,
            password,
            ip,
            socketId,
        });
        console.log(`[${logName}] service result:`, result);
        if (!result.ok) {
            const reason = text(result.reason);
            const errorMessage = reason === "room_banned" ||
                reason === "ROOM_BANNED" ||
                reason === "banned" ||
                reason === "BANNED"
                ? "أنت محظور من هذه الغرفة"
                : result.reason;
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_JOIN_EVENT, errorMessage, context.message.request_id);
            logEnd(logName);
            return;
        }
        const activeUsers = getActiveUsers(roomId);
        const activeCount = activeUsers.length;
        const currentLiveUser = getRoomLiveUser(roomId, userId);
        const currentUser = currentLiveUser
            ? normalizeActiveUser(currentLiveUser)
            : {
                userId,
                username,
                photoUrl,
                socketId,
                joinedAt: "",
                dc: false,
                role: result.role || "none",
                accountColor: "",
                badgeKey: "",
                badgeName: "",
                badgeValue: "",
                verificationType: "none",
            };
        (0, ws_utils_1.sendSuccess)(context.socket, {
            handler: ws_events_1.WS_EVENTS.ROOM_JOIN_EVENT,
            type: "success",
            request_id: context.message.request_id,
            room: result.room,
            role: result.role,
            activeCount,
            activeUsers,
            pinnedMessage: result.pinnedMessage,
            currentUserId: userId,
            currentUsername: currentUser.username,
        });
        broadcastToRoomUsers(roomId, {
            handler: ROOM_ACTIVE_COUNT_EVENT,
            type: "active_count",
            roomId,
            activeCount,
            activeUsers,
            users: activeUsers,
        });
        broadcastToRoomUsers(roomId, {
            handler: ROOM_USERS_EVENT,
            type: "users",
            roomId,
            users: activeUsers,
            activeUsers,
            activeCount,
        });
        if (!wasAlreadyInRoom) {
            broadcastToRoomUsers(roomId, {
                handler: ROOM_MESSAGE_EVENT,
                type: "message",
                roomId,
                message: makeRoomEventMessage({
                    roomId,
                    userId,
                    username: currentUser.username,
                    photoUrl: currentUser.photoUrl,
                    role: result.role,
                    accountColor: currentUser.accountColor,
                    badgeKey: currentUser.badgeKey,
                    badgeName: currentUser.badgeName,
                    badgeValue: currentUser.badgeValue,
                    verificationType: currentUser.verificationType,
                    type: "join",
                }),
            });
        }
        else {
            console.log(`[${logName}] skip duplicate join message`);
        }
        logEnd(logName);
    }
    catch (error) {
        console.error(`[${logName}] unexpected error:`, error);
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_JOIN_EVENT, "room_join_failed", context.message.request_id);
        logEnd(logName);
    }
};
const handleRoomLeave = async (context) => {
    const logName = "ROOM_LEAVE_HANDLER";
    try {
        logStart(logName, context);
        if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.ROOM_LEAVE_EVENT)) {
            console.log(`[${logName}] requireLogin failed`);
            logEnd(logName);
            return;
        }
        const userId = context.client.userId;
        const username = text(context.client?.username);
        const photoUrl = text(context.client?.photoUrl);
        const roomId = text(context.message.roomId || context.message.room_id);
        if (!roomId) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_LEAVE_EVENT, "room_id_required", context.message.request_id);
            logEnd(logName);
            return;
        }
        const usersBeforeLeave = (0, roomClients_store_1.getRoomUsers)(roomId);
        const liveUserBeforeLeave = getRoomLiveUser(roomId, userId);
        const wasInRoom = usersBeforeLeave.some((user) => text(user.userId) === userId);
        const userBeforeLeave = liveUserBeforeLeave
            ? normalizeActiveUser(liveUserBeforeLeave)
            : {
                userId,
                username,
                photoUrl,
                socketId: "",
                joinedAt: "",
                dc: false,
                role: "none",
                accountColor: "",
                badgeKey: "",
                badgeName: "",
                badgeValue: "",
                verificationType: "none",
            };
        const result = await (0, room_join_service_1.leaveRoomService)({
            userId,
            roomId,
        });
        console.log(`[${logName}] service result:`, result);
        if (!result.ok) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_LEAVE_EVENT, result.reason, context.message.request_id);
            logEnd(logName);
            return;
        }
        const activeUsers = getActiveUsers(roomId);
        const activeCount = activeUsers.length;
        (0, ws_utils_1.sendSuccess)(context.socket, {
            handler: ws_events_1.WS_EVENTS.ROOM_LEAVE_EVENT,
            type: "success",
            request_id: context.message.request_id,
            room: result.room,
            roomId,
            activeCount,
            activeUsers,
            currentUserId: userId,
            currentUsername: userBeforeLeave.username,
        });
        broadcastToRoomUsers(roomId, {
            handler: ROOM_ACTIVE_COUNT_EVENT,
            type: "active_count",
            roomId,
            activeCount,
            activeUsers,
            users: activeUsers,
        });
        broadcastToRoomUsers(roomId, {
            handler: ROOM_USERS_EVENT,
            type: "users",
            roomId,
            users: activeUsers,
            activeUsers,
            activeCount,
        });
        const shouldSendLeaveMessage = wasInRoom || text(userBeforeLeave.username).length > 0;
        if (shouldSendLeaveMessage) {
            broadcastToRoomUsers(roomId, {
                handler: ROOM_MESSAGE_EVENT,
                type: "message",
                roomId,
                message: makeRoomEventMessage({
                    roomId,
                    userId,
                    username: userBeforeLeave.username || username || "User",
                    photoUrl: userBeforeLeave.photoUrl || photoUrl || "",
                    role: userBeforeLeave.role || "none",
                    accountColor: userBeforeLeave.accountColor || "",
                    badgeKey: userBeforeLeave.badgeKey || "",
                    badgeName: userBeforeLeave.badgeName || "",
                    badgeValue: userBeforeLeave.badgeValue || "",
                    verificationType: userBeforeLeave.verificationType || "none",
                    type: "leave",
                }),
            });
        }
        // if (wasInRoom) {
        //   broadcastToRoomUsers(roomId, {
        //     handler: ROOM_MESSAGE_EVENT,
        //     type: "message",
        //     roomId,
        //     message: makeRoomEventMessage({
        //       roomId,
        //       userId,
        //       username: userBeforeLeave.username,
        //       photoUrl: userBeforeLeave.photoUrl,
        //       role: userBeforeLeave.role,
        //       accountColor: userBeforeLeave.accountColor,
        //       badgeKey: userBeforeLeave.badgeKey,
        //       badgeName: userBeforeLeave.badgeName,
        //       badgeValue: userBeforeLeave.badgeValue,
        //       verificationType: userBeforeLeave.verificationType,
        //       type: "leave",
        //     }),
        //   });
        // }
        logEnd(logName);
    }
    catch (error) {
        console.error(`[${logName}] unexpected error:`, error);
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_LEAVE_EVENT, "room_leave_failed", context.message.request_id);
        logEnd(logName);
    }
};
const handleRoomList = async (context) => {
    const logName = "ROOM_LIST_HANDLER";
    try {
        logStart(logName, context);
        if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.ROOM_LIST_EVENT)) {
            console.log(`[${logName}] requireLogin failed`);
            logEnd(logName);
            return;
        }
        const userId = context.client.userId;
        const tab = text(context.message.tab || "public");
        const rooms = await (0, room_query_service_1.listRoomsService)({
            userId,
            tab,
        });
        (0, ws_utils_1.sendSuccess)(context.socket, {
            handler: ws_events_1.WS_EVENTS.ROOM_LIST_EVENT,
            type: "success",
            request_id: context.message.request_id,
            tab,
            rooms,
        });
        logEnd(logName);
    }
    catch (error) {
        console.error(`[${logName}] unexpected error:`, error);
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_LIST_EVENT, "room_list_failed", context.message.request_id);
        logEnd(logName);
    }
};
const handleRoomMessageSend = async (context) => {
    const logName = "ROOM_MESSAGE_SEND_HANDLER";
    try {
        logStart(logName, context);
        if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.ROOM_MESSAGE_SEND_EVENT)) {
            console.log(`[${logName}] requireLogin failed`);
            logEnd(logName);
            return;
        }
        const userId = context.client.userId;
        const username = text(context.client?.username);
        const photoUrl = text(context.client?.photoUrl);
        const roomId = text(context.message.roomId || context.message.room_id);
        const type = text(context.message.type || "text");
        const messageText = text(context.message.text);
        if (!roomId) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_MESSAGE_SEND_EVENT, "room_id_required", context.message.request_id);
            logEnd(logName);
            return;
        }
        if (type === "text" && !messageText) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_MESSAGE_SEND_EVENT, "message_text_required", context.message.request_id);
            logEnd(logName);
            return;
        }
        const mediaBase64 = text(context.message.mediaBase64 || context.message.media_base64);
        const hasMediaObject = !!context.message.media;
        const hasMediaBase64 = mediaBase64.startsWith("data:");
        if (type !== "text" &&
            !hasMediaObject &&
            !hasMediaBase64) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_MESSAGE_SEND_EVENT, "missing_media", context.message.request_id);
            logEnd(logName);
            return;
        }
        const userStillInRoom = (0, roomClients_store_1.isUserInRoom)({
            roomId,
            userId,
        });
        if (!userStillInRoom) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_MESSAGE_SEND_EVENT, "room_not_joined", context.message.request_id);
            logEnd(logName);
            return;
        }
        const result = await (0, room_message_service_1.sendRoomLiveMessageService)({
            userId,
            username,
            photoUrl,
            roomId,
            type,
            text: context.message.text,
            media: context.message.media,
            mediaBase64: context.message.mediaBase64 || context.message.media_base64,
            fileName: context.message.fileName || context.message.file_name,
            mimeType: context.message.mimeType || context.message.mime_type,
            sizeBytes: Number(context.message.sizeBytes || context.message.size_bytes || 0),
            duration: context.message.duration,
            replyTo: context.message.replyTo || context.message.reply_to,
        });
        console.log(`[${logName}] service result:`, result);
        if (!result.ok) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_MESSAGE_SEND_EVENT, result.reason, context.message.request_id);
            logEnd(logName);
            return;
        }
        const rawMessage = getResultMessage(result);
        if (!rawMessage) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_MESSAGE_SEND_EVENT, "message_result_missing", context.message.request_id);
            logEnd(logName);
            return;
        }
        const message = enrichLiveMessage(roomId, rawMessage);
        (0, ws_utils_1.sendSuccess)(context.socket, {
            handler: ws_events_1.WS_EVENTS.ROOM_MESSAGE_SEND_EVENT,
            type: "success",
            request_id: context.message.request_id,
            message,
        });
        broadcastToRoomUsers(roomId, {
            handler: ROOM_MESSAGE_EVENT,
            type: "message",
            roomId,
            message,
        });
        logEnd(logName);
    }
    catch (error) {
        console.error(`[${logName}] unexpected error:`, error);
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_MESSAGE_SEND_EVENT, "room_message_send_failed", context.message.request_id);
        logEnd(logName);
    }
};
const handleRoomFavoriteToggle = async (context) => {
    const logName = "ROOM_FAVORITE_TOGGLE_HANDLER";
    try {
        logStart(logName, context);
        if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT)) {
            console.log(`[${logName}] requireLogin failed`);
            logEnd(logName);
            return;
        }
        const userId = context.client.userId;
        const roomId = text(context.message.roomId || context.message.room_id);
        const result = await (0, room_favorite_service_1.toggleFavoriteRoomService)({
            userId,
            roomId,
        });
        if (!result.ok) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, result.reason, context.message.request_id);
            logEnd(logName);
            return;
        }
        (0, ws_utils_1.sendSuccess)(context.socket, {
            handler: ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT,
            type: "favorite",
            request_id: context.message.request_id,
            roomId,
            isFavorite: result.isFavorite,
            favoriteCount: result.favoriteCount,
        });
        logEnd(logName);
    }
    catch (error) {
        console.error(`[${logName}] unexpected error:`, error);
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, "room_favorite_failed", context.message.request_id);
        logEnd(logName);
    }
};
const handleRoomBoost = async (context) => {
    const logName = "ROOM_BOOST_HANDLER";
    try {
        logStart(logName, context);
        if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT)) {
            console.log(`[${logName}] requireLogin failed`);
            logEnd(logName);
            return;
        }
        const userId = context.client.userId;
        const roomId = text(context.message.roomId || context.message.room_id);
        const value = Number(context.message.value || 1);
        const result = await (0, room_boost_service_1.boostRoomService)({
            userId,
            roomId,
            value,
        });
        if (!result.ok) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, result.reason, context.message.request_id);
            logEnd(logName);
            return;
        }
        (0, ws_utils_1.sendSuccess)(context.socket, {
            handler: ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT,
            type: "boost",
            request_id: context.message.request_id,
            roomId,
            boost: result.boost,
        });
        logEnd(logName);
    }
    catch (error) {
        console.error(`[${logName}] unexpected error:`, error);
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, "room_boost_failed", context.message.request_id);
        logEnd(logName);
    }
};
const handleRoomLockSet = async (context) => {
    const logName = "ROOM_LOCK_SET_HANDLER";
    try {
        logStart(logName, context);
        if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT)) {
            console.log(`[${logName}] requireLogin failed`);
            logEnd(logName);
            return;
        }
        const actorId = context.client.userId;
        const roomId = text(context.message.roomId || context.message.room_id);
        const locked = boolValue(context.message.locked);
        if (!roomId) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, "room_id_required", context.message.request_id);
            logEnd(logName);
            return;
        }
        const room = await Room_model_1.RoomModel.findOne({ roomId });
        if (!room) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, "room_not_found", context.message.request_id);
            logEnd(logName);
            return;
        }
        const actorRole = String(room.creatorId) === actorId
            ? "creator"
            : room.owners.includes(actorId)
                ? "owner"
                : room.admins.includes(actorId)
                    ? "admin"
                    : room.members.includes(actorId)
                        ? "member"
                        : "none";
        if (actorRole !== "creator" &&
            actorRole !== "owner" &&
            actorRole !== "admin") {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, "permission_denied", context.message.request_id);
            logEnd(logName);
            return;
        }
        room.isLockedForNone = locked;
        await room.save();
        const activeUsers = getActiveUsers(roomId);
        const activeCount = activeUsers.length;
        (0, ws_utils_1.sendSuccess)(context.socket, {
            handler: ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT,
            type: "lock",
            request_id: context.message.request_id,
            roomId,
            locked,
            isLockedForNone: locked,
            activeCount,
            activeUsers,
            room: {
                roomId: room.roomId,
                isLockedForNone: room.isLockedForNone,
            },
        });
        broadcastToRoomUsers(roomId, {
            handler: ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT,
            type: "lock",
            roomId,
            locked,
            isLockedForNone: locked,
            activeCount,
            activeUsers,
            room: {
                roomId: room.roomId,
                isLockedForNone: room.isLockedForNone,
            },
        });
        logEnd(logName);
    }
    catch (error) {
        console.error(`[${logName}] unexpected error:`, error);
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, "room_lock_set_failed", context.message.request_id);
        logEnd(logName);
    }
};
const handleRoomPasswordSet = async (context) => {
    const logName = "ROOM_PASSWORD_SET_HANDLER";
    try {
        logStart(logName, context);
        if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT)) {
            console.log(`[${logName}] requireLogin failed`);
            logEnd(logName);
            return;
        }
        const actorId = context.client.userId;
        const roomId = text(context.message.roomId || context.message.room_id);
        const password = text(context.message.password);
        if (!roomId) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, "room_id_required", context.message.request_id);
            logEnd(logName);
            return;
        }
        const room = await Room_model_1.RoomModel.findOne({ roomId });
        if (!room) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, "room_not_found", context.message.request_id);
            logEnd(logName);
            return;
        }
        const actorRole = String(room.creatorId) === actorId
            ? "creator"
            : room.owners.includes(actorId)
                ? "owner"
                : room.admins.includes(actorId)
                    ? "admin"
                    : room.members.includes(actorId)
                        ? "member"
                        : "none";
        if (actorRole !== "creator" &&
            actorRole !== "owner" &&
            actorRole !== "admin") {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, "permission_denied", context.message.request_id);
            logEnd(logName);
            return;
        }
        room.passwordHash = password;
        room.hasPassword = password.length > 0;
        await room.save();
        (0, ws_utils_1.sendSuccess)(context.socket, {
            handler: ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT,
            type: "password",
            request_id: context.message.request_id,
            roomId,
            hasPassword: room.hasPassword,
            room: {
                roomId: room.roomId,
                hasPassword: room.hasPassword,
            },
        });
        broadcastToRoomUsers(roomId, {
            handler: ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT,
            type: "password",
            roomId,
            hasPassword: room.hasPassword,
            room: {
                roomId: room.roomId,
                hasPassword: room.hasPassword,
            },
        });
        logEnd(logName);
    }
    catch (error) {
        console.error(`[${logName}] unexpected error:`, error);
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, "room_password_set_failed", context.message.request_id);
        logEnd(logName);
    }
};
const handleRoomPinSet = async (context) => {
    const logName = "ROOM_PIN_SET_HANDLER";
    try {
        logStart(logName, context);
        if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT)) {
            console.log(`[${logName}] requireLogin failed`);
            logEnd(logName);
            return;
        }
        const actorId = context.client.userId;
        const roomId = text(context.message.roomId || context.message.room_id);
        const pinText = text(context.message.text);
        if (!roomId) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, "room_id_required", context.message.request_id);
            logEnd(logName);
            return;
        }
        const room = await Room_model_1.RoomModel.findOne({ roomId });
        if (!room) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, "room_not_found", context.message.request_id);
            logEnd(logName);
            return;
        }
        const actorRole = String(room.creatorId) === actorId
            ? "creator"
            : room.owners.includes(actorId)
                ? "owner"
                : room.admins.includes(actorId)
                    ? "admin"
                    : room.members.includes(actorId)
                        ? "member"
                        : "none";
        if (actorRole !== "creator" &&
            actorRole !== "owner" &&
            actorRole !== "admin") {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, "permission_denied", context.message.request_id);
            logEnd(logName);
            return;
        }
        room.pinnedMessage = {
            text: pinText,
            updatedBy: actorId,
            updatedAt: new Date(),
        };
        await room.save();
        (0, ws_utils_1.sendSuccess)(context.socket, {
            handler: ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT,
            type: "pin",
            request_id: context.message.request_id,
            roomId,
            pinnedMessage: room.pinnedMessage,
            room: {
                roomId: room.roomId,
                pinnedMessage: room.pinnedMessage,
            },
        });
        broadcastToRoomUsers(roomId, {
            handler: ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT,
            type: "pin",
            roomId,
            pinnedMessage: room.pinnedMessage,
            room: {
                roomId: room.roomId,
                pinnedMessage: room.pinnedMessage,
            },
        });
        logEnd(logName);
    }
    catch (error) {
        console.error(`[${logName}] unexpected error:`, error);
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, "room_pin_set_failed", context.message.request_id);
        logEnd(logName);
    }
};
const handleRoomRolesList = async (context) => {
    const logName = "ROOM_ROLES_LIST_HANDLER";
    try {
        logStart(logName, context);
        if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT)) {
            logEnd(logName);
            return;
        }
        const actorId = context.client.userId;
        const roomId = text(context.message.roomId || context.message.room_id);
        const role = text(context.message.role);
        const result = await (0, room_admin_query_service_1.listRoomUsersByRoleService)({
            actorId,
            roomId,
            role,
        });
        if (!result.ok) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, result.reason, context.message.request_id);
            logEnd(logName);
            return;
        }
        (0, ws_utils_1.sendSuccess)(context.socket, {
            handler: ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT,
            type: "roles_list",
            request_id: context.message.request_id,
            roomId: result.roomId,
            role: result.role,
            users: result.users,
            count: result.count,
        });
        logEnd(logName);
    }
    catch (error) {
        console.error(`[${logName}] unexpected error:`, error);
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, "room_roles_list_failed", context.message.request_id);
        logEnd(logName);
    }
};
const handleRoomLogsList = async (context) => {
    const logName = "ROOM_LOGS_LIST_HANDLER";
    try {
        logStart(logName, context);
        if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT)) {
            logEnd(logName);
            return;
        }
        const actorId = context.client.userId;
        const roomId = text(context.message.roomId || context.message.room_id);
        const limit = Number(context.message.limit || 50);
        const result = await (0, room_admin_query_service_1.listRoomLogsService)({
            actorId,
            roomId,
            limit,
        });
        if (!result.ok) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, result.reason, context.message.request_id);
            logEnd(logName);
            return;
        }
        (0, ws_utils_1.sendSuccess)(context.socket, {
            handler: ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT,
            type: "logs",
            request_id: context.message.request_id,
            roomId: result.roomId,
            logs: result.logs,
        });
        logEnd(logName);
    }
    catch (error) {
        console.error(`[${logName}] unexpected error:`, error);
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, "room_logs_list_failed", context.message.request_id);
        logEnd(logName);
    }
};
const handleRoomBannedList = async (context) => {
    const logName = "ROOM_BANNED_LIST_HANDLER";
    try {
        logStart(logName, context);
        if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT)) {
            logEnd(logName);
            return;
        }
        const actorId = context.client.userId;
        const roomId = text(context.message.roomId || context.message.room_id);
        const result = await (0, room_admin_query_service_1.listRoomBannedService)({
            actorId,
            roomId,
        });
        if (!result.ok) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, result.reason, context.message.request_id);
            logEnd(logName);
            return;
        }
        (0, ws_utils_1.sendSuccess)(context.socket, {
            handler: ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT,
            type: "banned_list",
            request_id: context.message.request_id,
            roomId: result.roomId,
            bannedUsers: result.bannedUsers,
            bannedIps: result.bannedIps,
        });
        logEnd(logName);
    }
    catch (error) {
        console.error(`[${logName}] unexpected error:`, error);
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, "room_banned_list_failed", context.message.request_id);
        logEnd(logName);
    }
};
const handleRoomRoleRemove = async (context) => {
    const logName = "ROOM_ROLE_REMOVE_HANDLER";
    try {
        logStart(logName, context);
        if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT)) {
            logEnd(logName);
            return;
        }
        const actorId = context.client.userId;
        const actorUsername = text(context.client?.username);
        const roomId = text(context.message.roomId || context.message.room_id);
        const targetUserId = text(context.message.targetUserId || context.message.target_user_id);
        const targetUsername = text(context.message.targetUsername || context.message.target_username);
        if (!roomId) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, "room_id_required", context.message.request_id);
            logEnd(logName);
            return;
        }
        if (!targetUserId) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, "target_user_id_required", context.message.request_id);
            logEnd(logName);
            return;
        }
        const result = await (0, room_role_service_1.setRoomRoleService)({
            actorId,
            actorUsername,
            targetUserId,
            targetUsername,
            roomId,
            newRole: "none",
        });
        if (!result.ok) {
            (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, result.reason, context.message.request_id);
            logEnd(logName);
            return;
        }
        (0, roomClients_store_1.updateRoomUserRole)({
            roomId,
            userId: targetUserId,
            role: "none",
        });
        const targetLiveUser = getRoomLiveUser(roomId, targetUserId);
        const finalTargetUsername = targetUsername || text(targetLiveUser?.username) || targetUserId;
        const activeUsers = getActiveUsers(roomId);
        const activeCount = activeUsers.length;
        (0, ws_utils_1.sendSuccess)(context.socket, {
            handler: ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT,
            type: "role_remove",
            request_id: context.message.request_id,
            roomId,
            targetUserId,
            targetUsername: finalTargetUsername,
            oldRole: result.oldRole,
            newRole: "none",
        });
        broadcastToRoomUsers(roomId, {
            handler: ROOM_USERS_EVENT,
            type: "users",
            roomId,
            users: activeUsers,
            activeUsers,
            activeCount,
        });
        broadcastToRoomUsers(roomId, {
            handler: ROOM_MESSAGE_EVENT,
            type: "message",
            roomId,
            message: makeRoomRoleMessage({
                roomId,
                actorId,
                actorUsername,
                targetUserId,
                targetUsername: finalTargetUsername,
                oldRole: result.oldRole,
                newRole: "none",
            }),
        });
        logEnd(logName);
    }
    catch (error) {
        console.error(`[${logName}] unexpected error:`, error);
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ROOM_UPDATE_EVENT, "room_role_remove_failed", context.message.request_id);
        logEnd(logName);
    }
};
exports.roomHandlers = {
    [ws_events_1.WS_HANDLERS.ROOM_CREATE]: handleRoomCreate,
    [ws_events_1.WS_HANDLERS.ROOM_JOIN]: handleRoomJoin,
    [ws_events_1.WS_HANDLERS.ROOM_LEAVE]: handleRoomLeave,
    [ws_events_1.WS_HANDLERS.ROOM_LIST]: handleRoomList,
    [ws_events_1.WS_HANDLERS.ROOM_MESSAGE_SEND]: handleRoomMessageSend,
    [ws_events_1.WS_HANDLERS.ROOM_FAVORITE_TOGGLE]: handleRoomFavoriteToggle,
    [ws_events_1.WS_HANDLERS.ROOM_BOOST]: handleRoomBoost,
    [ws_events_1.WS_HANDLERS.ROOM_ROLE_SET]: handleRoomRoleSet,
    [ws_events_1.WS_HANDLERS.ROOM_KICK]: handleRoomKick,
    [ws_events_1.WS_HANDLERS.ROOM_BAN]: handleRoomBan,
    [ws_events_1.WS_HANDLERS.ROOM_SET_PASSWORD]: handleRoomPasswordSet,
    [ws_events_1.WS_HANDLERS.ROOM_LOCK_SET]: handleRoomLockSet,
    [ws_events_1.WS_HANDLERS.ROOM_PIN_SET]: handleRoomPinSet,
    [ws_events_1.WS_HANDLERS.ROOM_ROLES_LIST]: handleRoomRolesList,
    [ws_events_1.WS_HANDLERS.ROOM_ROLE_REMOVE]: handleRoomRoleRemove,
    [ws_events_1.WS_HANDLERS.ROOM_LOGS_LIST]: handleRoomLogsList,
    [ws_events_1.WS_HANDLERS.ROOM_BANNED_LIST]: handleRoomBannedList,
};
//# sourceMappingURL=room.handlers.js.map