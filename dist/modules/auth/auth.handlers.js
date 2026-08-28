"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authHandlers = void 0;
const crypto_1 = __importDefault(require("crypto"));
const ws_utils_1 = require("../../websocket/ws.utils");
const clients_store_1 = require("../../websocket/stores/clients.store");
const rooms_store_1 = require("../../websocket/stores/rooms.store");
const ws_events_1 = require("../../websocket/ws.events");
const User_model_1 = require("../../models/User.model");
const auth_validators_1 = require("./auth.validators");
const auth_service_1 = require("./auth.service");
const session_service_1 = require("./session.service");
const dm_service_1 = require("../dm/dm.service");
const chats_delivery_1 = require("../chats/chats.delivery");
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
const saveLoggedInClient = (context, user, session, sessionId) => {
    console.log("[AUTH] Save logged-in client:", {
        userId: user.userId,
        username: user.username,
        session,
        sessionId,
    });
    (0, clients_store_1.updateClient)(context.socket, {
        mongoId: user.mongoId || String(user._id),
        userId: user.userId,
        username: user.username,
        photoUrl: user.photoUrl || "",
        session,
        sessionId,
        isLoggedIn: true,
    });
};
/*
  إرسال نتيجة نجاح login/register/resume إلى Flutter.
*/
const sendAuthSuccess = (context, eventHandler, user, token, sessionExpiresAt, sessionId) => {
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
        session_id: sessionId || "",
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
    const ipAddress = context.client?.clientIp || "";
    const countryCode = (0, session_service_1.lookupCountryCode)(ipAddress);
    const deviceInfo = (0, session_service_1.extractDeviceInfo)(context.client?.upgradeHeaders, message.deviceInfo);
    const result = await (0, auth_service_1.registerService)(message, {
        ipAddress,
        countryCode,
        deviceInfo,
    });
    if (!result.ok) {
        console.log("[AUTH REGISTER] Failed:", result.reason);
        (0, ws_utils_1.sendError)(socket, ws_events_1.WS_EVENTS.REGISTER_EVENT, result.reason, message.request_id);
        return;
    }
    const user = result.user;
    saveLoggedInClient(context, user, message.session, result.sessionId);
    sendAuthSuccess(context, ws_events_1.WS_EVENTS.REGISTER_EVENT, user, result.token, result.sessionExpiresAt, result.sessionId);
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
    const ipAddress = context.client?.clientIp || "";
    const countryCode = (0, session_service_1.lookupCountryCode)(ipAddress);
    const deviceInfo = (0, session_service_1.extractDeviceInfo)(context.client?.upgradeHeaders, message.deviceInfo);
    const result = await (0, auth_service_1.loginService)(message, {
        ipAddress,
        countryCode,
        deviceInfo,
    });
    if (!result.ok) {
        console.log("[AUTH LOGIN] Failed:", result.reason);
        (0, ws_utils_1.sendError)(socket, ws_events_1.WS_EVENTS.LOGIN_EVENT, result.reason, message.request_id);
        return;
    }
    const user = result.user;
    saveLoggedInClient(context, user, message.session, result.sessionId);
    sendAuthSuccess(context, ws_events_1.WS_EVENTS.LOGIN_EVENT, user, result.token, result.sessionExpiresAt, result.sessionId);
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
    const ipAddress = context.client?.clientIp || "";
    const countryCode = (0, session_service_1.lookupCountryCode)(ipAddress);
    const deviceInfo = (0, session_service_1.extractDeviceInfo)(context.client?.upgradeHeaders, message.deviceInfo);
    const result = await (0, auth_service_1.resumeService)(message, {
        ipAddress,
        countryCode,
        deviceInfo,
    });
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
    saveLoggedInClient(context, user, message.session, result.sessionId);
    /*
      نستخدم login_event حتى لا نحتاج Event جديد
      داخل Flutter.
    */
    sendAuthSuccess(context, ws_events_1.WS_EVENTS.LOGIN_EVENT, user, result.token, result.sessionExpiresAt, result.sessionId);
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
    const sessionId = context.client?.sessionId;
    console.log("[AUTH LOGOUT] Request:", {
        userId,
        sessionId,
        requestId: message.request_id,
    });
    await (0, auth_service_1.logoutService)({
        userId,
        sessionId,
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
        sessionId: undefined,
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
/*
  طلب إعادة تعيين كلمة المرور (إرسال OTP).
*/
const handleForgotPassword = async (context) => {
    const { socket, message } = context;
    console.log("[AUTH FORGOT PASSWORD] Request:", {
        requestId: message.request_id,
        email: message.email,
    });
    if (!(0, auth_validators_1.isForgotPasswordPayload)(message)) {
        console.log("[AUTH FORGOT PASSWORD] invalid_forgot_password_payload");
        (0, ws_utils_1.sendError)(socket, ws_events_1.WS_EVENTS.FORGOT_PASSWORD_EVENT, "invalid_forgot_password_payload", message.request_id);
        return;
    }
    const result = await (0, auth_service_1.forgotPasswordService)(message);
    if (!result.ok) {
        console.log("[AUTH FORGOT PASSWORD] Failed:", result.reason);
        (0, ws_utils_1.sendError)(socket, ws_events_1.WS_EVENTS.FORGOT_PASSWORD_EVENT, result.reason, message.request_id);
        return;
    }
    (0, ws_utils_1.sendSuccess)(socket, {
        handler: ws_events_1.WS_EVENTS.FORGOT_PASSWORD_EVENT,
        request_id: message.request_id,
        message: result.message,
    });
    console.log("[AUTH FORGOT PASSWORD] Completed");
};
/*
  التحقق من OTP.
*/
const handleVerifyOtp = async (context) => {
    const { socket, message } = context;
    console.log("[AUTH VERIFY OTP] Request:", {
        requestId: message.request_id,
        email: message.email,
    });
    if (!(0, auth_validators_1.isVerifyOtpPayload)(message)) {
        console.log("[AUTH VERIFY OTP] invalid_verify_otp_payload");
        (0, ws_utils_1.sendError)(socket, ws_events_1.WS_EVENTS.VERIFY_OTP_EVENT, "invalid_verify_otp_payload", message.request_id);
        return;
    }
    const result = await (0, auth_service_1.verifyOtpService)(message);
    if (!result.ok) {
        console.log("[AUTH VERIFY OTP] Failed:", result.reason);
        (0, ws_utils_1.sendError)(socket, ws_events_1.WS_EVENTS.VERIFY_OTP_EVENT, result.reason, message.request_id);
        return;
    }
    (0, ws_utils_1.sendSuccess)(socket, {
        handler: ws_events_1.WS_EVENTS.VERIFY_OTP_EVENT,
        request_id: message.request_id,
        message: result.message,
    });
    console.log("[AUTH VERIFY OTP] Completed");
};
/*
  إعادة تعيين كلمة المرور.
*/
const handleResetPassword = async (context) => {
    const { socket, message } = context;
    console.log("[AUTH RESET PASSWORD] Request:", {
        requestId: message.request_id,
        email: message.email,
    });
    if (!(0, auth_validators_1.isResetPasswordPayload)(message)) {
        console.log("[AUTH RESET PASSWORD] invalid_reset_password_payload");
        (0, ws_utils_1.sendError)(socket, ws_events_1.WS_EVENTS.RESET_PASSWORD_EVENT, "invalid_reset_password_payload", message.request_id);
        return;
    }
    const result = await (0, auth_service_1.resetPasswordService)(message);
    if (!result.ok) {
        console.log("[AUTH RESET PASSWORD] Failed:", result.reason);
        (0, ws_utils_1.sendError)(socket, ws_events_1.WS_EVENTS.RESET_PASSWORD_EVENT, result.reason, message.request_id);
        return;
    }
    (0, ws_utils_1.sendSuccess)(socket, {
        handler: ws_events_1.WS_EVENTS.RESET_PASSWORD_EVENT,
        request_id: message.request_id,
        message: result.message,
    });
    console.log("[AUTH RESET PASSWORD] Completed");
};
/*
  جلب جلسات المستخدم النشطة عبر WebSocket.
  Flutter يرسل:
  {
    handler: "sessions.list",
    token: userAuthToken,
    request_id: "..."
  }
*/
function extractTokenFromMessage(message) {
    const cleanToken = (value) => {
        return String(value || "")
            .trim()
            .replace(/^Bearer\s+/i, "")
            .trim();
    };
    return (cleanToken(message.token) ||
        cleanToken(message.authorization) ||
        cleanToken(message.data?.token) ||
        cleanToken(message.data?.authorization));
}
function extractTokenFromHandshake(client) {
    const headers = client?.upgradeHeaders || {};
    const headerValue = (key) => {
        const value = headers[key];
        if (Array.isArray(value))
            return value[0] || "";
        return String(value || "");
    };
    return String(headerValue("authorization") || "")
        .replace(/^Bearer\s+/i, "")
        .trim();
}
const handleSessionsList = async (context) => {
    const { socket, message } = context;
    const token = extractTokenFromMessage(message) || extractTokenFromHandshake(context.client);
    console.log("[AUTH SESSIONS_LIST] Request:", {
        requestId: message.request_id,
        hasToken: Boolean(token),
    });
    if (!token) {
        (0, ws_utils_1.sendError)(socket, ws_events_1.WS_EVENTS.SESSIONS_LIST_EVENT, "token_required", message.request_id);
        return;
    }
    const sessionTokenHash = crypto_1.default
        .createHash("sha256")
        .update(token)
        .digest("hex");
    const user = await User_model_1.UserModel.findOne({
        sessionTokenHash,
        $or: [
            { sessionExpiresAt: null },
            { sessionExpiresAt: { $gt: new Date() } },
        ],
    }).select("+sessionTokenHash +sessionExpiresAt");
    if (!user) {
        (0, ws_utils_1.sendError)(socket, ws_events_1.WS_EVENTS.SESSIONS_LIST_EVENT, "invalid_or_expired_token", message.request_id);
        return;
    }
    const currentSessionId = String(message.sessionId || message.session_id || "").trim();
    const sessions = await (0, session_service_1.getActiveSessions)(user.userId, currentSessionId);
    (0, ws_utils_1.safeSend)(socket, {
        handler: ws_events_1.WS_EVENTS.SESSIONS_LIST_EVENT,
        type: "response",
        status: "success",
        request_id: message.request_id,
        data: sessions,
    });
};
/*
  إلغاء جلسة محددة عبر WebSocket.
  Flutter يرسل:
  {
    handler: "sessions.revoke",
    token: userAuthToken,
    session_id: "...",
    request_id: "..."
  }
*/
const handleSessionRevoke = async (context) => {
    const { socket, message } = context;
    const token = String(message.token || "").trim();
    const sessionId = String(message.session_id || message.sessionId || "").trim();
    if (!token) {
        (0, ws_utils_1.sendError)(socket, ws_events_1.WS_EVENTS.SESSION_REVOKE_EVENT, "token_required", message.request_id);
        return;
    }
    const sessionTokenHash = crypto_1.default
        .createHash("sha256")
        .update(token)
        .digest("hex");
    const user = await User_model_1.UserModel.findOne({
        sessionTokenHash,
        $or: [
            { sessionExpiresAt: null },
            { sessionExpiresAt: { $gt: new Date() } },
        ],
    }).select("+sessionTokenHash +sessionExpiresAt");
    if (!user) {
        (0, ws_utils_1.sendError)(socket, ws_events_1.WS_EVENTS.SESSION_REVOKE_EVENT, "invalid_or_expired_token", message.request_id);
        return;
    }
    if (!sessionId) {
        (0, ws_utils_1.sendError)(socket, ws_events_1.WS_EVENTS.SESSION_REVOKE_EVENT, "session_id_required", message.request_id);
        return;
    }
    const revoked = await (0, session_service_1.revokeSession)(user.userId, sessionId);
    (0, ws_utils_1.sendSuccess)(socket, {
        handler: ws_events_1.WS_EVENTS.SESSION_REVOKE_EVENT,
        request_id: message.request_id,
        session_id: sessionId,
        revoked,
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
    /*
      Forgot Password
    */
    [ws_events_1.WS_HANDLERS.AUTH_FORGOT_PASSWORD]: handleForgotPassword,
    forgot_password: handleForgotPassword,
    /*
      Verify OTP
    */
    [ws_events_1.WS_HANDLERS.AUTH_VERIFY_OTP]: handleVerifyOtp,
    verify_otp: handleVerifyOtp,
    /*
      Reset Password
    */
    [ws_events_1.WS_HANDLERS.AUTH_RESET_PASSWORD]: handleResetPassword,
    reset_password: handleResetPassword,
    /*
      Sessions
    */
    [ws_events_1.WS_HANDLERS.AUTH_SESSIONS_LIST]: handleSessionsList,
    [ws_events_1.WS_HANDLERS.AUTH_SESSION_REVOKE]: handleSessionRevoke,
};
//# sourceMappingURL=auth.handlers.js.map