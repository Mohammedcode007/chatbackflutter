"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsHandlers = void 0;
const NotificationModule = __importStar(require("../../models/Notification.model"));
const ws_auth_1 = require("../../websocket/ws.auth");
const ws_utils_1 = require("../../websocket/ws.utils");
const ws_events_1 = require("../../websocket/ws.events");
const clients_store_1 = require("../../websocket/stores/clients.store");
const ephemeralExpiry_redis_1 = require("../../services/expiry/ephemeralExpiry.redis");
/*
  يدعم:
  export const NotificationModel
  أو:
  export default NotificationModel
*/
const NotificationModel = NotificationModule.NotificationModel ??
    NotificationModule.default;
const TWEET_NOTIFICATION_TYPES = [
    "tweet_like",
    "tweet_comment",
    "tweet_retweet",
    "tweet_mention",
    "comment_mention",
];
function cleanValue(value) {
    return String(value ?? "").trim();
}
function clampLimit(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return 50;
    }
    return Math.min(Math.max(Math.floor(parsed), 1), 100);
}
/*
  تجهيز الإشعار بالشكل الذي يفهمه Flutter.
*/
function normalizeNotification(notification) {
    const notificationId = cleanValue(notification?.notificationId ??
        notification?.id ??
        notification?._id);
    return {
        ...notification,
        notificationId,
        notification_id: notificationId,
        id: notificationId,
        notificationType: cleanValue(notification?.type ??
            notification?.notificationType),
        senderUserId: cleanValue(notification?.senderUserId),
        senderUsername: cleanValue(notification?.senderUsername),
        senderPhotoUrl: cleanValue(notification?.senderPhotoUrl),
        recipientUserId: cleanValue(notification?.recipientUserId),
        tweetId: cleanValue(notification?.tweetId),
        relatedTweet: cleanValue(notification?.tweetId),
        commentId: cleanValue(notification?.commentId),
        relatedMessage: cleanValue(notification?.commentId),
        body: cleanValue(notification?.body),
        message: cleanValue(notification?.body),
        title: cleanValue(notification?.senderUsername),
        isRead: notification?.isRead === true,
        createdAt: notification?.createdAt ??
            new Date(),
    };
}
/*
  جلب إشعارات المستخدم المحفوظة.

  هذه الدالة مهمة للمستخدم الذي كان أوفلاين
  وقت وصول اللايك أو التعليق أو الريتويت.
*/
const handleNotificationsList = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.NOTIFICATION_EVENT)) {
        return;
    }
    const client = (0, clients_store_1.getClient)(context.socket);
    const userId = cleanValue(client?.userId);
    if (!userId) {
        (0, ws_utils_1.sendSuccess)(context.socket, {
            handler: ws_events_1.WS_EVENTS.NOTIFICATION_EVENT,
            request_id: context.message.request_id,
            notifications: [],
            count: 0,
            reason: "missing_logged_in_user",
        });
        return;
    }
    const limit = clampLimit(context.message.limit);
    try {
        const rawNotifications = await NotificationModel.find({
            recipientUserId: userId,
            type: {
                $in: TWEET_NOTIFICATION_TYPES,
            },
        })
            .sort({
            createdAt: -1,
        })
            .limit(limit)
            .lean();
        const notifications = rawNotifications.map(normalizeNotification);
        console.log("[NOTIFICATIONS LIST]", {
            userId,
            count: notifications.length,
            requestId: context.message
                .request_id,
        });
        (0, ws_utils_1.sendSuccess)(context.socket, {
            handler: ws_events_1.WS_EVENTS.NOTIFICATION_EVENT,
            request_id: context.message
                .request_id,
            /*
              Provider في Flutter سيتعرف على
              وجود notifications مباشرة.
            */
            notifications,
            count: notifications.length,
            unreadCount: notifications.length,
        });
    }
    catch (error) {
        console.error("[NOTIFICATIONS LIST ERROR]", {
            userId,
            error,
        });
        (0, ws_utils_1.sendSuccess)(context.socket, {
            handler: ws_events_1.WS_EVENTS.NOTIFICATION_EVENT,
            request_id: context.message
                .request_id,
            notifications: [],
            count: 0,
            reason: "notifications_list_failed",
        });
    }
};
/*
  فتح إشعار التويتة.

  حسب النظام المطلوب:
  عند فتح الإشعار يتم حذفه نهائيًا.
*/
const handleNotificationRead = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.NOTIFICATION_EVENT)) {
        return;
    }
    const client = (0, clients_store_1.getClient)(context.socket);
    const userId = cleanValue(client?.userId);
    const notificationId = cleanValue(context.message
        .notificationId ??
        context.message
            .notification_id ??
        context.message.id);
    if (!userId ||
        !notificationId) {
        (0, ws_utils_1.sendSuccess)(context.socket, {
            handler: ws_events_1.WS_EVENTS.NOTIFICATION_EVENT,
            request_id: context.message
                .request_id,
            notificationId,
            notification_id: notificationId,
            deleted: false,
            read: false,
            reason: "invalid_notification_input",
        });
        return;
    }
    try {
        /*
          نتحقق من recipientUserId حتى لا يستطيع
          مستخدم حذف إشعار مستخدم آخر.
        */
        const deletedNotification = await NotificationModel
            .findOneAndDelete({
            notificationId,
            recipientUserId: userId,
            type: {
                $in: TWEET_NOTIFICATION_TYPES,
            },
        })
            .lean();
        if (!deletedNotification) {
            console.log("[NOTIFICATION DELETE NOT FOUND]", {
                userId,
                notificationId,
            });
            (0, ws_utils_1.sendSuccess)(context.socket, {
                handler: ws_events_1.WS_EVENTS.NOTIFICATION_EVENT,
                request_id: context.message
                    .request_id,
                notificationId,
                notification_id: notificationId,
                deleted: false,
                read: false,
                reason: "notification_not_found",
            });
            return;
        }
        /*
          إزالة موعد حذف الإشعار من Redis
          لأنه حُذف بالفعل من MongoDB.
        */
        try {
            await (0, ephemeralExpiry_redis_1.cancelTweetNotificationExpiry)(notificationId);
        }
        catch (redisError) {
            console.error("[CANCEL NOTIFICATION EXPIRY ERROR]", {
                notificationId,
                redisError,
            });
        }
        const tweetId = cleanValue(deletedNotification
            ?.tweetId);
        const commentId = cleanValue(deletedNotification
            ?.commentId);
        console.log("[NOTIFICATION DELETED AFTER OPEN]", {
            userId,
            notificationId,
            tweetId,
            commentId,
        });
        (0, ws_utils_1.sendSuccess)(context.socket, {
            handler: ws_events_1.WS_EVENTS.NOTIFICATION_EVENT,
            request_id: context.message
                .request_id,
            notificationId,
            notification_id: notificationId,
            tweetId,
            commentId,
            deleted: true,
            read: true,
        });
    }
    catch (error) {
        console.error("[NOTIFICATION DELETE ERROR]", {
            userId,
            notificationId,
            error,
        });
        (0, ws_utils_1.sendSuccess)(context.socket, {
            handler: ws_events_1.WS_EVENTS.NOTIFICATION_EVENT,
            request_id: context.message
                .request_id,
            notificationId,
            notification_id: notificationId,
            deleted: false,
            read: false,
            reason: "notification_delete_failed",
        });
    }
};
exports.notificationsHandlers = {
    [ws_events_1.WS_HANDLERS.NOTIFICATIONS_LIST]: handleNotificationsList,
    [ws_events_1.WS_HANDLERS.NOTIFICATIONS_READ]: handleNotificationRead,
};
//# sourceMappingURL=notifications.handlers.js.map