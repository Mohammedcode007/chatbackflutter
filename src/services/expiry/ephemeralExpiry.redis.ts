import { redis } from "../../database/redis";

export const EPHEMERAL_TTL_SECONDS =
  60 * 60 * 48;

const TWEETS_EXPIRY_KEY =
  "expiry:tweets";

const NOTIFICATIONS_EXPIRY_KEY =
  "expiry:tweet-notifications";

function expiryTimestamp() {
  return (
    Date.now() +
    EPHEMERAL_TTL_SECONDS * 1000
  );
}

/*
  تسجيل تويتة ليتم حذفها بعد 48 ساعة.
*/
export async function scheduleTweetExpiry(
  tweetId: string
) {
  const cleanTweetId =
    String(tweetId || "").trim();

  if (!cleanTweetId) {
    return;
  }

  await redis.zadd(
    TWEETS_EXPIRY_KEY,
    expiryTimestamp(),
    cleanTweetId
  );
}

/*
  إلغاء تسجيل التويتة لو حُذفت يدويًا.
*/
export async function cancelTweetExpiry(
  tweetId: string
) {
  const cleanTweetId =
    String(tweetId || "").trim();

  if (!cleanTweetId) {
    return;
  }

  await redis.zrem(
    TWEETS_EXPIRY_KEY,
    cleanTweetId
  );
}

/*
  تسجيل إشعار تويتة ليتم حذفه بعد 48 ساعة.
*/
export async function scheduleTweetNotificationExpiry(
  notificationId: string
) {
  const cleanNotificationId =
    String(notificationId || "").trim();

  if (!cleanNotificationId) {
    return;
  }

  await redis.zadd(
    NOTIFICATIONS_EXPIRY_KEY,
    expiryTimestamp(),
    cleanNotificationId
  );
}

/*
  إلغاء تسجيل الإشعار عند فتحه وحذفه فورًا.
*/
export async function cancelTweetNotificationExpiry(
  notificationId: string
) {
  const cleanNotificationId =
    String(notificationId || "").trim();

  if (!cleanNotificationId) {
    return;
  }

  await redis.zrem(
    NOTIFICATIONS_EXPIRY_KEY,
    cleanNotificationId
  );
}

export async function getExpiredTweetIds(
  limit = 100
) {
  const now = Date.now();

  return redis.zrangebyscore(
    TWEETS_EXPIRY_KEY,
    0,
    now,
    "LIMIT",
    0,
    limit
  );
}

export async function getExpiredTweetNotificationIds(
  limit = 200
) {
  const now = Date.now();

  return redis.zrangebyscore(
    NOTIFICATIONS_EXPIRY_KEY,
    0,
    now,
    "LIMIT",
    0,
    limit
  );
}

export async function removeExpiredTweetId(
  tweetId: string
) {
  await redis.zrem(
    TWEETS_EXPIRY_KEY,
    tweetId
  );
}

export async function removeExpiredTweetNotificationId(
  notificationId: string
) {
  await redis.zrem(
    NOTIFICATIONS_EXPIRY_KEY,
    notificationId
  );
}