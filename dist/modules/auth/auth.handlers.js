"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authHandlers = void 0;
const ws_utils_1 = require("../../websocket/ws.utils");
const clients_store_1 = require("../../websocket/stores/clients.store");
const rooms_store_1 = require("../../websocket/stores/rooms.store");
const ws_events_1 = require("../../websocket/ws.events");
const User_model_1 = require("../../models/User.model");
const auth_validators_1 = require("./auth.validators");
const auth_service_1 = require("./auth.service");
const chats_delivery_1 = require("../chats/chats.delivery");
const dm_service_1 = require("../dm/dm.service");
/*
  إرسال تحديث حالة المستخدم إلى أصدقائه.
*/
const notifyFriendsAboutAuthStatus = async (userId, changedFields = []) => {
    if (!userId)
        return;
    const user = await User_model_1.UserModel.findOne({
        userId,
    }).lean();
    if (!user)
        return;
    const friends = Array.isArray(user.friends)
        ? user.friends
        : [];
    const hideActivityStatus = user.hideActivityStatus === true;
    const isManualOffline = user.isManualOffline === true;
    const isHidden = hideActivityStatus || isManualOffline;
    const publicUser = {
        userId: user.userId,
        username: user.username,
        photoUrl: user.photoUrl || "",
        coverUrl: user.coverUrl || "",
        accountColor: user.accountColor || "#2BCB00",
        badgeKey: user.badgeKey || "",
        badgeName: user.badgeName || "",
        badgeValue: user.badgeValue || "",
        badges: Array.isArray(user.inventory)
            ? user.inventory
                .filter((item) => {
                return (item.type === "badge" &&
                    item.isActive === true);
            })
                .map((item) => ({
                itemId: item.itemId || "",
                key: item.key || "",
                name: item.name || "",
                value: item.value || "",
            }))
            : user.badgeValue
                ? [
                    {
                        itemId: "",
                        key: user.badgeKey || "",
                        name: user.badgeName || "",
                        value: user.badgeValue || "",
                    },
                ]
                : [],
        verificationType: user.verificationType || "none",
        statusMessage: user.statusMessage || "",
        current: isHidden
            ? "0"
            : user.current || "0",
        hideActivityStatus,
        isManualOffline,
        isOnline: isHidden
            ? false
            : user.current === "1" ||
                user.current === "online",
        country: user.country || "",
        gender: user.gender || "",
        birthdate: user.birthdate || "",
        privacy: {
            dmPrivacy: user.privacy?.dmPrivacy || "open",
            friendRequestPrivacy: user.privacy?.friendRequestPrivacy ||
                "open",
            allowCalls: user.privacy?.allowCalls || "all",
        },
        stats: {
            friendsCount: user.stats?.friendsCount || 0,
            profileViewsCount: user.stats?.profileViewsCount || 0,
            giftsSentCount: user.stats?.giftsSentCount || 0,
            giftsReceivedCount: user.stats?.giftsReceivedCount || 0,
        },
        updatedAt: user.updatedAt,
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
/*
  حفظ المستخدم على اتصال WebSocket الحالي.
*/
const saveLoggedInClient = (context, user, session) => {
    console.log("[AUTH] Save logged-in client:", {
        userId: user.userId,
        username: user.username,
        session,
    });
    (0, clients_store_1.updateClient)(context.socket, {
        mongoId: user.mongoId || String(user._id),
        userId: user.userId,
        username: user.username,
        photoUrl: user.photoUrl || "",
        session,
        isLoggedIn: true,
    });
};
/*
  إرسال نتيجة نجاح login/register/resume إلى Flutter.
*/
const sendAuthSuccess = (context, eventHandler, user, token, sessionExpiresAt) => {
    console.log("[AUTH] Sending auth success:", {
        handler: eventHandler,
        userId: user.userId,
        username: user.username,
        hasToken: Boolean(token),
        sessionExpiresAt,
    });
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: eventHandler,
        request_id: context.message.request_id,
        user_id: user.userId,
        username: user.username,
        photo_url: user.photoUrl || "",
        current: user.current || "0",
        token,
        session_expires_at: sessionExpiresAt,
        user,
    });
};
/*
  تسليم رسائل DM المعلقة للمستخدم.
*/
const deliverPendingDmForUser = async (context, userId) => {
    const pendingDmMessages = await (0, dm_service_1.getAndClearPendingDmMessages)(userId);
    console.log("[AUTH] Pending DM count:", {
        userId,
        count: pendingDmMessages.length,
    });
    for (const pendingMessage of pendingDmMessages) {
        (0, ws_utils_1.sendSuccess)(context.socket, {
            handler: ws_events_1.WS_EVENTS.DM_MESSAGE_EVENT,
            type: "incoming",
            message: pendingMessage,
            fromRedis: true,
        });
        (0, clients_store_1.sendToUserIfOnline)(pendingMessage.fromUserId, {
            handler: ws_events_1.WS_EVENTS.DM_DELIVERY_EVENT,
            type: "delivered",
            messageId: pendingMessage.messageId,
            tempId: pendingMessage.tempId,
            chatId: pendingMessage.chatId,
            toUserId: pendingMessage.toUserId,
            delivered: true,
            deliveredAt: new Date().toISOString(),
        });
    }
    await (0, chats_delivery_1.deliverPendingPrivateMessages)(userId);
};
/*
  إنشاء حساب.
*/
const handleRegister = async (context) => {
    const { socket, message } = context;
    console.log("[AUTH REGISTER] Request:", {
        requestId: message.request_id,
        username: message.username,
        session: message.session,
    });
    if (!(0, auth_validators_1.isRegisterPayload)(message)) {
        console.log("[AUTH REGISTER] invalid_register_payload");
        (0, ws_utils_1.sendError)(socket, ws_events_1.WS_EVENTS.REGISTER_EVENT, "invalid_register_payload", message.request_id);
        return;
    }
    const result = await (0, auth_service_1.registerService)(message);
    if (!result.ok) {
        console.log("[AUTH REGISTER] Failed:", result.reason);
        (0, ws_utils_1.sendError)(socket, ws_events_1.WS_EVENTS.REGISTER_EVENT, result.reason, message.request_id);
        return;
    }
    const user = result.user;
    saveLoggedInClient(context, user, message.session);
    sendAuthSuccess(context, ws_events_1.WS_EVENTS.REGISTER_EVENT, user, result.token, result.sessionExpiresAt);
    await notifyFriendsAboutAuthStatus(user.userId, [
        "current",
        "isOnline",
        "isManualOffline",
    ]);
    console.log("[AUTH REGISTER] Completed:", {
        userId: user.userId,
    });
};
/*
  تسجيل الدخول.
*/
const handleLogin = async (context) => {
    const { socket, message } = context;
    console.log("[AUTH LOGIN] Request:", {
        requestId: message.request_id,
        username: message.username,
        session: message.session,
    });
    if (!(0, auth_validators_1.isLoginPayload)(message)) {
        console.log("[AUTH LOGIN] invalid_login_payload");
        (0, ws_utils_1.sendError)(socket, ws_events_1.WS_EVENTS.LOGIN_EVENT, "invalid_login_payload", message.request_id);
        return;
    }
    const result = await (0, auth_service_1.loginService)(message);
    if (!result.ok) {
        console.log("[AUTH LOGIN] Failed:", result.reason);
        (0, ws_utils_1.sendError)(socket, ws_events_1.WS_EVENTS.LOGIN_EVENT, result.reason, message.request_id);
        return;
    }
    const user = result.user;
    saveLoggedInClient(context, user, message.session);
    sendAuthSuccess(context, ws_events_1.WS_EVENTS.LOGIN_EVENT, user, result.token, result.sessionExpiresAt);
    await deliverPendingDmForUser(context, user.userId);
    await notifyFriendsAboutAuthStatus(user.userId, [
        "current",
        "isOnline",
        "isManualOffline",
    ]);
    console.log("[AUTH LOGIN] Completed:", {
        userId: user.userId,
    });
};
/*
  استعادة تسجيل الدخول بعد تشغيل التطبيق.

  Flutter يرسل:
  {
    handler: "auth.resume",
    token: "...",
    session: "..."
  }
*/
const handleResume = async (context) => {
    const { socket, message } = context;
    console.log("[AUTH RESUME] Request:", {
        requestId: message.request_id,
        session: message.session,
        hasToken: typeof message.token === "string" &&
            message.token.trim().length > 0,
    });
    if (!(0, auth_validators_1.isResumePayload)(message)) {
        console.log("[AUTH RESUME] invalid_resume_payload");
        (0, ws_utils_1.sendError)(socket, ws_events_1.WS_EVENTS.LOGIN_EVENT, "invalid_resume_payload", message.request_id);
        return;
    }
    const result = await (0, auth_service_1.resumeService)(message);
    if (!result.ok) {
        console.log("[AUTH RESUME] Failed:", result.reason);
        /*
          نرجع login_event حتى يتعامل Flutter
          مع فشل استعادة الدخول مثل فشل login.
        */
        (0, ws_utils_1.sendError)(socket, ws_events_1.WS_EVENTS.LOGIN_EVENT, result.reason, message.request_id);
        return;
    }
    const user = result.user;
    /*
      تسجيل المستخدم على السوكيت الجديد.
    */
    saveLoggedInClient(context, user, message.session);
    /*
      نستخدم login_event حتى لا نحتاج Event جديد
      داخل Flutter.
    */
    sendAuthSuccess(context, ws_events_1.WS_EVENTS.LOGIN_EVENT, user, result.token, result.sessionExpiresAt);
    await deliverPendingDmForUser(context, user.userId);
    await notifyFriendsAboutAuthStatus(user.userId, [
        "current",
        "isOnline",
        "isManualOffline",
    ]);
    console.log("[AUTH RESUME] Completed:", {
        userId: user.userId,
    });
};
/*
  تسجيل الخروج.
*/
const handleLogout = async (context) => {
    const { socket, message } = context;
    const userId = context.client?.userId;
    console.log("[AUTH LOGOUT] Request:", {
        userId,
        requestId: message.request_id,
    });
    await (0, auth_service_1.logoutService)({
        userId,
    });
    if (userId) {
        await notifyFriendsAboutAuthStatus(userId, [
            "current",
            "isOnline",
            "isManualOffline",
        ]);
    }
    (0, rooms_store_1.leaveAllSocketRooms)(socket);
    (0, clients_store_1.updateClient)(socket, {
        mongoId: undefined,
        userId: undefined,
        username: undefined,
        photoUrl: undefined,
        session: undefined,
        isLoggedIn: false,
        activeRoomId: undefined,
        activeChatId: undefined,
    });
    (0, ws_utils_1.sendSuccess)(socket, {
        handler: ws_events_1.WS_EVENTS.LOGOUT_EVENT,
        request_id: message.request_id,
        message: "logged_out",
    });
    console.log("[AUTH LOGOUT] Completed:", {
        userId,
    });
};
exports.authHandlers = {
    /*
      Register
    */
    [ws_events_1.WS_HANDLERS.AUTH_REGISTER]: handleRegister,
    register: handleRegister,
    /*
      Login
    */
    [ws_events_1.WS_HANDLERS.AUTH_LOGIN]: handleLogin,
    login: handleLogin,
    /*
      Resume saved session
    */
    [ws_events_1.WS_HANDLERS.AUTH_RESUME]: handleResume,
    resume: handleResume,
    /*
      Logout
    */
    [ws_events_1.WS_HANDLERS.AUTH_LOGOUT]: handleLogout,
    logout: handleLogout,
};
//# sourceMappingURL=auth.handlers.js.map