"use strict";
// import { randomUUID } from "crypto";
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
exports.TWEET_NOTIFICATION_TYPES = void 0;
exports.createTweetNotification = createTweetNotification;
exports.deleteTweetLikeNotification = deleteTweetLikeNotification;
exports.deleteTweetRetweetNotification = deleteTweetRetweetNotification;
exports.deleteAllTweetNotifications = deleteAllTweetNotifications;
// import * as NotificationModule from "../../models/Notification.model";
// import { UserModel } from "../../models/User.model";
// import {
//   sendToUserIfOnline,
// } from "../../websocket/stores/clients.store";
// /*
//   يدعم الحالتين:
//   export const NotificationModel = ...
//   أو:
//   export default NotificationModel
// */
// const NotificationModel: any =
//   (NotificationModule as any).NotificationModel ??
//   (NotificationModule as any).default;
// /*
//   أنواع إشعارات التويتات.
// */
// export type TweetNotificationType =
//   | "tweet_like"
//   | "tweet_comment"
//   | "tweet_retweet"
//   | "tweet_mention"
//   | "comment_mention";
// /*
//   بيانات إنشاء إشعار تويتة.
// */
// export type CreateTweetNotificationInput = {
//   recipientUserId: string;
//   senderUserId: string;
//   senderUsername: string;
//   type: TweetNotificationType;
//   tweetId: string;
//   commentId?: string;
//   title?: string;
//   body: string;
//   metadata?: Record<string, any>;
// };
// /*
//   التحقق هل الحقل موجود داخل NotificationSchema.
// */
// function hasNotificationPath(path: string) {
//   try {
//     return Boolean(
//       NotificationModel?.schema?.path(path)
//     );
//   } catch {
//     return false;
//   }
// }
// /*
//   معرفة نوع الحقل داخل Mongoose:
//   String / ObjectId / Boolean ...
// */
// function getNotificationPathInstance(
//   path: string
// ): string {
//   try {
//     return String(
//       NotificationModel?.schema?.path(path)?.instance ??
//         ""
//     );
//   } catch {
//     return "";
//   }
// }
// /*
//   تحويل userId العام إلى Mongo _id
//   إذا كان NotificationModel يستخدم ObjectId.
// */
// async function resolveUserValue(
//   fieldName: string,
//   userId: string
// ) {
//   const instance =
//     getNotificationPathInstance(fieldName);
//   /*
//     إذا الحقل ObjectId نبحث عن المستخدم
//     ونستخدم _id الخاص به.
//   */
//   if (instance === "ObjectId") {
//     const user = await UserModel.findOne({
//       userId,
//     })
//       .select("_id userId username")
//       .lean();
//     return user?._id ?? null;
//   }
//   /*
//     إذا String نستخدم userId العام مباشرة.
//   */
//   return userId;
// }
// /*
//   إضافة قيمة فقط إذا كان الحقل موجودًا
//   داخل NotificationSchema.
// */
// function setIfPathExists(
//   target: Record<string, any>,
//   fieldName: string,
//   value: any
// ) {
//   if (
//     value !== undefined &&
//     value !== null &&
//     hasNotificationPath(fieldName)
//   ) {
//     target[fieldName] = value;
//   }
// }
// /*
//   تجهيز الإشعار بالشكل المناسب للموديل الحالي.
//   يدعم موديلات تستخدم:
//   recipient / sender
//   أو:
//   recipientUserId / senderUserId
//   أو:
//   toUserId / fromUserId
// */
// async function buildNotificationDocument(
//   input: CreateTweetNotificationInput
// ) {
//   const payload: Record<string, any> = {};
//   const notificationId =
//     `notification_${randomUUID()}`;
//   /*
//     ID الإشعار.
//   */
//   setIfPathExists(
//     payload,
//     "notificationId",
//     notificationId
//   );
//   setIfPathExists(
//     payload,
//     "id",
//     notificationId
//   );
//   /*
//     المستلم.
//   */
//   if (hasNotificationPath("recipient")) {
//     payload.recipient =
//       await resolveUserValue(
//         "recipient",
//         input.recipientUserId
//       );
//   }
//   if (
//     hasNotificationPath(
//       "recipientUserId"
//     )
//   ) {
//     payload.recipientUserId =
//       await resolveUserValue(
//         "recipientUserId",
//         input.recipientUserId
//       );
//   }
//   if (hasNotificationPath("toUserId")) {
//     payload.toUserId =
//       await resolveUserValue(
//         "toUserId",
//         input.recipientUserId
//       );
//   }
//   /*
//     بعض الموديلات تستخدم userId
//     ليكون صاحب الإشعار.
//   */
//   if (
//     hasNotificationPath("userId") &&
//     !hasNotificationPath("senderUserId")
//   ) {
//     payload.userId =
//       await resolveUserValue(
//         "userId",
//         input.recipientUserId
//       );
//   }
//   /*
//     المرسل.
//   */
//   if (hasNotificationPath("sender")) {
//     payload.sender =
//       await resolveUserValue(
//         "sender",
//         input.senderUserId
//       );
//   }
//   if (
//     hasNotificationPath(
//       "senderUserId"
//     )
//   ) {
//     payload.senderUserId =
//       await resolveUserValue(
//         "senderUserId",
//         input.senderUserId
//       );
//   }
//   if (hasNotificationPath("fromUserId")) {
//     payload.fromUserId =
//       await resolveUserValue(
//         "fromUserId",
//         input.senderUserId
//       );
//   }
//   /*
//     بيانات المرسل النصية، إذا كانت موجودة.
//   */
//   setIfPathExists(
//     payload,
//     "senderUsername",
//     input.senderUsername
//   );
//   setIfPathExists(
//     payload,
//     "username",
//     input.senderUsername
//   );
//   /*
//     نوع الإشعار.
//   */
//   setIfPathExists(
//     payload,
//     "type",
//     input.type
//   );
//   setIfPathExists(
//     payload,
//     "notificationType",
//     input.type
//   );
//   /*
//     عنوان الإشعار.
//   */
//   const title =
//     input.title || input.senderUsername;
//   setIfPathExists(
//     payload,
//     "title",
//     title
//   );
//   /*
//     نص الإشعار.
//   */
//   setIfPathExists(
//     payload,
//     "body",
//     input.body
//   );
//   setIfPathExists(
//     payload,
//     "message",
//     input.body
//   );
//   setIfPathExists(
//     payload,
//     "text",
//     input.body
//   );
//   /*
//     التويتة المرتبطة.
//   */
//   setIfPathExists(
//     payload,
//     "relatedTweet",
//     input.tweetId
//   );
//   setIfPathExists(
//     payload,
//     "tweetId",
//     input.tweetId
//   );
//   setIfPathExists(
//     payload,
//     "relatedTweetId",
//     input.tweetId
//   );
//   /*
//     التعليق المرتبط.
//   */
//   if (input.commentId) {
//     setIfPathExists(
//       payload,
//       "relatedMessage",
//       input.commentId
//     );
//     setIfPathExists(
//       payload,
//       "commentId",
//       input.commentId
//     );
//     setIfPathExists(
//       payload,
//       "relatedCommentId",
//       input.commentId
//     );
//   }
//   /*
//     حالة القراءة والحذف.
//   */
//   setIfPathExists(
//     payload,
//     "isRead",
//     false
//   );
//   setIfPathExists(
//     payload,
//     "read",
//     false
//   );
//   setIfPathExists(
//     payload,
//     "isDeleted",
//     false
//   );
//   setIfPathExists(
//     payload,
//     "deleted",
//     false
//   );
//   /*
//     Metadata إضافية.
//   */
//   const metadata = {
//     tweetId: input.tweetId,
//     commentId:
//       input.commentId || null,
//     senderUserId:
//       input.senderUserId,
//     senderUsername:
//       input.senderUsername,
//     notificationType:
//       input.type,
//     ...(input.metadata || {}),
//   };
//   setIfPathExists(
//     payload,
//     "metadata",
//     metadata
//   );
//   setIfPathExists(
//     payload,
//     "data",
//     metadata
//   );
//   return {
//     payload,
//     notificationId,
//   };
// }
// /*
//   تجهيز شكل ثابت يرسل إلى Flutter،
//   بغض النظر عن شكل الحقول داخل MongoDB.
// */
// function normalizeNotificationForSocket(
//   input: CreateTweetNotificationInput,
//   savedNotification: any,
//   notificationId: string
// ) {
//   const raw =
//     savedNotification?.toObject
//       ? savedNotification.toObject()
//       : savedNotification || {};
//   return {
//     ...raw,
//     notificationId:
//       raw.notificationId ||
//       raw.id ||
//       raw._id?.toString?.() ||
//       notificationId,
//     id:
//       raw.notificationId ||
//       raw.id ||
//       raw._id?.toString?.() ||
//       notificationId,
//     type: input.type,
//     title:
//       input.title ||
//       input.senderUsername,
//     body: input.body,
//     message: input.body,
//     recipientUserId:
//       input.recipientUserId,
//     senderUserId:
//       input.senderUserId,
//     senderUsername:
//       input.senderUsername,
//     tweetId:
//       input.tweetId,
//     relatedTweet:
//       input.tweetId,
//     commentId:
//       input.commentId || null,
//     relatedMessage:
//       input.commentId || null,
//     isRead: false,
//     isDeleted: false,
//     createdAt:
//       raw.createdAt ||
//       new Date().toISOString(),
//   };
// }
// /*
//   إنشاء إشعار وحفظه وإرساله Live.
// */
// export async function createTweetNotification(
//   input: CreateTweetNotificationInput
// ) {
//   const recipientUserId =
//     String(
//       input.recipientUserId || ""
//     ).trim();
//   const senderUserId =
//     String(
//       input.senderUserId || ""
//     ).trim();
//   const senderUsername =
//     String(
//       input.senderUsername || ""
//     ).trim();
//   const tweetId =
//     String(
//       input.tweetId || ""
//     ).trim();
//   const body =
//     String(
//       input.body || ""
//     ).trim();
//   /*
//     لا ننشئ إشعارًا بدون بيانات أساسية.
//   */
//   if (
//     !recipientUserId ||
//     !senderUserId ||
//     !tweetId ||
//     !body
//   ) {
//     console.log(
//       "[TWEET NOTIFICATION] Missing required data:",
//       {
//         recipientUserId,
//         senderUserId,
//         tweetId,
//         hasBody: Boolean(body),
//       }
//     );
//     return null;
//   }
//   /*
//     لا نرسل للمستخدم إشعارًا عن فعله على نفسه.
//   */
//   if (
//     recipientUserId === senderUserId
//   ) {
//     return null;
//   }
//   if (!NotificationModel) {
//     console.log(
//       "[TWEET NOTIFICATION] NotificationModel export not found"
//     );
//     return null;
//   }
//   try {
//     const {
//       payload,
//       notificationId,
//     } =
//       await buildNotificationDocument({
//         ...input,
//         recipientUserId,
//         senderUserId,
//         senderUsername,
//         tweetId,
//         body,
//       });
//     console.log(
//       "[TWEET NOTIFICATION] Creating:",
//       {
//         type: input.type,
//         recipientUserId,
//         senderUserId,
//         tweetId,
//         commentId:
//           input.commentId || null,
//         schemaFields:
//           Object.keys(
//             NotificationModel.schema
//               ?.paths || {}
//           ),
//         payloadFields:
//           Object.keys(payload),
//       }
//     );
//     const savedNotification =
//       await NotificationModel.create(
//         payload
//       );
//     const notification =
//       normalizeNotificationForSocket(
//         {
//           ...input,
//           recipientUserId,
//           senderUserId,
//           senderUsername,
//           tweetId,
//           body,
//         },
//         savedNotification,
//         notificationId
//       );
//     /*
//       إرسال مباشر للمستخدم إذا كان متصلًا.
//     */
//     sendToUserIfOnline(
//       recipientUserId,
//       {
//         handler:
//           "notification_event",
//         type: "new",
//         notification,
//         /*
//           حقول إضافية لتسهيل استقبال Flutter.
//         */
//         notificationId:
//           notification.notificationId,
//         notificationType:
//           input.type,
//         recipientUserId,
//         senderUserId,
//         senderUsername,
//         tweetId,
//         commentId:
//           input.commentId || null,
//         title:
//           notification.title,
//         body:
//           notification.body,
//         createdAt:
//           notification.createdAt,
//       }
//     );
//     console.log(
//       "[TWEET NOTIFICATION] Created successfully:",
//       {
//         notificationId:
//           notification.notificationId,
//         type: input.type,
//         recipientUserId,
//         tweetId,
//       }
//     );
//     return notification;
//   } catch (error: any) {
//     console.log(
//       "[TWEET NOTIFICATION ERROR]",
//       {
//         type: input.type,
//         recipientUserId,
//         senderUserId,
//         tweetId,
//         commentId:
//           input.commentId || null,
//         message:
//           error?.message,
//         name:
//           error?.name,
//         errors:
//           error?.errors,
//         stack:
//           error?.stack,
//       }
//     );
//     /*
//       فشل الإشعار لا يجب أن يفشل
//       الإعجاب أو التعليق أو الريتويت.
//     */
//     return null;
//   }
// }
const crypto_1 = require("crypto");
const NotificationModule = __importStar(require("../../models/Notification.model"));
const User_model_1 = require("../../models/User.model");
const clients_store_1 = require("../../websocket/stores/clients.store");
const ephemeralExpiry_redis_1 = require("../../services/expiry/ephemeralExpiry.redis");
/*
  يدعم الحالتين:

  export const NotificationModel = ...
  أو:
  export default NotificationModel
*/
const NotificationModel = NotificationModule.NotificationModel ??
    NotificationModule.default;
