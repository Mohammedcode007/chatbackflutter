"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationModel = exports.TWEET_NOTIFICATION_TYPES = void 0;
const mongoose_1 = require("mongoose");
exports.TWEET_NOTIFICATION_TYPES = [
    "tweet_like",
    "tweet_retweet",
    "tweet_comment",
    "tweet_mention",
    "comment_mention",
];
const NotificationSchema = new mongoose_1.Schema({
    notificationId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
    },
    /*
      المستخدم الذي سيستقبل الإشعار.
    */
    recipientUserId: {
        type: String,
        required: true,
        index: true,
        trim: true,
    },
    /*
      المستخدم الذي قام بالإعجاب أو التعليق
      أو الريتويت أو المنشن.
    */
    senderUserId: {
        type: String,
        required: true,
        index: true,
        trim: true,
    },
    senderUsername: {
        type: String,
        required: true,
        trim: true,
        default: "",
    },
    senderPhotoUrl: {
        type: String,
        trim: true,
        default: "",
    },
    type: {
        type: String,
        required: true,
        enum: exports.TWEET_NOTIFICATION_TYPES,
        index: true,
    },
    /*
      التويتة المرتبطة بالإشعار.
    */
    tweetId: {
        type: String,
        required: true,
        index: true,
        trim: true,
    },
    /*
      موجود فقط في إشعارات التعليق
      أو المنشن داخل تعليق.
    */
    commentId: {
        type: String,
        trim: true,
        default: "",
        index: true,
    },
    body: {
        type: String,
        required: true,
        trim: true,
        default: "",
    },
    /*
      يمكن الاحتفاظ به للتوافق مع الأكواد القديمة،
      لكن عندك سيتم حذف الإشعار عند فتحه.
    */
    isRead: {
        type: Boolean,
        default: false,
        index: true,
    },
    readAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
    versionKey: false,
    collection: "notifications",
    minimize: false,
    toJSON: {
        virtuals: true,
        transform(_doc, ret) {
            delete ret._id;
            return ret;
        },
    },
    toObject: {
        virtuals: true,
    },
});
/*
  جلب إشعارات المستخدم من الأحدث للأقدم.
*/
NotificationSchema.index({
    recipientUserId: 1,
    createdAt: -1,
});
/*
  جلب الإشعارات غير المقروءة.
*/
NotificationSchema.index({
    recipientUserId: 1,
    isRead: 1,
    createdAt: -1,
});
/*
  حذف أو جلب كل إشعارات تويتة معينة.
*/
NotificationSchema.index({
    tweetId: 1,
    type: 1,
});
/*
  منع تكرار بعض إشعارات التويتات.

  مثال:
  نفس المستخدم لا يرسل إشعار Like مكرر
  لنفس التويتة.

  partialFilterExpression يجعل المنع يعمل فقط
  على الأنواع التي يجب عدم تكرارها.
*/
NotificationSchema.index({
    recipientUserId: 1,
    senderUserId: 1,
    tweetId: 1,
    type: 1,
}, {
    unique: true,
    partialFilterExpression: {
        type: {
            $in: [
                "tweet_like",
                "tweet_retweet",
            ],
        },
    },
});
exports.NotificationModel = mongoose_1.models.Notification ??
    (0, mongoose_1.model)("Notification", NotificationSchema);
//# sourceMappingURL=Notification.model.js.map