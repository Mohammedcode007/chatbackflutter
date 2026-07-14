

import { randomUUID } from "crypto";

import { TweetModel } from "../../models/Tweet.model";
import { TweetCommentModel } from "../../models/TweetComment.model";
import { TweetLikeModel } from "../../models/TweetLike.model";
import { TweetRetweetModel } from "../../models/TweetRetweet.model";
import { TweetViewModel } from "../../models/TweetView.model";
import { UserModel } from "../../models/User.model";

import {
  clampLimit,
  cleanId,
  cleanText,
  normalizeMediaItem,
  parseCursor,
  publicTweetUser,
  resolveMentionedUsers,
  TWEET_COMMENT_MAX_LENGTH,
  TWEET_COOLDOWN_MS,
  TWEET_MAX_IMAGES,
  TWEET_MAX_TEXT_LENGTH,
  type NormalizedTweetMediaItem,
} from "./tweets.utils";

import {
  deleteTweetMediaList,
  uploadTweetMediaList,
  type UploadedTweetMedia,
} from "./tweets.media.service";
import {
  createTweetNotification,
  deleteTweetLikeNotification,
  deleteTweetRetweetNotification,
  deleteAllTweetNotifications,
} from "./tweets.notifications";

import {
  scheduleTweetExpiry,
  cancelTweetExpiry,
} from "../../services/expiry/ephemeralExpiry.redis";

type RawTweetMediaItem = {
  type?: unknown;

  url?: unknown;

  publicId?: unknown;
  public_id?: unknown;

  thumbnailUrl?: unknown;
  thumbnail_url?: unknown;

  width?: unknown;
  height?: unknown;
  duration?: unknown;

  base64?: unknown;

  fileName?: unknown;
  file_name?: unknown;

  mimeType?: unknown;
  mime_type?: unknown;
};

function isObject(
  value: unknown
): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

function normalizeRawMediaType(
  value: unknown
): "image" | "video" | "" {
  const type =
    cleanText(value).toLowerCase();

  if (
    type === "image" ||
    type === "video"
  ) {
    return type;
  }

  return "";
}

function hasBase64Media(
  value: unknown
): boolean {
  if (!isObject(value)) {
    return false;
  }

  return cleanText(
    value.base64
  ).length > 0;
}

function hasUrlMedia(
  value: unknown
): boolean {
  if (!isObject(value)) {
    return false;
  }

  return cleanText(
    value.url
  ).length > 0;
}

function validateRawTweetMedia(
  rawMedia: unknown[]
):
  | {
      ok: true;
      imageCount: number;
      videoCount: number;
    }
  | {
      ok: false;
      reason: string;
    } {
  if (rawMedia.length === 0) {
    return {
      ok: true,
      imageCount: 0,
      videoCount: 0,
    };
  }

  let imageCount = 0;
  let videoCount = 0;

  for (const item of rawMedia) {
    if (!isObject(item)) {
      return {
        ok: false,
        reason:
          "invalid_tweet_media_item",
      };
    }

    const type =
      normalizeRawMediaType(
        item.type
      );

    if (!type) {
      return {
        ok: false,
        reason:
          "invalid_tweet_media_type",
      };
    }

    const hasBase64 =
      hasBase64Media(item);

    const hasUrl =
      hasUrlMedia(item);

    if (!hasBase64 && !hasUrl) {
      return {
        ok: false,
        reason:
          "tweet_media_source_required",
      };
    }

    if (type === "image") {
      imageCount += 1;
    } else {
      videoCount += 1;
    }
  }

  if (
    imageCount > 0 &&
    videoCount > 0
  ) {
    return {
      ok: false,
      reason:
        "cannot_mix_images_and_video",
    };
  }

  if (
    imageCount >
    TWEET_MAX_IMAGES
  ) {
    return {
      ok: false,
      reason:
        "too_many_tweet_images",
    };
  }

  if (videoCount > 1) {
    return {
      ok: false,
      reason:
        "only_one_video_allowed",
    };
  }

  return {
    ok: true,
    imageCount,
    videoCount,
  };
}

function uploadedMediaToNormalized(
  item: UploadedTweetMedia
): NormalizedTweetMediaItem {
  return {
    type: item.type,

    url: item.url,

    publicId:
      item.publicId,

    thumbnailUrl:
      item.thumbnailUrl,

    width:
      item.width,

    height:
      item.height,

    duration:
      item.duration,
  };
}

async function getTweetAuthor(
  userId: string
) {
  return UserModel.findOne({
    userId,
  })
    .select(
      [
        "userId",
        "username",
        "photoUrl",
        "accountColor",
        "badgeKey",
        "badgeName",
        "badgeValue",
        "verificationType",
        "inventory",
      ].join(" ")
    )
    .lean();
}

