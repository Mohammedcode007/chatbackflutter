"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.friendsHandlers = void 0;
const ws_auth_1 = require("../../websocket/ws.auth");
const ws_utils_1 = require("../../websocket/ws.utils");
const ws_events_1 = require("../../websocket/ws.events");
const FriendRequest_model_1 = require("../../models/FriendRequest.model");
const Friendship_model_1 = require("../../models/Friendship.model");
const clients_store_1 = require("../../websocket/stores/clients.store");
const privacy_service_1 = require("../privacy/privacy.service");
function pairUsers(userA, userB) {
    return [userA, userB].sort();
}
const handleFriendsList = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.FRIENDS_LIST_EVENT))
        return;
    const userId = context.client.userId;
    const friendships = await Friendship_model_1.FriendshipModel.find({
        $or: [{ userA: userId }, { userB: userId }],
    }).lean();
    const friends = friendships.map((item) => {
        return item.userA === userId ? item.userB : item.userA;
    });
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: ws_events_1.WS_EVENTS.FRIENDS_LIST_EVENT,
        request_id: context.message.request_id,
        friends,
    });
};
const handleFriendRequest = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.FRIEND_REQUEST_EVENT))
        return;
    const fromUserId = context.client.userId;
    const toUserId = String(context.message.to_user_id || "").trim();
    if (!toUserId) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.FRIEND_REQUEST_EVENT, "missing_to_user_id", context.message.request_id);
        return;
    }
    const permission = await (0, privacy_service_1.canSendFriendRequest)({
        fromUserId,
        toUserId,
    });
    if (!permission.ok) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.FRIEND_REQUEST_EVENT, permission.reason, context.message.request_id);
        return;
    }
    const existing = await FriendRequest_model_1.FriendRequestModel.findOne({
        fromUserId,
        toUserId,
        status: "pending",
    });
    if (existing) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.FRIEND_REQUEST_EVENT, "request_already_sent", context.message.request_id);
        return;
    }
    const request = await FriendRequest_model_1.FriendRequestModel.create({
        fromUserId,
        toUserId,
        status: "pending",
    });
    const event = {
        handler: ws_events_1.WS_EVENTS.FRIEND_REQUEST_EVENT,
        type: "success",
        reason: "null",
        request_id: String(request._id),
        from_user_id: fromUserId,
        to_user_id: toUserId,
        status: "pending",
        created_at: request.createdAt.toISOString(),
    };
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: ws_events_1.WS_EVENTS.FRIEND_REQUEST_EVENT,
        request_id: context.message.request_id,
        status: "sent",
        to_user_id: toUserId,
    });
    for (const socket of (0, clients_store_1.getUserSockets)(toUserId)) {
        (0, ws_utils_1.safeSend)(socket, event);
    }
};
const handleFriendAccept = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.FRIEND_REQUEST_EVENT))
        return;
    const userId = context.client.userId;
    const requestId = String(context.message.friend_request_id || "").trim();
    const request = await FriendRequest_model_1.FriendRequestModel.findOne({
        _id: requestId,
        toUserId: userId,
        status: "pending",
    });
    if (!request) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.FRIEND_REQUEST_EVENT, "request_not_found", context.message.request_id);
        return;
    }
    request.status = "accepted";
    await request.save();
    const [userA, userB] = pairUsers(request.fromUserId, request.toUserId);
    await Friendship_model_1.FriendshipModel.updateOne({ userA, userB }, { $setOnInsert: { userA, userB } }, { upsert: true });
    const event = {
        handler: ws_events_1.WS_EVENTS.FRIEND_REQUEST_EVENT,
        type: "success",
        reason: "null",
        status: "accepted",
        from_user_id: request.fromUserId,
        to_user_id: request.toUserId,
    };
    (0, ws_utils_1.safeSend)(context.socket, event);
    for (const socket of (0, clients_store_1.getUserSockets)(request.fromUserId)) {
        (0, ws_utils_1.safeSend)(socket, event);
    }
};
exports.friendsHandlers = {
    [ws_events_1.WS_HANDLERS.FRIENDS_LIST]: handleFriendsList,
    [ws_events_1.WS_HANDLERS.FRIENDS_REQUEST]: handleFriendRequest,
    [ws_events_1.WS_HANDLERS.FRIENDS_ACCEPT]: handleFriendAccept,
};
//# sourceMappingURL=friends.handlers.js.map