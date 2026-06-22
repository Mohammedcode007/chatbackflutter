import * as NotificationModule from "../../models/Notification.model";

import { WsHandler } from "../../websocket/ws.types";
import { requireLogin } from "../../websocket/ws.auth";
import { sendSuccess } from "../../websocket/ws.utils";
import {
  WS_EVENTS,
  WS_HANDLERS,
} from "../../websocket/ws.events";

import {
  getClient,
} from "../../websocket/stores/clients.store";

import {
  cancelTweetNotificationExpiry,
} from "../../services/expiry/ephemeralExpiry.redis";

/*
  يدعم:
  export const NotificationModel
  أو:
  export default NotificationModel
*/
const NotificationModel: any =
  (NotificationModule as any).NotificationModel ??
  (NotificationModule as any).default;

const TWEET_NOTIFICATION_TYPES = [
  "tweet_like",
  "tweet_comment",
  "tweet_retweet",
  "tweet_mention",
  "comment_mention",
] as const;

function cleanValue(
  value: unknown
): string {
  return String(
    value ?? ""
  ).trim();
}

function clampLimit(
  value: unknown
): number {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed)
  ) {
    return 50;
  }

  return Math.min(
    Math.max(
      Math.floor(parsed),
      1
    ),
    100
  );
}

/*
  تجهيز الإشعار بالشكل الذي يفهمه Flutter.
*/
function normalizeNotification(
  notification: any
) {
  const notificationId =
    cleanValue(
      notification?.notificationId ??
        notification?.id ??
        notification?._id
    );

  return {
    ...notification,

    notificationId,

    notification_id:
      notificationId,

    id:
      notificationId,

    notificationType:
      cleanValue(
        notification?.type ??
          notification?.notificationType
      ),

    senderUserId:
      cleanValue(
        notification?.senderUserId
      ),

    senderUsername:
      cleanValue(
        notification?.senderUsername
      ),

    senderPhotoUrl:
      cleanValue(
        notification?.senderPhotoUrl
      ),

    recipientUserId:
      cleanValue(
        notification?.recipientUserId
      ),

    tweetId:
      cleanValue(
        notification?.tweetId
      ),

    relatedTweet:
      cleanValue(
        notification?.tweetId
      ),

    commentId:
      cleanValue(
        notification?.commentId
      ),

    relatedMessage:
      cleanValue(
        notification?.commentId
      ),

    body:
      cleanValue(
        notification?.body
      ),

    message:
      cleanValue(
        notification?.body
      ),

    title:
      cleanValue(
        notification?.senderUsername
      ),

    isRead:
      notification?.isRead === true,

    createdAt:
      notification?.createdAt ??
      new Date(),
  };
}

/*
  جلب إشعارات المستخدم المحفوظة.

  هذه الدالة مهمة للمستخدم الذي كان أوفلاين
  وقت وصول اللايك أو التعليق أو الريتويت.
*/
const handleNotificationsList:
    WsHandler =
  async (context) => {
    if (
      !requireLogin(
        context,
        WS_EVENTS.NOTIFICATION_EVENT
      )
    ) {
      return;
    }

    const client =
      getClient(
        context.socket
      );

    const userId =
      cleanValue(
        client?.userId
      );

    if (!userId) {
      sendSuccess(
        context.socket,
        {
          handler:
            WS_EVENTS.NOTIFICATION_EVENT,

          request_id:
            context.message.request_id,

          notifications:
            [],

          count:
            0,

          reason:
            "missing_logged_in_user",
        }
      );

      return;
    }

    const limit =
      clampLimit(
        context.message.limit
      );

    try {
      const rawNotifications =
        await NotificationModel.find({
          recipientUserId:
            userId,

          type: {
            $in:
              TWEET_NOTIFICATION_TYPES,
          },
        })
          .sort({
            createdAt: -1,
          })
          .limit(
            limit
          )
          .lean();

      const notifications =
        rawNotifications.map(
          normalizeNotification
        );

      console.log(
        "[NOTIFICATIONS LIST]",
        {
          userId,

          count:
            notifications.length,

          requestId:
            context.message
              .request_id,
        }
      );

      sendSuccess(
        context.socket,
        {
          handler:
            WS_EVENTS.NOTIFICATION_EVENT,

          request_id:
            context.message
              .request_id,

          /*
            Provider في Flutter سيتعرف على
            وجود notifications مباشرة.
          */
          notifications,

          count:
            notifications.length,

          unreadCount:
            notifications.length,
        }
      );
    } catch (error) {
      console.error(
        "[NOTIFICATIONS LIST ERROR]",
        {
          userId,
          error,
        }
      );

      sendSuccess(
        context.socket,
        {
          handler:
            WS_EVENTS.NOTIFICATION_EVENT,

          request_id:
            context.message
              .request_id,

          notifications:
            [],

          count:
            0,

          reason:
            "notifications_list_failed",
        }
      );
    }
  };