async function buildTweetResponse(
  input: {
    tweet: any;
    viewerUserId: string;
    retweetBy?: any | null;
    feedItemId?: string;
    feedCreatedAt?: Date | string | null;
  }
) {
  const {
    tweet,
    viewerUserId,
    retweetBy,
    feedItemId,
    feedCreatedAt,
  } = input;

  /*
    نحصل على رتبة المستخدم الذي يشاهد التويتة.
    الإدمن والأونر يستطيعان حذف أي تويتة.
  */
  const [
    author,
    viewer,
    like,
    retweet,
  ] = await Promise.all([
    getTweetAuthor(tweet.authorId),

    UserModel.findOne({
      userId: viewerUserId,
    })
      .select("platformRole")
      .lean(),

    TweetLikeModel.exists({
      tweetId: tweet.tweetId,
      userId: viewerUserId,
    }),

    TweetRetweetModel.exists({
      tweetId: tweet.tweetId,
      userId: viewerUserId,
    }),
  ]);

  const viewerPlatformRole =
    viewer?.platformRole || "user";

  const isPlatformModerator =
    viewerPlatformRole === "admin" ||
    viewerPlatformRole === "owner";

  const isTweetAuthor =
    String(tweet.authorId) ===
    String(viewerUserId);

  const isRetweet =
    Boolean(retweetBy);

  return {
    feedItemId:
      feedItemId ||
      `tweet:${tweet.tweetId}`,

    feedCreatedAt:
      feedCreatedAt ||
      tweet.createdAt,

    isRetweet,

    tweetId:
      tweet.tweetId,

    text:
      tweet.text || "",

    mediaType:
      tweet.mediaType ||
      "none",

    media:
      Array.isArray(tweet.media)
        ? tweet.media
        : [],

    mentions:
      Array.isArray(tweet.mentions)
        ? tweet.mentions
        : [],

    author:
      publicTweetUser(author),

    likesCount:
      Number(tweet.likesCount || 0),

    commentsCount:
      Number(tweet.commentsCount || 0),

    retweetsCount:
      Number(tweet.retweetsCount || 0),

    viewsCount:
      Number(tweet.viewsCount || 0),

    isLiked:
      Boolean(like),

    isRetweeted:
      Boolean(retweet),

    /*
      يظهر زر الحذف لصاحب التويتة
      أو للإدمن أو الأونر.
    */
    canDelete:
      isTweetAuthor ||
      isPlatformModerator,

    retweetBy:
      retweetBy
        ? {
            userId:
              retweetBy.userId,

            username:
              retweetBy.username,

            createdAt:
              retweetBy.createdAt,
          }
        : null,

    createdAt:
      tweet.createdAt,

    updatedAt:
      tweet.updatedAt,
  };
}

async function safelyDecreaseCounter(
  tweetId: string,
  field:
    | "likesCount"
    | "commentsCount"
    | "retweetsCount"
) {
  await TweetModel.updateOne(
    {
      tweetId,

      [field]: {
        $gt: 0,
      },
    },
    {
      $inc: {
        [field]: -1,
      },
    }
  );
}

