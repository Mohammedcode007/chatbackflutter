import { TweetModel } from "../../models/Tweet.model";
import { TweetCommentModel } from "../../models/TweetComment.model";
import { TweetLikeModel } from "../../models/TweetLike.model";
import { TweetRetweetModel } from "../../models/TweetRetweet.model";
import { TweetViewModel } from "../../models/TweetView.model";
import { NotificationModel } from "../../models/Notification.model";

import {
  deleteTweetMediaList,
} from "../../modules/tweets/tweets.media.service";

import {
  getExpiredTweetIds,
  getExpiredTweetNotificationIds,
  removeExpiredTweetId,
  removeExpiredTweetNotificationId,
} from "./ephemeralExpiry.redis";

const CLEANUP_INTERVAL_MS =
  30 * 1000;

let cleanupTimer:
  NodeJS.Timeout | null = null;

let cleanupRunning = false;

const TWEET_NOTIFICATION_TYPES = [
  "tweet_like",
  "tweet_retweet",
  "tweet_comment",
  "tweet_mention",
  "comment_mention",
] as const;

async function permanentlyDeleteExpiredTweet(
  tweetId: string
) {
  const tweet =
    await TweetModel.findOne({
      tweetId,
    }).lean();

  /*
    لو التويتة غير موجودة، نحذفها فقط من Redis.
  */
  if (!tweet) {
    await removeExpiredTweetId(
      tweetId
    );

    return;
  }

  const media =
    Array.isArray(tweet.media)
      ? tweet.media.map(
          (item: any) => ({
            type:
              item?.type,

            publicId:
              item?.publicId ??
              item?.public_id,
          })
        )
      : [];

  /*
    حذف بيانات التويتة المرتبطة.
  */
  await Promise.all([
    TweetCommentModel.deleteMany({
      tweetId,
    }),

    TweetLikeModel.deleteMany({
      tweetId,
    }),

    TweetRetweetModel.deleteMany({
      tweetId,
    }),

    TweetViewModel.deleteMany({
      tweetId,
    }),

    /*
      حذف جميع إشعارات هذه التويتة.
    */
    NotificationModel.deleteMany({
      tweetId,

      type: {
        $in:
          TWEET_NOTIFICATION_TYPES,
      },
    }),
  ]);

  await TweetModel.deleteOne({
    tweetId,
  });

  /*
    حذف ملفات Cloudinary.
    فشل حذف الملف لا يعيد التويتة.
  */
  try {
    await deleteTweetMediaList(
      media
    );
  } catch (error) {
    console.error(
      "[EXPIRED TWEET MEDIA DELETE ERROR]",
      {
        tweetId,
        error,
      }
    );
  }

  await removeExpiredTweetId(
    tweetId
  );

  console.log(
    `[EXPIRED TWEET DELETED] ${tweetId}`
  );
}

async function permanentlyDeleteExpiredNotification(
  notificationId: string
) {
  /*
    نتأكد أنها من إشعارات التويتات فقط.
  */
  await NotificationModel.deleteOne({
    notificationId,

    type: {
      $in:
        TWEET_NOTIFICATION_TYPES,
    },
  });

  await removeExpiredTweetNotificationId(
    notificationId
  );

  console.log(
    `[EXPIRED TWEET NOTIFICATION DELETED] ${notificationId}`
  );
}

export async function runEphemeralCleanup() {
  if (cleanupRunning) {
    return;
  }

  cleanupRunning = true;

  try {
    /*
      نستمر على دفعات حتى ننتهي من العناصر المستحقة.
    */
    while (true) {
      const expiredTweetIds =
        await getExpiredTweetIds(
          100
        );

      if (
        expiredTweetIds.length === 0
      ) {
        break;
      }

      for (
        const tweetId of
        expiredTweetIds
      ) {
        try {
          await permanentlyDeleteExpiredTweet(
            tweetId
          );
        } catch (error) {
          console.error(
            "[EXPIRED TWEET CLEANUP ERROR]",
            {
              tweetId,
              error,
            }
          );
        }
      }
    }

    while (true) {
      const expiredNotificationIds =
        await getExpiredTweetNotificationIds(
          200
        );

      if (
        expiredNotificationIds.length ===
        0
      ) {
        break;
      }

      for (
        const notificationId of
        expiredNotificationIds
      ) {
        try {
          await permanentlyDeleteExpiredNotification(
            notificationId
          );
        } catch (error) {
          console.error(
            "[EXPIRED NOTIFICATION CLEANUP ERROR]",
            {
              notificationId,
              error,
            }
          );
        }
      }
    }
  } finally {
    cleanupRunning = false;
  }
}

export function startEphemeralCleanupWorker() {
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

  console.log(
    "Ephemeral cleanup worker started"
  );
}

export function stopEphemeralCleanupWorker() {
  if (!cleanupTimer) {
    return;
  }

  clearInterval(
    cleanupTimer
  );

  cleanupTimer = null;
}