/*
  أنواع إشعارات التويتات.
*/
exports.TWEET_NOTIFICATION_TYPES = [
    "tweet_like",
    "tweet_comment",
    "tweet_retweet",
    "tweet_mention",
    "comment_mention",
];
function cleanValue(value) {
    return String(value ?? "").trim();
}
function isTweetNotificationType(value) {
    return exports.TWEET_NOTIFICATION_TYPES.includes(value);
}
/*
  التحقق هل الحقل موجود داخل NotificationSchema.
*/
function hasNotificationPath(path) {
    try {
        return Boolean(NotificationModel?.schema?.path(path));
    }
    catch {
        return false;
    }
}
/*
  معرفة نوع الحقل داخل Mongoose:
  String / ObjectId / Boolean ...
*/
function getNotificationPathInstance(path) {
    try {
        return String(NotificationModel?.schema?.path(path)?.instance ?? "");
    }
    catch {
        return "";
    }
}
/*
  تحويل userId العام إلى Mongo _id
  إذا كان NotificationModel يستخدم ObjectId.
*/
async function resolveUserValue(fieldName, userId) {
    const instance = getNotificationPathInstance(fieldName);
    if (instance === "ObjectId") {
        const user = await User_model_1.UserModel.findOne({
            userId,
        })
            .select("_id userId username")
            .lean();
        return user?._id ?? null;
    }
    return userId;
}
/*
  إضافة قيمة فقط إذا كان الحقل موجودًا
  داخل NotificationSchema.
*/
function setIfPathExists(target, fieldName, value) {
    if (value !== undefined &&
        value !== null &&
        hasNotificationPath(fieldName)) {
        target[fieldName] =
            value;
    }
}
/*
  إرجاع حقل صاحب الإشعار المناسب للموديل.
*/
async function buildRecipientQuery(recipientUserId) {
    if (hasNotificationPath("recipientUserId")) {
        return {
            recipientUserId: await resolveUserValue("recipientUserId", recipientUserId),
        };
    }
    if (hasNotificationPath("recipient")) {
        return {
            recipient: await resolveUserValue("recipient", recipientUserId),
        };
    }
    if (hasNotificationPath("toUserId")) {
        return {
            toUserId: await resolveUserValue("toUserId", recipientUserId),
        };
    }
    if (hasNotificationPath("userId")) {
        return {
            userId: await resolveUserValue("userId", recipientUserId),
        };
    }
    return {};
}
/*
  إرجاع حقل مرسل الإشعار المناسب للموديل.
*/
async function buildSenderQuery(senderUserId) {
    if (hasNotificationPath("senderUserId")) {
        return {
            senderUserId: await resolveUserValue("senderUserId", senderUserId),
        };
    }
    if (hasNotificationPath("sender")) {
        return {
            sender: await resolveUserValue("sender", senderUserId),
        };
    }
    if (hasNotificationPath("fromUserId")) {
        return {
            fromUserId: await resolveUserValue("fromUserId", senderUserId),
        };
    }
    return {};
}
/*
  إرجاع حقل التويتة المناسب للموديل.
*/
function buildTweetQuery(tweetId) {
    if (hasNotificationPath("tweetId")) {
        return {
            tweetId,
        };
    }
    if (hasNotificationPath("relatedTweet")) {
        return {
            relatedTweet: tweetId,
        };
    }
    if (hasNotificationPath("relatedTweetId")) {
        return {
            relatedTweetId: tweetId,
        };
    }
    if (hasNotificationPath("metadata")) {
        return {
            "metadata.tweetId": tweetId,
        };
    }
    if (hasNotificationPath("data")) {
        return {
            "data.tweetId": tweetId,
        };
    }
    return {};
}
/*
  إرجاع حقل نوع الإشعار المناسب للموديل.
*/
function buildTypeQuery(type) {
    if (hasNotificationPath("type")) {
        return {
            type,
        };
    }
    if (hasNotificationPath("notificationType")) {
        return {
            notificationType: type,
        };
    }
    return {};
}
/*
  استخراج ID الإشعار بغض النظر عن شكل الموديل.
*/
function getNotificationId(notification) {
    return cleanValue(notification?.notificationId ??
        notification?.id ??
        notification?._id);
}
/*
  جلب صورة المرسل إذا لم تُرسل للدالة.
*/
async function resolveSenderPhotoUrl(senderUserId, providedPhotoUrl) {
    if (providedPhotoUrl) {
        return providedPhotoUrl;
    }
    try {
        const sender = await User_model_1.UserModel.findOne({
            userId: senderUserId,
        })
            .select("photoUrl")
            .lean();
        return cleanValue(sender?.photoUrl);
    }
    catch (error) {
        console.error("[TWEET NOTIFICATION SENDER PHOTO ERROR]", {
            senderUserId,
            error,
        });
        return "";
    }
}
/*
  تجهيز الإشعار بالشكل المناسب للموديل الحالي.

  يدعم موديلات تستخدم:
  recipient / sender
  أو:
  recipientUserId / senderUserId
  أو:
  toUserId / fromUserId
*/
async function buildNotificationDocument(input) {
    const payload = {};
    const notificationId = `notification_${(0, crypto_1.randomUUID)()}`;
    setIfPathExists(payload, "notificationId", notificationId);
    setIfPathExists(payload, "id", notificationId);
    /*
      المستلم.
    */
    if (hasNotificationPath("recipient")) {
        payload.recipient =
            await resolveUserValue("recipient", input.recipientUserId);
    }
    if (hasNotificationPath("recipientUserId")) {
        payload.recipientUserId =
            await resolveUserValue("recipientUserId", input.recipientUserId);
    }
    if (hasNotificationPath("toUserId")) {
        payload.toUserId =
            await resolveUserValue("toUserId", input.recipientUserId);
    }
    if (hasNotificationPath("userId") &&
        !hasNotificationPath("senderUserId")) {
        payload.userId =
            await resolveUserValue("userId", input.recipientUserId);
    }
    /*
      المرسل.
    */
    if (hasNotificationPath("sender")) {
        payload.sender =
            await resolveUserValue("sender", input.senderUserId);
    }
    if (hasNotificationPath("senderUserId")) {
        payload.senderUserId =
            await resolveUserValue("senderUserId", input.senderUserId);
    }
    if (hasNotificationPath("fromUserId")) {
        payload.fromUserId =
            await resolveUserValue("fromUserId", input.senderUserId);
    }
    /*
      بيانات المرسل.
    */
    setIfPathExists(payload, "senderUsername", input.senderUsername);
    setIfPathExists(payload, "username", input.senderUsername);
    setIfPathExists(payload, "senderPhotoUrl", input.senderPhotoUrl ?? "");
    setIfPathExists(payload, "photoUrl", input.senderPhotoUrl ?? "");
    /*
      نوع الإشعار.
    */
    setIfPathExists(payload, "type", input.type);
    setIfPathExists(payload, "notificationType", input.type);
    /*
      العنوان.
    */
    const title = input.title ||
        input.senderUsername;
    setIfPathExists(payload, "title", title);
    /*
      نص الإشعار.
    */
    setIfPathExists(payload, "body", input.body);
    setIfPathExists(payload, "message", input.body);
    setIfPathExists(payload, "text", input.body);
    /*
      التويتة.
    */
    setIfPathExists(payload, "relatedTweet", input.tweetId);
    setIfPathExists(payload, "tweetId", input.tweetId);
    setIfPathExists(payload, "relatedTweetId", input.tweetId);
    /*
      التعليق.
    */
    if (input.commentId) {
        setIfPathExists(payload, "relatedMessage", input.commentId);
        setIfPathExists(payload, "commentId", input.commentId);
        setIfPathExists(payload, "relatedCommentId", input.commentId);
    }
    /*
      حالة القراءة والحذف.
    */
    setIfPathExists(payload, "isRead", false);
    setIfPathExists(payload, "read", false);
    setIfPathExists(payload, "isDeleted", false);
    setIfPathExists(payload, "deleted", false);
    setIfPathExists(payload, "readAt", null);
    /*
      Metadata إضافية.
    */
    const metadata = {
        tweetId: input.tweetId,
        commentId: input.commentId ||
            null,
        senderUserId: input.senderUserId,
        senderUsername: input.senderUsername,
        senderPhotoUrl: input.senderPhotoUrl ||
            "",
        notificationType: input.type,
        ...(input.metadata || {}),
    };
    setIfPathExists(payload, "metadata", metadata);
    setIfPathExists(payload, "data", metadata);
    return {
        payload,
        notificationId,
    };
}
/*
  تجهيز شكل ثابت يرسل إلى Flutter.
*/
function normalizeNotificationForSocket(input, savedNotification, notificationId) {
    const raw = savedNotification?.toObject
        ? savedNotification.toObject()
        : savedNotification || {};
    const finalNotificationId = getNotificationId(raw) || notificationId;
    return {
        ...raw,
        notificationId: finalNotificationId,
        id: finalNotificationId,
        type: input.type,
        notificationType: input.type,
        title: input.title ||
            input.senderUsername,
        body: input.body,
        message: input.body,
        recipientUserId: input.recipientUserId,
        senderUserId: input.senderUserId,
        senderUsername: input.senderUsername,
        senderPhotoUrl: input.senderPhotoUrl ||
            "",
        tweetId: input.tweetId,
        relatedTweet: input.tweetId,
        commentId: input.commentId ||
            null,
        relatedMessage: input.commentId ||
            null,
        isRead: false,
        isDeleted: false,
        createdAt: raw.createdAt ||
            new Date().toISOString(),
    };
}
/*
  تسجيل الإشعار في Redis ليتم حذفه
  تلقائيًا بعد 48 ساعة.
*/
async function safelyScheduleNotificationExpiry(notificationIdValue) {
    const notificationId = cleanValue(notificationIdValue);
    if (!notificationId) {
        return;
    }
    try {
        /*
          إزالة الموعد السابق إذا وجد.
        */
        await (0, ephemeralExpiry_redis_1.cancelTweetNotificationExpiry)(notificationId);
        await (0, ephemeralExpiry_redis_1.scheduleTweetNotificationExpiry)(notificationId);
        console.log("[TWEET NOTIFICATION EXPIRY SCHEDULED]", {
            notificationId,
        });
    }
    catch (error) {
        /*
          فشل Redis لا يمنع إنشاء الإشعار.
        */
        console.error("[TWEET NOTIFICATION EXPIRY ERROR]", {
            notificationId,
            error,
        });
    }
}
/*
  إنشاء إشعار وحفظه وإرساله Live.
*/
async function createTweetNotification(input) {
    const recipientUserId = cleanValue(input.recipientUserId);
    const senderUserId = cleanValue(input.senderUserId);
    const senderUsername = cleanValue(input.senderUsername);
    const providedSenderPhotoUrl = cleanValue(input.senderPhotoUrl);
    const type = cleanValue(input.type);
    const tweetId = cleanValue(input.tweetId);
    const commentId = cleanValue(input.commentId);
    const body = cleanValue(input.body);
    /*
      لا ننشئ إشعارًا بدون بيانات أساسية.
    */
    if (!recipientUserId ||
        !senderUserId ||
        !tweetId ||
        !body) {
        console.log("[TWEET NOTIFICATION] Missing required data:", {
            recipientUserId,
            senderUserId,
            tweetId,
            hasBody: Boolean(body),
        });
        return null;
    }
    /*
      لا نرسل للمستخدم إشعارًا عن فعله على نفسه.
    */
    if (recipientUserId ===
        senderUserId) {
        return null;
    }
    if (!isTweetNotificationType(type)) {
        console.error("[TWEET NOTIFICATION] Invalid type:", {
            type,
        });
        return null;
    }
    if (!NotificationModel) {
        console.log("[TWEET NOTIFICATION] NotificationModel export not found");
        return null;
    }
    const senderPhotoUrl = await resolveSenderPhotoUrl(senderUserId, providedSenderPhotoUrl);
    try {
        const { payload, notificationId, } = await buildNotificationDocument({
            ...input,
            recipientUserId,
            senderUserId,
            senderUsername,
            senderPhotoUrl,
            type,
            tweetId,
            commentId,
            body,
        });
        console.log("[TWEET NOTIFICATION] Creating:", {
            type,
            recipientUserId,
            senderUserId,
            tweetId,
            commentId: commentId ||
                null,
            schemaFields: Object.keys(NotificationModel.schema
                ?.paths || {}),
            payloadFields: Object.keys(payload),
        });
        const savedNotification = await NotificationModel.create(payload);
        const notification = normalizeNotificationForSocket({
            ...input,
            recipientUserId,
            senderUserId,
            senderUsername,
            senderPhotoUrl,
            type,
            tweetId,
            commentId,
            body,
        }, savedNotification, notificationId);
        /*
          حذف الإشعار تلقائيًا بعد 48 ساعة.
        */
        await safelyScheduleNotificationExpiry(notification.notificationId);
        /*
          إرسال مباشر للمستخدم إذا كان متصلًا.
        */
        const socketPayload = {
            handler: "notification_event",
            type: "new",
            notification,
            notificationId: notification.notificationId,
            notificationType: type,
            recipientUserId,
            senderUserId,
            senderUsername,
            senderPhotoUrl,
            tweetId,
            commentId: commentId || null,
            title: notification.title,
            body: notification.body,
            createdAt: notification.createdAt,
        };
        console.log("[TWEET NOTIFICATION SOCKET SEND]", {
            recipientUserId,
            payload: socketPayload,
        });
        const sent = (0, clients_store_1.sendToUserIfOnline)(recipientUserId, socketPayload);
        console.log("[TWEET NOTIFICATION SOCKET RESULT]", {
            recipientUserId,
            sent,
        });
        console.log("[TWEET NOTIFICATION] Created successfully:", {
            notificationId: notification.notificationId,
            type,
            recipientUserId,
            tweetId,
        });
        return notification;
    }
    catch (error) {
        console.log("[TWEET NOTIFICATION ERROR]", {
            type,
            recipientUserId,
            senderUserId,
            tweetId,
            commentId: commentId ||
                null,
            message: error?.message,
            name: error?.name,
            errors: error?.errors,
            stack: error?.stack,
        });
        /*
          فشل الإشعار لا يجب أن يفشل
          الإعجاب أو التعليق أو الريتويت.
        */
        return null;
    }
}
/*
  بناء query لإشعار تفاعل معين.
*/
async function buildReactionNotificationQuery(input) {
    const recipientQuery = await buildRecipientQuery(input.recipientUserId);
    const senderQuery = await buildSenderQuery(input.senderUserId);
    const tweetQuery = buildTweetQuery(input.tweetId);
    const typeQuery = buildTypeQuery(input.type);
    return {
        ...recipientQuery,
        ...senderQuery,
        ...tweetQuery,
        ...typeQuery,
    };
}
/*
  حذف إشعار Like عندما يلغي المستخدم اللايك.
*/
async function deleteTweetLikeNotification(input) {
    const recipientUserId = cleanValue(input.recipientUserId);
    const senderUserId = cleanValue(input.senderUserId);
    const tweetId = cleanValue(input.tweetId);
    if (!recipientUserId ||
        !senderUserId ||
        !tweetId) {
        return {
            ok: false,
            reason: "invalid_notification_delete_input",
        };
    }
    const query = await buildReactionNotificationQuery({
        recipientUserId,
        senderUserId,
        tweetId,
        type: "tweet_like",
    });
    const deleted = await NotificationModel.findOneAndDelete(query).lean();
    const notificationId = getNotificationId(deleted);
    if (notificationId) {
        try {
            await (0, ephemeralExpiry_redis_1.cancelTweetNotificationExpiry)(notificationId);
        }
        catch (error) {
            console.error("[DELETE LIKE NOTIFICATION REDIS ERROR]", {
                notificationId,
                error,
            });
        }
    }
    return {
        ok: true,
        notificationId: notificationId ||
            null,
    };
}
/*
  حذف إشعار Retweet عندما يلغي المستخدم الريتويت.
*/
async function deleteTweetRetweetNotification(input) {
    const recipientUserId = cleanValue(input.recipientUserId);
    const senderUserId = cleanValue(input.senderUserId);
    const tweetId = cleanValue(input.tweetId);
    if (!recipientUserId ||
        !senderUserId ||
        !tweetId) {
        return {
            ok: false,
            reason: "invalid_notification_delete_input",
        };
    }
    const query = await buildReactionNotificationQuery({
        recipientUserId,
        senderUserId,
        tweetId,
        type: "tweet_retweet",
    });
    const deleted = await NotificationModel.findOneAndDelete(query).lean();
    const notificationId = getNotificationId(deleted);
    if (notificationId) {
        try {
            await (0, ephemeralExpiry_redis_1.cancelTweetNotificationExpiry)(notificationId);
        }
        catch (error) {
            console.error("[DELETE RETWEET NOTIFICATION REDIS ERROR]", {
                notificationId,
                error,
            });
        }
    }
    return {
        ok: true,
        notificationId: notificationId ||
            null,
    };
}
/*
  حذف جميع إشعارات تويتة معينة.

  تستخدم عند حذف التويتة يدويًا أو تلقائيًا.
*/
async function deleteAllTweetNotifications(tweetIdValue) {
    const tweetId = cleanValue(tweetIdValue);
    if (!tweetId) {
        return {
            ok: false,
            reason: "tweet_id_required",
        };
    }
    const tweetQuery = buildTweetQuery(tweetId);
    const typeQuery = buildTypeQuery({
        $in: exports.TWEET_NOTIFICATION_TYPES,
    });
    const query = {
        ...tweetQuery,
        ...typeQuery,
    };
    const notifications = await NotificationModel.find(query)
        .select("notificationId id")
        .lean();
    await NotificationModel.deleteMany(query);
    for (const notification of notifications) {
        const notificationId = getNotificationId(notification);
        if (!notificationId) {
            continue;
        }
        try {
            await (0, ephemeralExpiry_redis_1.cancelTweetNotificationExpiry)(notificationId);
        }
        catch (error) {
            console.error("[DELETE ALL TWEET NOTIFICATIONS REDIS ERROR]", {
                notificationId,
                tweetId,
                error,
            });
        }
    }
    return {
        ok: true,
        deletedCount: notifications.length,
    };
}
//# sourceMappingURL=tweets.notifications.js.map