export async function createTweetService(
  input: {
    userId: string;
    username: string;

    payload: any;
  }
) {
  const {
    userId,
    username,
    payload,
  } = input;

  const text =
    cleanText(payload.text);

  if (
    text.length >
    TWEET_MAX_TEXT_LENGTH
  ) {
    return {
      ok: false as const,
      reason:
        "tweet_text_too_long",
    };
  }

  const rawMedia: unknown[] =
    Array.isArray(payload.media)
      ? payload.media
      : [];

  /*
    نتحقق من العدد والأنواع قبل الرفع
    حتى لا نرفع ملفات غير صالحة إلى Cloudinary.
  */
  const rawMediaValidation =
    validateRawTweetMedia(
      rawMedia
    );

  if (!rawMediaValidation.ok) {
    return {
      ok: false as const,
      reason:
        rawMediaValidation.reason,
    };
  }

  if (
    !text &&
    rawMedia.length === 0
  ) {
    return {
      ok: false as const,
      reason:
        "tweet_content_required",
    };
  }

  const requestedMediaType =
    cleanText(
      payload.media_type ??
        payload.mediaType
    ).toLowerCase();

  const expectedMediaType:
    | "none"
    | "images"
    | "video" =
    rawMediaValidation.videoCount > 0
      ? "video"
      : rawMediaValidation.imageCount >
          0
        ? "images"
        : "none";

  if (
    requestedMediaType &&
    requestedMediaType !==
      expectedMediaType
  ) {
    return {
      ok: false as const,
      reason:
        "invalid_media_type",
    };
  }

  /*
    نفحص مدة الانتظار قبل رفع الملفات
    حتى لا نرفعها ثم نرفض التويتة بسبب cooldown.
  */
  const lastTweet =
    await TweetModel.findOne({
      authorId: userId,
      isDeleted: false,
    })
      .sort({
        createdAt: -1,
      })
      .select("createdAt")
      .lean();

  if (lastTweet) {
    const elapsed =
      Date.now() -
      new Date(
        lastTweet.createdAt
      ).getTime();

    if (
      elapsed <
      TWEET_COOLDOWN_MS
    ) {
      const remainingMs =
        TWEET_COOLDOWN_MS -
        elapsed;

      return {
        ok: false as const,
        reason:
          "tweet_cooldown",

        remainingSeconds:
          Math.ceil(
            remainingMs / 1000
          ),
      };
    }
  }

  /*
    الملفات التي تحتوي على Base64 سترفع إلى Cloudinary.
  */
  const uploadMediaItems =
    rawMedia.filter(
      hasBase64Media
    );

  /*
    يمكن أيضًا قبول عناصر مرفوعة سابقًا
    وتحتوي على URL جاهز.
  */
  const existingUrlMedia =
    rawMedia
      .filter(
        (item) =>
          !hasBase64Media(item) &&
          hasUrlMedia(item)
      )
      .map(
        (
          item: unknown
        ): NormalizedTweetMediaItem =>
          normalizeMediaItem(item)
      )
      .filter(
        (item) =>
          item.url.length > 0
      );

  let uploadedMedia:
    UploadedTweetMedia[] = [];

  try {
    uploadedMedia =
      await uploadTweetMediaList(
        uploadMediaItems
      );
  } catch (error: any) {
    console.error(
      "[CREATE TWEET MEDIA UPLOAD ERROR]",
      error
    );

    return {
      ok: false as const,
      reason:
        error?.message ||
        "tweet_media_upload_failed",
    };
  }

  const uploadedNormalized =
    uploadedMedia.map(
      uploadedMediaToNormalized
    );

  const media:
    NormalizedTweetMediaItem[] = [
      ...existingUrlMedia,
      ...uploadedNormalized,
    ];

  let mediaType:
    | "none"
    | "images"
    | "video" = "none";

  if (media.length > 0) {
    const imageCount =
      media.filter(
        (item) =>
          item.type === "image"
      ).length;

    const videoCount =
      media.filter(
        (item) =>
          item.type === "video"
      ).length;

    if (
      imageCount > 0 &&
      videoCount > 0
    ) {
      await deleteTweetMediaList(
        uploadedMedia
      );

      return {
        ok: false as const,
        reason:
          "cannot_mix_images_and_video",
      };
    }

    if (videoCount > 0) {
      if (
        videoCount !== 1 ||
        media.length !== 1
      ) {
        await deleteTweetMediaList(
          uploadedMedia
        );

        return {
          ok: false as const,
          reason:
            "only_one_video_allowed",
        };
      }

      mediaType = "video";
    } else {
      if (
        imageCount >
        TWEET_MAX_IMAGES
      ) {
        await deleteTweetMediaList(
          uploadedMedia
        );

        return {
          ok: false as const,
          reason:
            "too_many_tweet_images",
        };
      }

      mediaType = "images";
    }
  }

  if (
    requestedMediaType &&
    requestedMediaType !==
      mediaType
  ) {
    await deleteTweetMediaList(
      uploadedMedia
    );

    return {
      ok: false as const,
      reason:
        "invalid_media_type",
    };
  }

  if (
    !text &&
    media.length === 0
  ) {
    await deleteTweetMediaList(
      uploadedMedia
    );

    return {
      ok: false as const,
      reason:
        "tweet_content_required",
    };
  }

  const mentionedUsers =
    await resolveMentionedUsers(
      text,
      userId
    );

  let tweet: any;

  try {
    tweet =
      await TweetModel.create({
        tweetId:
          `tweet_${randomUUID()}`,

        authorId:
          userId,

        authorUsername:
          username,

        text,

        mediaType,

        media,

        mentions:
          mentionedUsers.map(
            (user: any) =>
              user.userId
          ),
      });

    /*
      تسجيل التويتة في Redis
      حتى يتم حذفها تلقائيًا بعد 48 ساعة.
    */
    try {
      await scheduleTweetExpiry(
        tweet.tweetId
      );

      console.log(
        "[TWEET EXPIRY SCHEDULED]",
        {
          tweetId:
            tweet.tweetId,
        }
      );
    } catch (expiryError) {
      /*
        فشل Redis لا يلغي إنشاء التويتة.
      */
      console.error(
        "[SCHEDULE TWEET EXPIRY ERROR]",
        {
          tweetId:
            tweet.tweetId,

          error:
            expiryError,
        }
      );
    }
  } catch (error) {
    /*
      لو فشل حفظ التويتة نحذف الملفات
      التي تم رفعها في هذه العملية.
    */
    await deleteTweetMediaList(
      uploadedMedia
    );

    throw error;
  }

  /*
    فشل الإشعار لا يجب أن يحذف التويتة
    بعد حفظها بنجاح.
  */
  for (
    const mentionedUser of
    mentionedUsers
  ) {
    try {
      await createTweetNotification({
        recipientUserId:
          mentionedUser.userId,

        senderUserId:
          userId,

        senderUsername:
          username,

        type:
          "tweet_mention",

        tweetId:
          tweet.tweetId,

        body:
          `${username} mentioned you in a tweet`,
      });
    } catch (error) {
      console.error(
        "[TWEET MENTION NOTIFICATION ERROR]",
        {
          tweetId:
            tweet.tweetId,

          mentionedUserId:
            mentionedUser.userId,

          error,
        }
      );
    }
  }

  return {
    ok: true as const,

    tweet:
      await buildTweetResponse({
        tweet:
          tweet.toObject(),

        viewerUserId:
          userId,
      }),
  };
}

