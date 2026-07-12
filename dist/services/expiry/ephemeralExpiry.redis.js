"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EPHEMERAL_TTL_SECONDS = void 0;
exports.scheduleTweetExpiry = scheduleTweetExpiry;
exports.cancelTweetExpiry = cancelTweetExpiry;
exports.scheduleTweetNotificationExpiry = scheduleTweetNotificationExpiry;
exports.cancelTweetNotificationExpiry = cancelTweetNotificationExpiry;
exports.getExpiredTweetIds = getExpiredTweetIds;
exports.getExpiredTweetNotificationIds = getExpiredTweetNotificationIds;
exports.removeExpiredTweetId = removeExpiredTweetId;
exports.removeExpiredTweetNotificationId = removeExpiredTweetNotificationId;
const redis_1 = require("../../database/redis");
exports.EPHEMERAL_TTL_SECONDS = 60 * 60 * 48;
const TWEETS_EXPIRY_KEY = "expiry:tweets";
const NOTIFICATIONS_EXPIRY_KEY = "expiry:tweet-notifications";
function expiryTimestamp() {
    return (Date.now() +
        exports.EPHEMERAL_TTL_SECONDS * 1000);
}
/*
  تسجيل تويتة ليتم حذفها بعد 48 ساعة.
*/
async function scheduleTweetExpiry(tweetId) {
    const cleanTweetId = String(tweetId || "").trim();
    if (!cleanTweetId) {
        return;
    }
    await redis_1.redis.zadd(TWEETS_EXPIRY_KEY, expiryTimestamp(), cleanTweetId);
}
/*
  إلغاء تسجيل التويتة لو حُذفت يدويًا.
*/
async function cancelTweetExpiry(tweetId) {
    const cleanTweetId = String(tweetId || "").trim();
    if (!cleanTweetId) {
        return;
    }
    await redis_1.redis.zrem(TWEETS_EXPIRY_KEY, cleanTweetId);
}
/*
  تسجيل إشعار تويتة ليتم حذفه بعد 48 ساعة.
*/
async function scheduleTweetNotificationExpiry(notificationId) {
    const cleanNotificationId = String(notificationId || "").trim();
    if (!cleanNotificationId) {
        return;
    }
    await redis_1.redis.zadd(NOTIFICATIONS_EXPIRY_KEY, expiryTimestamp(), cleanNotificationId);
}
/*
  إلغاء تسجيل الإشعار عند فتحه وحذفه فورًا.
*/
async function cancelTweetNotificationExpiry(notificationId) {
    const cleanNotificationId = String(notificationId || "").trim();
    if (!cleanNotificationId) {
        return;
    }
    await redis_1.redis.zrem(NOTIFICATIONS_EXPIRY_KEY, cleanNotificationId);
}
async function getExpiredTweetIds(limit = 100) {
    const now = Date.now();
    return redis_1.redis.zrangebyscore(TWEETS_EXPIRY_KEY, 0, now, "LIMIT", 0, limit);
}
async function getExpiredTweetNotificationIds(limit = 200) {
    const now = Date.now();
    return redis_1.redis.zrangebyscore(NOTIFICATIONS_EXPIRY_KEY, 0, now, "LIMIT", 0, limit);
}
async function removeExpiredTweetId(tweetId) {
    await redis_1.redis.zrem(TWEETS_EXPIRY_KEY, tweetId);
}
async function removeExpiredTweetNotificationId(notificationId) {
    await redis_1.redis.zrem(NOTIFICATIONS_EXPIRY_KEY, notificationId);
}
//# sourceMappingURL=ephemeralExpiry.redis.js.map