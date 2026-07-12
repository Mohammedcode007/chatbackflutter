"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runEphemeralCleanup = runEphemeralCleanup;
exports.startEphemeralCleanupWorker = startEphemeralCleanupWorker;
exports.stopEphemeralCleanupWorker = stopEphemeralCleanupWorker;
const Tweet_model_1 = require("../../models/Tweet.model");
const TweetComment_model_1 = require("../../models/TweetComment.model");
const TweetLike_model_1 = require("../../models/TweetLike.model");
const TweetRetweet_model_1 = require("../../models/TweetRetweet.model");
const TweetView_model_1 = require("../../models/TweetView.model");
const Notification_model_1 = require("../../models/Notification.model");
const tweets_media_service_1 = require("../../modules/tweets/tweets.media.service");
const ephemeralExpiry_redis_1 = require("./ephemeralExpiry.redis");
const CLEANUP_INTERVAL_MS = 30 * 1000;
let cleanupTimer = null;
let cleanupRunning = false;
const TWEET_NOTIFICATION_TYPES = [
    "tweet_like",
    "tweet_retweet",
    "tweet_comment",
    "tweet_mention",
    "comment_mention",
];
async function permanentlyDeleteExpiredTweet(tweetId) {
    const tweet = await Tweet_model_1.TweetModel.findOne({
        tweetId,
    }).lean();
    /*
      لو التويتة غير موجودة، نحذفها فقط من Redis.
    */
    if (!tweet) {
        await (0, ephemeralExpiry_redis_1.removeExpiredTweetId)(tweetId);
        return;
    }
    const media = Array.isArray(tweet.media)
        ? tweet.media.map((item) => ({
            type: item?.type,
            publicId: item?.publicId ??
                item?.public_id,
        }))
        : [];
    /*
      حذف بيانات التويتة المرتبطة.
    */
    await Promise.all([
        TweetComment_model_1.TweetCommentModel.deleteMany({
            tweetId,
        }),
        TweetLike_model_1.TweetLikeModel.deleteMany({
            tweetId,
        }),
        TweetRetweet_model_1.TweetRetweetModel.deleteMany({
            tweetId,
        }),
        TweetView_model_1.TweetViewModel.deleteMany({
            tweetId,
        }),
        /*
          حذف جميع إشعارات هذه التويتة.
        */
        Notification_model_1.NotificationModel.deleteMany({
            tweetId,
            type: {
                $in: TWEET_NOTIFICATION_TYPES,
            },
        }),
    ]);
    await Tweet_model_1.TweetModel.deleteOne({
        tweetId,
    });
    /*
      حذف ملفات Cloudinary.
      فشل حذف الملف لا يعيد التويتة.
    */
    try {
        await (0, tweets_media_service_1.deleteTweetMediaList)(media);
    }
    catch (error) {
        console.error("[EXPIRED TWEET MEDIA DELETE ERROR]", {
            tweetId,
            error,
        });
    }
    await (0, ephemeralExpiry_redis_1.removeExpiredTweetId)(tweetId);
    console.log(`[EXPIRED TWEET DELETED] ${tweetId}`);
}
async function permanentlyDeleteExpiredNotification(notificationId) {
    /*
      نتأكد أنها من إشعارات التويتات فقط.
    */
    await Notification_model_1.NotificationModel.deleteOne({
        notificationId,
        type: {
            $in: TWEET_NOTIFICATION_TYPES,
        },
    });
    await (0, ephemeralExpiry_redis_1.removeExpiredTweetNotificationId)(notificationId);
    console.log(`[EXPIRED TWEET NOTIFICATION DELETED] ${notificationId}`);
}
async function runEphemeralCleanup() {
    if (cleanupRunning) {
        return;
    }
    cleanupRunning = true;
    try {
        /*
          نستمر على دفعات حتى ننتهي من العناصر المستحقة.
        */
        while (true) {
            const expiredTweetIds = await (0, ephemeralExpiry_redis_1.getExpiredTweetIds)(100);
            if (expiredTweetIds.length === 0) {
                break;
            }
            for (const tweetId of expiredTweetIds) {
                try {
                    await permanentlyDeleteExpiredTweet(tweetId);
                }
                catch (error) {
                    console.error("[EXPIRED TWEET CLEANUP ERROR]", {
                        tweetId,
                        error,
                    });
                }
            }
        }
        while (true) {
            const expiredNotificationIds = await (0, ephemeralExpiry_redis_1.getExpiredTweetNotificationIds)(200);
            if (expiredNotificationIds.length ===
                0) {
                break;
            }
            for (const notificationId of expiredNotificationIds) {
                try {
                    await permanentlyDeleteExpiredNotification(notificationId);
                }
                catch (error) {
                    console.error("[EXPIRED NOTIFICATION CLEANUP ERROR]", {
                        notificationId,
                        error,
                    });
                }
            }
        }
    }
    finally {
        cleanupRunning = false;
    }
}
function startEphemeralCleanupWorker() {
    if (cleanupTimer) {
        return;
    }
    /*
      تنظيف مباشر عند تشغيل السيرفر.
    */
    void runEphemeralCleanup();
    cleanupTimer =
        setInterval(() => {
            void runEphemeralCleanup();
        }, CLEANUP_INTERVAL_MS);
    cleanupTimer.unref();
    console.log("Ephemeral cleanup worker started");
}
function stopEphemeralCleanupWorker() {
    if (!cleanupTimer) {
        return;
    }
    clearInterval(cleanupTimer);
    cleanupTimer = null;
}
//# sourceMappingURL=ephemeralExpiry.worker.js.map