export async function deleteTweetService(
  input: {
    userId: string;
    tweetId: string;
  }
) {
  const userId =
    cleanId(input.userId);

  const tweetId =
    cleanId(input.tweetId);

  const [tweet, requester] =
    await Promise.all([
      TweetModel.findOne({
        tweetId,
        isDeleted: false,
      }),

      UserModel.findOne({
        userId,
      })
        .select(
          "userId username platformRole"
        )
        .lean(),
    ]);

  if (!tweet) {
    return {
      ok: false as const,
      reason:
        "tweet_not_found",
    };
  }

  if (!requester) {
    return {
      ok: false as const,
      reason:
        "user_not_found",
    };
  }

  const isTweetAuthor =
    String(tweet.authorId) ===
    String(userId);

  const isPlatformModerator =
    requester.platformRole ===
      "admin" ||
    requester.platformRole ===
      "owner";

  /*
    المسموح لهم بالحذف:
    1- صاحب التويتة.
    2- الإدمن.
    3- الأونر.
  */
  if (
    !isTweetAuthor &&
    !isPlatformModerator
  ) {
    return {
      ok: false as const,
      reason:
        "tweet_delete_forbidden",
    };
  }

  /*
    نأخذ نسخة من بيانات الوسائط
    قبل حذف التويتة من قاعدة البيانات.
  */
  const tweetMedia =
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
    نحذف باستخدام tweetId فقط؛
    لأن الإدمن أو الأونر قد لا يكون
    هو صاحب التويتة.
  */
  const deleteResult =
    await TweetModel.deleteOne({
      tweetId,
      isDeleted: false,
    });

  if (
    deleteResult.deletedCount === 0
  ) {
    return {
      ok: false as const,
      reason:
        "tweet_delete_failed",
    };
  }

  /*
    حذف جميع البيانات المرتبطة بالتويتة.
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

    deleteAllTweetNotifications(
      tweetId
    ),
  ]);

  /*
    إلغاء مهمة الحذف التلقائي
    المسجلة في Redis.
  */
  try {
    await cancelTweetExpiry(
      tweetId
    );
  } catch (error) {
    console.error(
      "[CANCEL TWEET EXPIRY ERROR]",
      {
        tweetId,
        error,
      }
    );
  }

  /*
    حذف ملفات الصور أو الفيديو
    من Cloudinary.
  */
  try {
    await deleteTweetMediaList(
      tweetMedia
    );
  } catch (error) {
    console.error(
      "[DELETE TWEET CLOUDINARY MEDIA ERROR]",
      {
        tweetId,
        error,
      }
    );
  }

  console.log(
    "[TWEET DELETED]",
    {
      tweetId,

      tweetAuthorId:
        tweet.authorId,

      deletedByUserId:
        userId,

      deletedByUsername:
        requester.username,

      deletedByRole:
        requester.platformRole,

      deletedByModerator:
        isPlatformModerator,
    }
  );

  return {
    ok: true as const,

    tweetId,

    deletedByModerator:
      isPlatformModerator,

    deletedByRole:
      requester.platformRole,
  };
}