/*
  فتح إشعار التويتة.

  حسب النظام المطلوب:
  عند فتح الإشعار يتم حذفه نهائيًا.
*/
const handleNotificationRead:
    WsHandler =
  async (context) => {
    if (
      !requireLogin(
        context,
        WS_EVENTS.NOTIFICATION_EVENT
      )
    ) {
      return;
    }

    const client =
      getClient(
        context.socket
      );

    const userId =
      cleanValue(
        client?.userId
      );

    const notificationId =
      cleanValue(
        context.message
              .notificationId ??
          context.message
              .notification_id ??
          context.message.id
      );

    if (
      !userId ||
      !notificationId
    ) {
      sendSuccess(
        context.socket,
        {
          handler:
            WS_EVENTS.NOTIFICATION_EVENT,

          request_id:
            context.message
              .request_id,

          notificationId,

          notification_id:
            notificationId,

          deleted:
            false,

          read:
            false,

          reason:
            "invalid_notification_input",
        }
      );

      return;
    }

    try {
      /*
        نتحقق من recipientUserId حتى لا يستطيع
        مستخدم حذف إشعار مستخدم آخر.
      */
      const deletedNotification =
        await NotificationModel
          .findOneAndDelete({
            notificationId,

            recipientUserId:
              userId,

            type: {
              $in:
                TWEET_NOTIFICATION_TYPES,
            },
          })
          .lean();

      if (
        !deletedNotification
      ) {
        console.log(
          "[NOTIFICATION DELETE NOT FOUND]",
          {
            userId,
            notificationId,
          }
        );

        sendSuccess(
          context.socket,
          {
            handler:
              WS_EVENTS.NOTIFICATION_EVENT,

            request_id:
              context.message
                .request_id,

            notificationId,

            notification_id:
              notificationId,

            deleted:
              false,

            read:
              false,

            reason:
              "notification_not_found",
          }
        );

        return;
      }

      /*
        إزالة موعد حذف الإشعار من Redis
        لأنه حُذف بالفعل من MongoDB.
      */
      try {
        await cancelTweetNotificationExpiry(
          notificationId
        );
      } catch (redisError) {
        console.error(
          "[CANCEL NOTIFICATION EXPIRY ERROR]",
          {
            notificationId,
            redisError,
          }
        );
      }

      const tweetId =
        cleanValue(
          deletedNotification
            ?.tweetId
        );

      const commentId =
        cleanValue(
          deletedNotification
            ?.commentId
        );

      console.log(
        "[NOTIFICATION DELETED AFTER OPEN]",
        {
          userId,
          notificationId,
          tweetId,
          commentId,
        }
      );

      sendSuccess(
        context.socket,
        {
          handler:
            WS_EVENTS.NOTIFICATION_EVENT,

          request_id:
            context.message
              .request_id,

          notificationId,

          notification_id:
            notificationId,

          tweetId,

          commentId,

          deleted:
            true,

          read:
            true,
        }
      );
    } catch (error) {
      console.error(
        "[NOTIFICATION DELETE ERROR]",
        {
          userId,
          notificationId,
          error,
        }
      );

      sendSuccess(
        context.socket,
        {
          handler:
            WS_EVENTS.NOTIFICATION_EVENT,

          request_id:
            context.message
              .request_id,

          notificationId,

          notification_id:
            notificationId,

          deleted:
            false,

          read:
            false,

          reason:
            "notification_delete_failed",
        }
      );
    }
  };

export const notificationsHandlers = {
  [WS_HANDLERS.NOTIFICATIONS_LIST]:
    handleNotificationsList,

  [WS_HANDLERS.NOTIFICATIONS_READ]:
    handleNotificationRead,
};