"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersHandlers = void 0;
const ws_auth_1 = require("../../websocket/ws.auth");
const ws_utils_1 = require("../../websocket/ws.utils");
const ws_events_1 = require("../../websocket/ws.events");
const User_model_1 = require("../../models/User.model");
const chats_delivery_1 = require("../chats/chats.delivery");
const clients_store_1 = require("../../websocket/stores/clients.store");
const users_service_1 = require("./users.service");
const notifyFriendsAboutUserUpdate = async (context, user, changedFields = []) => {
    const userId = String(user?.userId || "").trim();
    if (!userId)
        return;
    const fullUser = await User_model_1.UserModel.findOne({ userId }).lean();
    if (!fullUser)
        return;
    const friends = Array.isArray(fullUser.friends)
        ? fullUser.friends
        : [];
    const hideActivityStatus = fullUser.hideActivityStatus === true;
    const isManualOffline = fullUser.isManualOffline === true;
    const isHidden = hideActivityStatus || isManualOffline;
    const publicUser = {
        userId: fullUser.userId,
        username: fullUser.username,
        photoUrl: fullUser.photoUrl || "",
        coverUrl: fullUser.coverUrl || "",
        accountColor: fullUser.accountColor || "#2BCB00",
        badgeKey: fullUser.badgeKey || "",
        badgeName: fullUser.badgeName || "",
        badgeValue: fullUser.badgeValue || "",
        badges: Array.isArray(fullUser.inventory)
            ? fullUser.inventory
                .filter((item) => {
                return item.type === "badge" && item.isActive === true;
            })
                .map((item) => ({
                itemId: item.itemId || "",
                key: item.key || "",
                name: item.name || "",
                value: item.value || "",
            }))
            : fullUser.badgeValue
                ? [
                    {
                        itemId: "",
                        key: fullUser.badgeKey || "",
                        name: fullUser.badgeName || "",
                        value: fullUser.badgeValue || "",
                    },
                ]
                : [],
        verificationType: fullUser.verificationType || "none",
        statusMessage: fullUser.statusMessage || "",
        current: isHidden ? "0" : fullUser.current || "0",
        hideActivityStatus,
        isManualOffline,
        isOnline: isHidden
            ? false
            : fullUser.current === "1" || fullUser.current === "online",
        country: fullUser.country || "",
        gender: fullUser.gender || "",
        birthdate: fullUser.birthdate || "",
        privacy: {
            dmPrivacy: fullUser.privacy?.dmPrivacy || "open",
            friendRequestPrivacy: fullUser.privacy?.friendRequestPrivacy || "open",
            allowCalls: fullUser.privacy?.allowCalls || "all",
        },
        stats: {
            friendsCount: fullUser.stats?.friendsCount || 0,
            profileViewsCount: fullUser.stats?.profileViewsCount || 0,
            giftsSentCount: fullUser.stats?.giftsSentCount || 0,
            giftsReceivedCount: fullUser.stats?.giftsReceivedCount || 0,
        },
        updatedAt: fullUser.updatedAt,
    };
    for (const friendUserId of friends) {
        (0, clients_store_1.sendToUserIfOnline)(friendUserId, {
            handler: ws_events_1.WS_EVENTS.USER_PROFILE_LIVE_UPDATE_EVENT,
            type: "user_updated",
            userId,
            user: publicUser,
            changedFields,
        });
    }
};
const handleUpdateProfile = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.USER_PROFILE_EVENT))
        return;
    const userId = context.client.userId;
    const result = await (0, users_service_1.updateUserProfileService)({
        userId,
        payload: context.message,
    });
    if (!result.ok) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.USER_PROFILE_EVENT, result.reason, context.message.request_id);
        return;
    }
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: ws_events_1.WS_EVENTS.USER_PROFILE_EVENT,
        request_id: context.message.request_id,
        user_id: result.user.userId,
        username: result.user.username,
        photo_url: result.user.photoUrl || "",
        current: result.user.current || "0",
        user: result.user,
    });
    await notifyFriendsAboutUserUpdate(context, result.user, result.changedFields || []);
    if (context.message.hide_activity_status === false ||
        context.message.hideActivityStatus === false) {
        await (0, chats_delivery_1.deliverPendingPrivateMessages)(userId);
    }
};
const handleUpdateSettings = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.USER_SETTINGS_EVENT))
        return;
    const userId = context.client.userId;
    const result = await (0, users_service_1.updateUserProfileService)({
        userId,
        payload: context.message,
    });
    if (!result.ok) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.USER_SETTINGS_EVENT, result.reason, context.message.request_id);
        return;
    }
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: ws_events_1.WS_EVENTS.USER_SETTINGS_EVENT,
        request_id: context.message.request_id,
        user_id: result.user.userId,
        username: result.user.username,
        photo_url: result.user.photoUrl || "",
        current: result.user.current || "0",
        user: result.user,
    });
    await notifyFriendsAboutUserUpdate(context, result.user, result.changedFields || []);
    if (context.message.is_manual_offline === false ||
        context.message.hide_activity_status === false ||
        context.message.hideActivityStatus === false) {
        await (0, chats_delivery_1.deliverPendingPrivateMessages)(userId);
    }
};
const handleBlockUser = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.USER_BLOCK_EVENT))
        return;
    const userId = context.client.userId;
    const targetUserId = String(context.message.target_user_id || "").trim();
    if (!targetUserId || targetUserId === userId) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.USER_BLOCK_EVENT, "invalid_target_user", context.message.request_id);
        return;
    }
    await User_model_1.UserModel.updateOne({ userId }, {
        $addToSet: {
            blockedUsers: targetUserId,
        },
    });
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: ws_events_1.WS_EVENTS.USER_BLOCK_EVENT,
        request_id: context.message.request_id,
        target_user_id: targetUserId,
        blocked: true,
    });
};
const handleUnblockUser = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.USER_BLOCK_EVENT))
        return;
    const userId = context.client.userId;
    const targetUserId = String(context.message.target_user_id || "").trim();
    if (!targetUserId) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.USER_BLOCK_EVENT, "invalid_target_user", context.message.request_id);
        return;
    }
    await User_model_1.UserModel.updateOne({ userId }, {
        $pull: {
            blockedUsers: targetUserId,
        },
    });
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: ws_events_1.WS_EVENTS.USER_BLOCK_EVENT,
        request_id: context.message.request_id,
        target_user_id: targetUserId,
        blocked: false,
    });
};
const handleUpdateProfileImage = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.USER_PROFILE_IMAGE_EVENT))
        return;
    const userId = context.client.userId;
    const imageType = String(context.message.image_type || "").trim();
    const base64 = String(context.message.base64 || "").trim();
    if (!["avatar", "cover"].includes(imageType)) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.USER_PROFILE_IMAGE_EVENT, "invalid_image_type", context.message.request_id);
        return;
    }
    if (!base64) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.USER_PROFILE_IMAGE_EVENT, "missing_base64", context.message.request_id);
        return;
    }
    const result = await (0, users_service_1.updateUserProfileImageService)({
        userId,
        imageType: imageType,
        base64,
    });
    if (!result.ok) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.USER_PROFILE_IMAGE_EVENT, result.reason, context.message.request_id);
        return;
    }
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: ws_events_1.WS_EVENTS.USER_PROFILE_IMAGE_EVENT,
        request_id: context.message.request_id,
        image_type: result.imageType,
        url: result.url,
        user_id: result.user.userId,
        username: result.user.username,
        photo_url: result.user.photoUrl || "",
        cover_url: result.user.coverUrl || "",
        user: result.user,
    });
    await notifyFriendsAboutUserUpdate(context, result.user, [result.imageType === "avatar" ? "photoUrl" : "coverUrl"]);
};
const handleGetBlockedUsers = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.USERS_BLOCKED_LIST_EVENT))
        return;
    const userId = context.client.userId;
    const result = await (0, users_service_1.getBlockedUsersService)({
        userId,
    });
    if (!result.ok) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.USERS_BLOCKED_LIST_EVENT, result.reason, context.message.request_id);
        return;
    }
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: ws_events_1.WS_EVENTS.USERS_BLOCKED_LIST_EVENT,
        request_id: context.message.request_id,
        blockedUsers: result.blockedUsers,
    });
};
const handleDeleteMyAccount = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.USER_DELETE_ACCOUNT_EVENT))
        return;
    const userId = context.client.userId;
    const confirm = String(context.message.confirm || "").trim();
    if (confirm !== "DELETE_MY_ACCOUNT") {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.USER_DELETE_ACCOUNT_EVENT, "invalid_delete_confirm", context.message.request_id);
        return;
    }
    const result = await (0, users_service_1.deleteMyAccountService)({
        userId,
    });
    if (!result.ok) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.USER_DELETE_ACCOUNT_EVENT, result.reason, context.message.request_id);
        return;
    }
    (0, clients_store_1.updateClient)(context.socket, {
        mongoId: undefined,
        userId: undefined,
        username: undefined,
        photoUrl: undefined,
        session: undefined,
        isLoggedIn: false,
        activeRoomId: undefined,
        activeChatId: undefined,
    });
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: ws_events_1.WS_EVENTS.USER_DELETE_ACCOUNT_EVENT,
        request_id: context.message.request_id,
        deleted: true,
    });
};
const handleGetUserProfile = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.USER_PROFILE_GET_EVENT))
        return;
    const viewerUserId = context.client.userId;
    const targetUserId = String(context.message.target_user_id ||
        context.message.targetUserId ||
        context.message.user_id ||
        "").trim();
    if (!targetUserId) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.USER_PROFILE_GET_EVENT, "missing_target_user_id", context.message.request_id);
        return;
    }
    const result = await (0, users_service_1.getFullUserProfileService)({
        viewerUserId,
        targetUserId,
    });
    if (!result.ok) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.USER_PROFILE_GET_EVENT, result.reason, context.message.request_id);
        return;
    }
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: ws_events_1.WS_EVENTS.USER_PROFILE_GET_EVENT,
        request_id: context.message.request_id,
        profile: result.profile,
    });
};
const handleSearchUsers = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.USERS_SEARCH_EVENT))
        return;
    const viewerUserId = context.client.userId;
    const query = String(context.message.query || "").trim();
    const limit = Number(context.message.limit || 20);
    const result = await (0, users_service_1.searchUsersService)({
        viewerUserId,
        query,
        limit,
    });
    if (!result.ok) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.USERS_SEARCH_EVENT, result.reason, context.message.request_id);
        return;
    }
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: ws_events_1.WS_EVENTS.USERS_SEARCH_EVENT,
        request_id: context.message.request_id,
        users: result.users,
    });
};
const handleSendFriendRequest = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.FRIEND_REQUEST_SEND_EVENT))
        return;
    const fromUserId = context.client.userId;
    const toUserId = String(context.message.to_user_id ||
        context.message.toUserId ||
        context.message.target_user_id ||
        context.message.targetUserId ||
        "").trim();
    if (!toUserId) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.FRIEND_REQUEST_SEND_EVENT, "missing_to_user_id", context.message.request_id);
        return;
    }
    const result = await (0, users_service_1.sendFriendRequestService)({
        fromUserId,
        toUserId,
    });
    if (!result.ok) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.FRIEND_REQUEST_SEND_EVENT, result.reason, context.message.request_id);
        return;
    }
    /*
      رد للمرسل
    */
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: ws_events_1.WS_EVENTS.FRIEND_REQUEST_SEND_EVENT,
        request_id: context.message.request_id,
        request: result.request,
        toUser: result.toUser,
    });
    /*
      إشعار فوري للمستقبل لو أونلاين
    */
    (0, clients_store_1.sendToUserIfOnline)(toUserId, {
        handler: ws_events_1.WS_EVENTS.FRIEND_REQUEST_SEND_EVENT,
        type: "incoming",
        request: result.request,
        fromUser: result.fromUser,
    });
};
const handleGetIncomingFriendRequests = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.FRIEND_REQUESTS_INCOMING_LIST_EVENT)) {
        return;
    }
    const userId = context.client.userId;
    const result = await (0, users_service_1.getIncomingFriendRequestsService)({
        userId,
    });
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: ws_events_1.WS_EVENTS.FRIEND_REQUESTS_INCOMING_LIST_EVENT,
        request_id: context.message.request_id,
        requests: result.requests,
    });
};
const handleGetFriends = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.FRIENDS_LIST_EVENT))
        return;
    const userId = context.client.userId;
    const result = await (0, users_service_1.getFriendsService)({
        userId,
    });
    if (!result.ok) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.FRIENDS_LIST_EVENT, result.reason, context.message.request_id);
        return;
    }
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: ws_events_1.WS_EVENTS.FRIENDS_LIST_EVENT,
        request_id: context.message.request_id,
        friends: result.friends,
    });
};
const handleRemoveFriend = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.FRIEND_REMOVE_EVENT))
        return;
    const userId = context.client.userId;
    const friendUserId = String(context.message.friend_user_id ||
        context.message.friendUserId ||
        context.message.target_user_id ||
        context.message.targetUserId ||
        "").trim();
    if (!friendUserId) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.FRIEND_REMOVE_EVENT, "missing_friend_user_id", context.message.request_id);
        return;
    }
    const result = await (0, users_service_1.removeFriendService)({
        userId,
        friendUserId,
    });
    if (!result.ok) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.FRIEND_REMOVE_EVENT, result.reason, context.message.request_id);
        return;
    }
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: ws_events_1.WS_EVENTS.FRIEND_REMOVE_EVENT,
        request_id: context.message.request_id,
        removedUserId: result.removedUserId,
    });
    (0, clients_store_1.sendToUserIfOnline)(friendUserId, {
        handler: ws_events_1.WS_EVENTS.FRIEND_REMOVE_EVENT,
        type: "friend_removed",
        removedUserId: userId,
    });
};
const handleRespondFriendRequest = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.FRIEND_REQUEST_RESPOND_EVENT))
        return;
    const userId = context.client.userId;
    const requestId = String(context.message.request_id_value ||
        context.message.friend_request_id ||
        context.message.friendRequestId ||
        "").trim();
    const action = String(context.message.action || "").trim();
    if (!requestId) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.FRIEND_REQUEST_RESPOND_EVENT, "missing_request_id", context.message.request_id);
        return;
    }
    if (action !== "accept" && action !== "reject") {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.FRIEND_REQUEST_RESPOND_EVENT, "invalid_friend_request_action", context.message.request_id);
        return;
    }
    const result = await (0, users_service_1.respondFriendRequestService)({
        userId,
        requestId,
        action: action,
    });
    if (!result.ok) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.FRIEND_REQUEST_RESPOND_EVENT, result.reason, context.message.request_id);
        return;
    }
    /*
      رد للشخص الذي قبل/رفض
    */
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: ws_events_1.WS_EVENTS.FRIEND_REQUEST_RESPOND_EVENT,
        request_id: context.message.request_id,
        action: result.action,
        request: result.request,
        fromUser: result.fromUser,
        toUser: result.toUser,
    });
    /*
      إشعار فوري للمرسل الأصلي
    */
    (0, clients_store_1.sendToUserIfOnline)(result.request.fromUserId, {
        handler: ws_events_1.WS_EVENTS.FRIEND_REQUEST_RESPOND_EVENT,
        type: "friend_request_updated",
        action: result.action,
        request: result.request,
        fromUser: result.fromUser,
        toUser: result.toUser,
    });
};
exports.usersHandlers = {
    [ws_events_1.WS_HANDLERS.USERS_PROFILE_UPDATE]: handleUpdateProfile,
    [ws_events_1.WS_HANDLERS.USERS_PROFILE_IMAGE_UPDATE]: handleUpdateProfileImage,
    [ws_events_1.WS_HANDLERS.USERS_DELETE_ACCOUNT]: handleDeleteMyAccount,
    [ws_events_1.WS_HANDLERS.USERS_SETTINGS_UPDATE]: handleUpdateSettings,
    [ws_events_1.WS_HANDLERS.USERS_BLOCK]: handleBlockUser,
    [ws_events_1.WS_HANDLERS.USERS_UNBLOCK]: handleUnblockUser,
    [ws_events_1.WS_HANDLERS.USERS_BLOCKED_LIST]: handleGetBlockedUsers,
    [ws_events_1.WS_HANDLERS.USERS_PROFILE_GET]: handleGetUserProfile,
    [ws_events_1.WS_HANDLERS.USERS_SEARCH]: handleSearchUsers,
    [ws_events_1.WS_HANDLERS.FRIEND_REQUEST_SEND]: handleSendFriendRequest,
    [ws_events_1.WS_HANDLERS.FRIEND_REQUEST_RESPOND]: handleRespondFriendRequest,
    [ws_events_1.WS_HANDLERS.FRIEND_REQUESTS_INCOMING_LIST]: handleGetIncomingFriendRequests,
    [ws_events_1.WS_HANDLERS.FRIENDS_LIST]: handleGetFriends,
    [ws_events_1.WS_HANDLERS.FRIENDS_REMOVE]: handleRemoveFriend,
};
//# sourceMappingURL=users.handlers.js.map