export async function getTweetFeedService(
  input: {
    userId: string;
    feedType?: string;
    cursor?: string | null;
    limit?: number;
  }
) {
  const limit =
    clampLimit(
      input.limit,
      20,
      50
    );

  const cursor =
    parseCursor(
      input.cursor
    );

  const queryLimit =
    limit + 1;

  let allowedUserIds:
    string[] | null = null;

  if (
    input.feedType ===
    "friends"
  ) {
    const user =
      await UserModel.findOne({
        userId:
          input.userId,
      })
        .select(
          "friends"
        )
        .lean();

    const friendIds =
      Array.isArray(
        user?.friends
      )
        ? user.friends.map(
            (id: any) =>
              String(id)
          )
        : [];

    allowedUserIds = [
      input.userId,
      ...friendIds,
    ];
  }

  const originalTweetQuery: any = {
    isDeleted: false,
  };

  if (cursor) {
    originalTweetQuery.createdAt = {
      $lt: cursor,
    };
  }

  if (allowedUserIds) {
    originalTweetQuery.authorId = {
      $in: allowedUserIds,
    };
  }

  const retweetQuery: any = {};

  if (cursor) {
    retweetQuery.createdAt = {
      $lt: cursor,
    };
  }

  if (allowedUserIds) {
    retweetQuery.userId = {
      $in: allowedUserIds,
    };
  }

  const [
    originalTweets,
    retweets,
  ] = await Promise.all([
    TweetModel.find(
      originalTweetQuery
    )
      .sort({
        createdAt: -1,
      })
      .limit(queryLimit)
      .lean(),

    TweetRetweetModel.find(
      retweetQuery
    )
      .sort({
        createdAt: -1,
      })
      .limit(queryLimit)
      .lean(),
  ]);

  const retweetedTweetIds =
    retweets.map(
      (retweet: any) =>
        retweet.tweetId
    );

  const originalTweetIds =
    originalTweets.map(
      (tweet: any) =>
        tweet.tweetId
    );

  const allTweetIds = [
    ...new Set([
      ...originalTweetIds,
      ...retweetedTweetIds,
    ]),
  ];

  const allTweets =
    allTweetIds.length > 0
      ? await TweetModel.find({
          tweetId: {
            $in: allTweetIds,
          },

          isDeleted: false,
        }).lean()
      : [];

  const tweetMap =
    new Map<string, any>();

  for (
    const tweet of allTweets
  ) {
    tweetMap.set(
      tweet.tweetId,
      tweet
    );
  }

  type FeedActivity = {
    type:
      | "tweet"
      | "retweet";

    feedItemId: string;

    createdAt: Date;

    tweet: any;

    retweetBy?: any | null;
  };

  const activities:
    FeedActivity[] = [];

  for (
    const tweet of originalTweets
  ) {
    activities.push({
      type: "tweet",

      feedItemId:
        `tweet:${tweet.tweetId}`,

      createdAt:
        new Date(
          tweet.createdAt
        ),

      tweet,

      retweetBy: null,
    });
  }

  for (
    const retweet of retweets
  ) {
    const originalTweet =
      tweetMap.get(
        retweet.tweetId
      );

    if (!originalTweet) {
      continue;
    }

    activities.push({
      type: "retweet",

      feedItemId:
        `retweet:${String(
          retweet._id
        )}`,

      createdAt:
        new Date(
          retweet.createdAt
        ),

      tweet:
        originalTweet,

      retweetBy:
        retweet,
    });
  }

  activities.sort(
    (
      first,
      second
    ) =>
      second.createdAt.getTime() -
      first.createdAt.getTime()
  );

  const hasMore =
    activities.length >
    limit;

  const pageActivities =
    activities.slice(
      0,
      limit
    );

  const result = [];

  for (
    const activity of
    pageActivities
  ) {
    result.push(
      await buildTweetResponse({
        tweet:
          activity.tweet,

        viewerUserId:
          input.userId,

        retweetBy:
          activity.retweetBy ||
          null,

        feedItemId:
          activity.feedItemId,

        feedCreatedAt:
          activity.createdAt,
      })
    );
  }

  const lastActivity =
    pageActivities[
      pageActivities.length - 1
    ];

  const nextCursor =
    hasMore &&
    lastActivity
      ? lastActivity.createdAt
          .toISOString()
      : null;

  return {
    ok: true as const,

    tweets:
      result,

    nextCursor,
  };
}

export async function getTweetDetailsService(
  input: {
    userId: string;
    tweetId: string;
  }
) {
  const tweet =
    await TweetModel.findOne({
      tweetId:
        cleanId(
          input.tweetId
        ),

      isDeleted: false,
    }).lean();

  if (!tweet) {
    return {
      ok: false as const,
      reason:
        "tweet_not_found",
    };
  }

  return {
    ok: true as const,

    tweet:
      await buildTweetResponse({
        tweet,

        viewerUserId:
          input.userId,

        feedItemId:
          `tweet:${tweet.tweetId}`,

        feedCreatedAt:
          tweet.createdAt,
      }),
  };
}

export async function toggleTweetLikeService(
  input: {
    userId: string;
    username: string;
    tweetId: string;
  }
) {
  const tweetId =
    cleanId(input.tweetId);

  const tweet =
    await TweetModel.findOne({
      tweetId,
      isDeleted: false,
    });

  if (!tweet) {
    return {
      ok: false as const,
      reason:
        "tweet_not_found",
    };
  }

  const existing =
    await TweetLikeModel.findOne({
      tweetId,

      userId:
        input.userId,
    });

  if (existing) {
    await existing.deleteOne();

    await safelyDecreaseCounter(
      tweetId,
      "likesCount"
    );

    /*
      حذف إشعار اللايك عند إلغاء اللايك.
    */
    try {
      await deleteTweetLikeNotification({
        recipientUserId:
          tweet.authorId,

        senderUserId:
          input.userId,

        tweetId,
      });
    } catch (error) {
      console.error(
        "[DELETE TWEET LIKE NOTIFICATION ERROR]",
        {
          tweetId,

          recipientUserId:
            tweet.authorId,

          senderUserId:
            input.userId,

          error,
        }
      );
    }

    const updated =
      await TweetModel.findOne({
        tweetId,
      }).lean();

    return {
      ok: true as const,
      liked: false,

      likesCount:
        Number(
          updated?.likesCount || 0
        ),
    };
  }

  try {
    await TweetLikeModel.create({
      tweetId,

      userId:
        input.userId,
    });
  } catch (error: any) {
    if (error?.code !== 11000) {
      throw error;
    }
  }

  await TweetModel.updateOne(
    {
      tweetId,
    },
    {
      $inc: {
        likesCount: 1,
      },
    }
  );

  await createTweetNotification({
    recipientUserId:
      tweet.authorId,

    senderUserId:
      input.userId,

    senderUsername:
      input.username,

    type:
      "tweet_like",

    tweetId,

    body:
      `${input.username} liked your tweet`,
  });

  const updated =
    await TweetModel.findOne({
      tweetId,
    }).lean();

  return {
    ok: true as const,
    liked: true,

    likesCount:
      Number(
        updated?.likesCount || 0
      ),
  };
}

export async function toggleTweetRetweetService(
  input: {
    userId: string;
    username: string;
    tweetId: string;
  }
) {
  const tweetId =
    cleanId(input.tweetId);

  const tweet =
    await TweetModel.findOne({
      tweetId,
      isDeleted: false,
    });

  if (!tweet) {
    return {
      ok: false as const,
      reason:
        "tweet_not_found",
    };
  }

  const existing =
    await TweetRetweetModel.findOne({
      tweetId,

      userId:
        input.userId,
    });

  if (existing) {
    const removedRetweetId =
      String(existing._id);

    await existing.deleteOne();

    await safelyDecreaseCounter(
      tweetId,
      "retweetsCount"
    );

    /*
      حذف إشعار الريتويت عند إلغاء الريتويت.
    */
    try {
      await deleteTweetRetweetNotification({
        recipientUserId:
          tweet.authorId,

        senderUserId:
          input.userId,

        tweetId,
      });
    } catch (error) {
      console.error(
        "[DELETE TWEET RETWEET NOTIFICATION ERROR]",
        {
          tweetId,

          recipientUserId:
            tweet.authorId,

          senderUserId:
            input.userId,

          error,
        }
      );
    }

    const updated =
      await TweetModel.findOne({
        tweetId,
      }).lean();

    return {
      ok: true as const,

      retweeted: false,

      tweetId,

      removedFeedItemId:
        `retweet:${removedRetweetId}`,

      retweetBy: null,

      retweetsCount:
        Number(
          updated?.retweetsCount ||
            0
        ),
    };
  }

  let createdRetweet: any;
  let wasCreated = false;

  try {
    createdRetweet =
      await TweetRetweetModel.create({
        tweetId,

        userId:
          input.userId,

        username:
          input.username,
      });

    wasCreated = true;
  } catch (error: any) {
    if (error?.code !== 11000) {
      throw error;
    }

    createdRetweet =
      await TweetRetweetModel.findOne({
        tweetId,

        userId:
          input.userId,
      });
  }

  if (!createdRetweet) {
    return {
      ok: false as const,
      reason:
        "retweet_create_failed",
    };
  }

  if (wasCreated) {
    await TweetModel.updateOne(
      {
        tweetId,
      },
      {
        $inc: {
          retweetsCount: 1,
        },
      }
    );
  }

  if (
    wasCreated &&
    tweet.authorId !==
    input.userId
  ) {
    await createTweetNotification({
      recipientUserId:
        tweet.authorId,

      senderUserId:
        input.userId,

      senderUsername:
        input.username,

      type:
        "tweet_retweet",

      tweetId,

      body:
        `${input.username} retweeted your tweet`,
    });
  }

  const updated =
    await TweetModel.findOne({
      tweetId,
    }).lean();

  const retweetObject =
    createdRetweet?.toObject
      ? createdRetweet.toObject()
      : createdRetweet;

  return {
    ok: true as const,

    retweeted: true,

    tweetId,

    feedItemId:
      `retweet:${String(
        retweetObject?._id
      )}`,

    feedCreatedAt:
      retweetObject?.createdAt,

    retweetBy: {
      userId:
        input.userId,

      username:
        input.username,

      createdAt:
        retweetObject?.createdAt,
    },

    retweetsCount:
      Number(
        updated?.retweetsCount ||
          0
      ),
  };
}

export async function addTweetViewService(
  input: {
    userId: string;
    tweetId: string;
  }
) {
  const tweetId =
    cleanId(input.tweetId);

  const tweetExists =
    await TweetModel.exists({
      tweetId,
      isDeleted: false,
    });

  if (!tweetExists) {
    return {
      ok: false as const,
      reason:
        "tweet_not_found",
    };
  }

  let viewAdded = false;

  try {
    await TweetViewModel.create({
      tweetId,

      userId:
        input.userId,
    });

    viewAdded = true;
  } catch (error: any) {
    if (error?.code !== 11000) {
      throw error;
    }
  }

  if (viewAdded) {
    await TweetModel.updateOne(
      {
        tweetId,
      },
      {
        $inc: {
          viewsCount: 1,
        },
      }
    );
  }

  const tweet =
    await TweetModel.findOne({
      tweetId,
    }).lean();

  return {
    ok: true as const,
    viewAdded,

    viewsCount:
      Number(
        tweet?.viewsCount || 0
      ),
  };
}

export async function createTweetCommentService(
  input: {
    userId: string;
    username: string;
    tweetId: string;
    text: string;
  }
) {
  const tweetId =
    cleanId(input.tweetId);

  const text =
    cleanText(input.text);

  if (!text) {
    return {
      ok: false as const,
      reason:
        "comment_text_required",
    };
  }

  if (
    text.length >
    TWEET_COMMENT_MAX_LENGTH
  ) {
    return {
      ok: false as const,
      reason:
        "comment_text_too_long",
    };
  }

  const tweet =
    await TweetModel.findOne({
      tweetId,
      isDeleted: false,
    });

  if (!tweet) {
    return {
      ok: false as const,
      reason:
        "tweet_not_found",
    };
  }

  const mentionedUsers =
    await resolveMentionedUsers(
      text,
      input.userId
    );

  const comment =
    await TweetCommentModel.create({
      commentId:
        `comment_${randomUUID()}`,

      tweetId,

      authorId:
        input.userId,

      authorUsername:
        input.username,

      text,

      mentions:
        mentionedUsers.map(
          (user: any) =>
            user.userId
        ),
    });

  await TweetModel.updateOne(
    {
      tweetId,
    },
    {
      $inc: {
        commentsCount: 1,
      },
    }
  );

  await createTweetNotification({
    recipientUserId:
      tweet.authorId,

    senderUserId:
      input.userId,

    senderUsername:
      input.username,

    type:
      "tweet_comment",

    tweetId,

    commentId:
      comment.commentId,

    body:
      `${input.username} commented on your tweet`,
  });

  for (
    const mentionedUser of
    mentionedUsers
  ) {
    if (
      mentionedUser.userId ===
      tweet.authorId
    ) {
      continue;
    }

    await createTweetNotification({
      recipientUserId:
        mentionedUser.userId,

      senderUserId:
        input.userId,

      senderUsername:
        input.username,

      type:
        "comment_mention",

      tweetId,

      commentId:
        comment.commentId,

      body:
        `${input.username} mentioned you in a comment`,
    });
  }

  return {
    ok: true as const,

    comment:
      await buildCommentResponse(
        comment.toObject()
      ),
  };
}

async function buildCommentResponse(
  comment: any
) {
  const author =
    await getTweetAuthor(
      comment.authorId
    );

  return {
    commentId:
      comment.commentId,

    tweetId:
      comment.tweetId,

    text:
      comment.text,

    author:
      publicTweetUser(author),

    mentions:
      Array.isArray(
        comment.mentions
      )
        ? comment.mentions
        : [],

    isEdited:
      comment.isEdited === true,

    editedAt:
      comment.editedAt || null,

    createdAt:
      comment.createdAt,

    updatedAt:
      comment.updatedAt,
  };
}

export async function updateTweetCommentService(
  input: {
    userId: string;
    username: string;
    commentId: string;
    text: string;
  }
) {
  const commentId =
    cleanId(input.commentId);

  const text =
    cleanText(input.text);

  if (!text) {
    return {
      ok: false as const,
      reason:
        "comment_text_required",
    };
  }

  if (
    text.length >
    TWEET_COMMENT_MAX_LENGTH
  ) {
    return {
      ok: false as const,
      reason:
        "comment_text_too_long",
    };
  }

  const comment =
    await TweetCommentModel.findOne({
      commentId,
      isDeleted: false,
    });

  if (!comment) {
    return {
      ok: false as const,
      reason:
        "comment_not_found",
    };
  }

  if (
    comment.authorId !==
    input.userId
  ) {
    return {
      ok: false as const,
      reason:
        "comment_update_forbidden",
    };
  }

  const oldMentions =
    new Set(
      comment.mentions || []
    );

  const mentionedUsers =
    await resolveMentionedUsers(
      text,
      input.userId
    );

  comment.text = text;

  comment.mentions =
    mentionedUsers.map(
      (user: any) =>
        user.userId
    );

  comment.isEdited = true;

  comment.editedAt =
    new Date();

  await comment.save();

  for (
    const mentionedUser of
    mentionedUsers
  ) {
    if (
      oldMentions.has(
        mentionedUser.userId
      )
    ) {
      continue;
    }

    await createTweetNotification({
      recipientUserId:
        mentionedUser.userId,

      senderUserId:
        input.userId,

      senderUsername:
        input.username,

      type:
        "comment_mention",

      tweetId:
        comment.tweetId,

      commentId:
        comment.commentId,

      body:
        `${input.username} mentioned you in a comment`,
    });
  }

  return {
    ok: true as const,

    comment:
      await buildCommentResponse(
        comment.toObject()
      ),
  };
}

export async function deleteTweetCommentService(
  input: {
    userId: string;
    commentId: string;
  }
) {
  const comment =
    await TweetCommentModel.findOne({
      commentId:
        cleanId(
          input.commentId
        ),

      isDeleted: false,
    });

  if (!comment) {
    return {
      ok: false as const,
      reason:
        "comment_not_found",
    };
  }

  if (
    comment.authorId !==
    input.userId
  ) {
    return {
      ok: false as const,
      reason:
        "comment_delete_forbidden",
    };
  }

  comment.isDeleted = true;

  comment.deletedAt =
    new Date();

  await comment.save();

  await safelyDecreaseCounter(
    comment.tweetId,
    "commentsCount"
  );

  return {
    ok: true as const,

    commentId:
      comment.commentId,

    tweetId:
      comment.tweetId,
  };
}

export async function listTweetCommentsService(
  input: {
    tweetId: string;
    cursor?: string | null;
    limit?: number;
  }
) {
  const tweetId =
    cleanId(input.tweetId);

  const exists =
    await TweetModel.exists({
      tweetId,
      isDeleted: false,
    });

  if (!exists) {
    return {
      ok: false as const,
      reason:
        "tweet_not_found",
    };
  }

  const limit =
    clampLimit(
      input.limit,
      20,
      50
    );

  const cursor =
    parseCursor(
      input.cursor
    );

  const query: any = {
    tweetId,
    isDeleted: false,
  };

  if (cursor) {
    query.createdAt = {
      $lt: cursor,
    };
  }

  const comments =
    await TweetCommentModel.find(
      query
    )
      .sort({
        createdAt: -1,
      })
      .limit(limit)
      .lean();

  const result = [];

  for (
    const comment of comments
  ) {
    result.push(
      await buildCommentResponse(
        comment
      )
    );
  }

  const nextCursor =
    comments.length === limit
      ? new Date(
          comments[
            comments.length - 1
          ].createdAt
        ).toISOString()
      : null;

  return {
    ok: true as const,
    comments: result,
    nextCursor,
  };
}