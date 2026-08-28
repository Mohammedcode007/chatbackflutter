"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTweetService = createTweetService;
exports.deleteTweetService = deleteTweetService;
exports.getTweetFeedService = getTweetFeedService;
exports.getTweetDetailsService = getTweetDetailsService;
exports.toggleTweetLikeService = toggleTweetLikeService;
exports.toggleTweetRetweetService = toggleTweetRetweetService;
exports.addTweetViewService = addTweetViewService;
exports.createTweetCommentService = createTweetCommentService;
exports.updateTweetCommentService = updateTweetCommentService;
exports.deleteTweetCommentService = deleteTweetCommentService;
exports.listTweetCommentsService = listTweetCommentsService;
const crypto_1 = require("crypto");
const Tweet_model_1 = require("../../models/Tweet.model");
const TweetComment_model_1 = require("../../models/TweetComment.model");
const TweetLike_model_1 = require("../../models/TweetLike.model");
const TweetRetweet_model_1 = require("../../models/TweetRetweet.model");
const TweetView_model_1 = require("../../models/TweetView.model");
const User_model_1 = require("../../models/User.model");
const tweets_utils_1 = require("./tweets.utils");
const tweets_media_service_1 = require("./tweets.media.service");
const tweets_notifications_1 = require("./tweets.notifications");
const ephemeralExpiry_redis_1 = require("../../services/expiry/ephemeralExpiry.redis");
async function checkTweetActionPermission(userId) {
    const cleanUserId = (0, tweets_utils_1.cleanId)(userId);
    if (!cleanUserId) {
        return {
            ok: false,
            reason: "invalid_user_id",
        };
    }
    const user = await User_model_1.UserModel.findOne({
        userId: cleanUserId,
    })
        .select("userId accountType")
        .lean();
    if (!user) {
        return {
            ok: false,
            reason: "user_not_found",
        };
    }
    const accountType = String(user.accountType || "none")
        .trim()
        .toLowerCase();
    if (!accountType || accountType === "none") {
        return {
            ok: false,
            reason: "tweet_account_type_required",
        };
    }
    return {
        ok: true,
        accountType,
    };
}
function isObject(value) {
    return Boolean(value &&
        typeof value === "object" &&
        !Array.isArray(value));
}
function normalizeRawMediaType(value) {
    const type = (0, tweets_utils_1.cleanText)(value).toLowerCase();
    if (type === "image" ||
        type === "video") {
        return type;
    }
    return "";
}
function hasBase64Media(value) {
    if (!isObject(value)) {
        return false;
    }
    return (0, tweets_utils_1.cleanText)(value.base64).length > 0;
}
function hasUrlMedia(value) {
    if (!isObject(value)) {
        return false;
    }
    return (0, tweets_utils_1.cleanText)(value.url).length > 0;
}
function validateRawTweetMedia(rawMedia) {
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
                reason: "invalid_tweet_media_item",
            };
        }
        const type = normalizeRawMediaType(item.type);
        if (!type) {
            return {
                ok: false,
                reason: "invalid_tweet_media_type",
            };
        }
        const hasBase64 = hasBase64Media(item);
        const hasUrl = hasUrlMedia(item);
        if (!hasBase64 && !hasUrl) {
            return {
                ok: false,
                reason: "tweet_media_source_required",
            };
        }
        if (type === "image") {
            imageCount += 1;
        }
        else {
            videoCount += 1;
        }
    }
    if (imageCount > 0 &&
        videoCount > 0) {
        return {
            ok: false,
            reason: "cannot_mix_images_and_video",
        };
    }
    if (imageCount >
        tweets_utils_1.TWEET_MAX_IMAGES) {
        return {
            ok: false,
            reason: "too_many_tweet_images",
        };
    }
    if (videoCount > 1) {
        return {
            ok: false,
            reason: "only_one_video_allowed",
        };
    }
    return {
        ok: true,
        imageCount,
        videoCount,
    };
}
function uploadedMediaToNormalized(item) {
    return {
        type: item.type,
        url: item.url,
        publicId: item.publicId,
        thumbnailUrl: item.thumbnailUrl,
        width: item.width,
        height: item.height,
        duration: item.duration,
    };
}
async function getTweetAuthor(userId) {
    return User_model_1.UserModel.findOne({
        userId,
    })
        .select([
        "userId",
        "username",
        "photoUrl",
        "accountColor",
        "badgeKey",
        "badgeName",
        "badgeValue",
        "verificationType",
        "inventory",
    ].join(" "))
        .lean();
}
async function buildTweetResponse(input) {
    const { tweet, viewerUserId, retweetBy, feedItemId, feedCreatedAt, } = input;
    /*
      نحصل على رتبة المستخدم الذي يشاهد التويتة.
      الإدمن والأونر يستطيعان حذف أي تويتة.
    */
    const [author, viewer, like, retweet,] = await Promise.all([
        getTweetAuthor(tweet.authorId),
        User_model_1.UserModel.findOne({
            userId: viewerUserId,
        })
            .select("platformRole")
            .lean(),
        TweetLike_model_1.TweetLikeModel.exists({
            tweetId: tweet.tweetId,
            userId: viewerUserId,
        }),
        TweetRetweet_model_1.TweetRetweetModel.exists({
            tweetId: tweet.tweetId,
            userId: viewerUserId,
        }),
    ]);
    const viewerPlatformRole = viewer?.platformRole || "user";
    const isPlatformModerator = viewerPlatformRole === "admin" ||
        viewerPlatformRole === "owner";
    const isTweetAuthor = String(tweet.authorId) ===
        String(viewerUserId);
    const isRetweet = Boolean(retweetBy);
    return {
        feedItemId: feedItemId ||
            `tweet:${tweet.tweetId}`,
        feedCreatedAt: feedCreatedAt ||
            tweet.createdAt,
        isRetweet,
        tweetId: tweet.tweetId,
        text: tweet.text || "",
        mediaType: tweet.mediaType ||
            "none",
        media: Array.isArray(tweet.media)
            ? tweet.media
            : [],
        mentions: Array.isArray(tweet.mentions)
            ? tweet.mentions
            : [],
        author: (0, tweets_utils_1.publicTweetUser)(author),
        likesCount: Number(tweet.likesCount || 0),
        commentsCount: Number(tweet.commentsCount || 0),
        retweetsCount: Number(tweet.retweetsCount || 0),
        viewsCount: Number(tweet.viewsCount || 0),
        isLiked: Boolean(like),
        isRetweeted: Boolean(retweet),
        /*
          يظهر زر الحذف لصاحب التويتة
          أو للإدمن أو الأونر.
        */
        canDelete: isTweetAuthor ||
            isPlatformModerator,
        retweetBy: retweetBy
            ? {
                userId: retweetBy.userId,
                username: retweetBy.username,
                createdAt: retweetBy.createdAt,
            }
            : null,
        createdAt: tweet.createdAt,
        updatedAt: tweet.updatedAt,
    };
}
async function safelyDecreaseCounter(tweetId, field) {
    await Tweet_model_1.TweetModel.updateOne({
        tweetId,
        [field]: {
            $gt: 0,
        },
    }, {
        $inc: {
            [field]: -1,
        },
    });
}
async function createTweetService(input) {
    const { userId, username, payload, } = input;
    const permission = await checkTweetActionPermission(userId);
    if (!permission.ok) {
        return {
            ok: false,
            reason: permission.reason,
        };
    }
    const text = (0, tweets_utils_1.cleanText)(payload.text);
    if (text.length >
        tweets_utils_1.TWEET_MAX_TEXT_LENGTH) {
        return {
            ok: false,
            reason: "tweet_text_too_long",
        };
    }
    const rawMedia = Array.isArray(payload.media)
        ? payload.media
        : [];
    /*
      نتحقق من العدد والأنواع قبل الرفع
      حتى لا نرفع ملفات غير صالحة إلى Cloudinary.
    */
    const rawMediaValidation = validateRawTweetMedia(rawMedia);
    if (!rawMediaValidation.ok) {
        return {
            ok: false,
            reason: rawMediaValidation.reason,
        };
    }
    if (!text &&
        rawMedia.length === 0) {
        return {
            ok: false,
            reason: "tweet_content_required",
        };
    }
    const requestedMediaType = (0, tweets_utils_1.cleanText)(payload.media_type ??
        payload.mediaType).toLowerCase();
    const expectedMediaType = rawMediaValidation.videoCount > 0
        ? "video"
        : rawMediaValidation.imageCount >
            0
            ? "images"
            : "none";
    if (requestedMediaType &&
        requestedMediaType !==
            expectedMediaType) {
        return {
            ok: false,
            reason: "invalid_media_type",
        };
    }
    /*
      نفحص مدة الانتظار قبل رفع الملفات
      حتى لا نرفعها ثم نرفض التويتة بسبب cooldown.
    */
    const lastTweet = await Tweet_model_1.TweetModel.findOne({
        authorId: userId,
        isDeleted: false,
    })
        .sort({
        createdAt: -1,
    })
        .select("createdAt")
        .lean();
    if (lastTweet) {
        const elapsed = Date.now() -
            new Date(lastTweet.createdAt).getTime();
        if (elapsed <
            tweets_utils_1.TWEET_COOLDOWN_MS) {
            const remainingMs = tweets_utils_1.TWEET_COOLDOWN_MS -
                elapsed;
            return {
                ok: false,
                reason: "tweet_cooldown",
                remainingSeconds: Math.ceil(remainingMs / 1000),
            };
        }
    }
    /*
      الملفات التي تحتوي على Base64 سترفع إلى Cloudinary.
    */
    const uploadMediaItems = rawMedia.filter(hasBase64Media);
    /*
      يمكن أيضًا قبول عناصر مرفوعة سابقًا
      وتحتوي على URL جاهز.
    */
    const existingUrlMedia = rawMedia
        .filter((item) => !hasBase64Media(item) &&
        hasUrlMedia(item))
        .map((item) => (0, tweets_utils_1.normalizeMediaItem)(item))
        .filter((item) => item.url.length > 0);
    let uploadedMedia = [];
    try {
        uploadedMedia =
            await (0, tweets_media_service_1.uploadTweetMediaList)(uploadMediaItems);
    }
    catch (error) {
        console.error("[CREATE TWEET MEDIA UPLOAD ERROR]", error);
        return {
            ok: false,
            reason: error?.message ||
                "tweet_media_upload_failed",
        };
    }
    const uploadedNormalized = uploadedMedia.map(uploadedMediaToNormalized);
    const media = [
        ...existingUrlMedia,
        ...uploadedNormalized,
    ];
    let mediaType = "none";
    if (media.length > 0) {
        const imageCount = media.filter((item) => item.type === "image").length;
        const videoCount = media.filter((item) => item.type === "video").length;
        if (imageCount > 0 &&
            videoCount > 0) {
            await (0, tweets_media_service_1.deleteTweetMediaList)(uploadedMedia);
            return {
                ok: false,
                reason: "cannot_mix_images_and_video",
            };
        }
        if (videoCount > 0) {
            if (videoCount !== 1 ||
                media.length !== 1) {
                await (0, tweets_media_service_1.deleteTweetMediaList)(uploadedMedia);
                return {
                    ok: false,
                    reason: "only_one_video_allowed",
                };
            }
            mediaType = "video";
        }
        else {
            if (imageCount >
                tweets_utils_1.TWEET_MAX_IMAGES) {
                await (0, tweets_media_service_1.deleteTweetMediaList)(uploadedMedia);
                return {
                    ok: false,
                    reason: "too_many_tweet_images",
                };
            }
            mediaType = "images";
        }
    }
    if (requestedMediaType &&
        requestedMediaType !==
            mediaType) {
        await (0, tweets_media_service_1.deleteTweetMediaList)(uploadedMedia);
        return {
            ok: false,
            reason: "invalid_media_type",
        };
    }
    if (!text &&
        media.length === 0) {
        await (0, tweets_media_service_1.deleteTweetMediaList)(uploadedMedia);
        return {
            ok: false,
            reason: "tweet_content_required",
        };
    }
    const mentionedUsers = await (0, tweets_utils_1.resolveMentionedUsers)(text, userId);
    let tweet;
    try {
        tweet =
            await Tweet_model_1.TweetModel.create({
                tweetId: `tweet_${(0, crypto_1.randomUUID)()}`,
                authorId: userId,
                authorUsername: username,
                text,
                mediaType,
                media,
                mentions: mentionedUsers.map((user) => user.userId),
            });
        /*
          تسجيل التويتة في Redis
          حتى يتم حذفها تلقائيًا بعد 48 ساعة.
        */
        try {
            await (0, ephemeralExpiry_redis_1.scheduleTweetExpiry)(tweet.tweetId);
            console.log("[TWEET EXPIRY SCHEDULED]", {
                tweetId: tweet.tweetId,
            });
        }
        catch (expiryError) {
            /*
              فشل Redis لا يلغي إنشاء التويتة.
            */
            console.error("[SCHEDULE TWEET EXPIRY ERROR]", {
                tweetId: tweet.tweetId,
                error: expiryError,
            });
        }
    }
    catch (error) {
        /*
          لو فشل حفظ التويتة نحذف الملفات
          التي تم رفعها في هذه العملية.
        */
        await (0, tweets_media_service_1.deleteTweetMediaList)(uploadedMedia);
        throw error;
    }
    /*
      فشل الإشعار لا يجب أن يحذف التويتة
      بعد حفظها بنجاح.
    */
    for (const mentionedUser of mentionedUsers) {
        try {
            await (0, tweets_notifications_1.createTweetNotification)({
                recipientUserId: mentionedUser.userId,
                senderUserId: userId,
                senderUsername: username,
                type: "tweet_mention",
                tweetId: tweet.tweetId,
                body: `${username} mentioned you in a tweet`,
            });
        }
        catch (error) {
            console.error("[TWEET MENTION NOTIFICATION ERROR]", {
                tweetId: tweet.tweetId,
                mentionedUserId: mentionedUser.userId,
                error,
            });
        }
    }
    return {
        ok: true,
        tweet: await buildTweetResponse({
            tweet: tweet.toObject(),
            viewerUserId: userId,
        }),
    };
}
async function deleteTweetService(input) {
    const userId = (0, tweets_utils_1.cleanId)(input.userId);
    const tweetId = (0, tweets_utils_1.cleanId)(input.tweetId);
    const [tweet, requester] = await Promise.all([
        Tweet_model_1.TweetModel.findOne({
            tweetId,
            isDeleted: false,
        }),
        User_model_1.UserModel.findOne({
            userId,
        })
            .select("userId username platformRole")
            .lean(),
    ]);
    if (!tweet) {
        return {
            ok: false,
            reason: "tweet_not_found",
        };
    }
    if (!requester) {
        return {
            ok: false,
            reason: "user_not_found",
        };
    }
    const isTweetAuthor = String(tweet.authorId) ===
        String(userId);
    const isPlatformModerator = requester.platformRole ===
        "admin" ||
        requester.platformRole ===
            "owner";
    /*
      المسموح لهم بالحذف:
      1- صاحب التويتة.
      2- الإدمن.
      3- الأونر.
    */
    if (!isTweetAuthor &&
        !isPlatformModerator) {
        return {
            ok: false,
            reason: "tweet_delete_forbidden",
        };
    }
    /*
      نأخذ نسخة من بيانات الوسائط
      قبل حذف التويتة من قاعدة البيانات.
    */
    const tweetMedia = Array.isArray(tweet.media)
        ? tweet.media.map((item) => ({
            type: item?.type,
            publicId: item?.publicId ??
                item?.public_id,
        }))
        : [];
    /*
      نحذف باستخدام tweetId فقط؛
      لأن الإدمن أو الأونر قد لا يكون
      هو صاحب التويتة.
    */
    const deleteResult = await Tweet_model_1.TweetModel.deleteOne({
        tweetId,
        isDeleted: false,
    });
    if (deleteResult.deletedCount === 0) {
        return {
            ok: false,
            reason: "tweet_delete_failed",
        };
    }
    /*
      حذف جميع البيانات المرتبطة بالتويتة.
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
        (0, tweets_notifications_1.deleteAllTweetNotifications)(tweetId),
    ]);
    /*
      إلغاء مهمة الحذف التلقائي
      المسجلة في Redis.
    */
    try {
        await (0, ephemeralExpiry_redis_1.cancelTweetExpiry)(tweetId);
    }
    catch (error) {
        console.error("[CANCEL TWEET EXPIRY ERROR]", {
            tweetId,
            error,
        });
    }
    /*
      حذف ملفات الصور أو الفيديو
      من Cloudinary.
    */
    try {
        await (0, tweets_media_service_1.deleteTweetMediaList)(tweetMedia);
    }
    catch (error) {
        console.error("[DELETE TWEET CLOUDINARY MEDIA ERROR]", {
            tweetId,
            error,
        });
    }
    console.log("[TWEET DELETED]", {
        tweetId,
        tweetAuthorId: tweet.authorId,
        deletedByUserId: userId,
        deletedByUsername: requester.username,
        deletedByRole: requester.platformRole,
        deletedByModerator: isPlatformModerator,
    });
    return {
        ok: true,
        tweetId,
        deletedByModerator: isPlatformModerator,
        deletedByRole: requester.platformRole,
    };
}
async function getTweetFeedService(input) {
    const limit = (0, tweets_utils_1.clampLimit)(input.limit, 20, 50);
    const cursor = (0, tweets_utils_1.parseCursor)(input.cursor);
    const queryLimit = limit + 1;
    let allowedUserIds = null;
    if (input.feedType ===
        "friends") {
        const user = await User_model_1.UserModel.findOne({
            userId: input.userId,
        })
            .select("friends")
            .lean();
        const friendIds = Array.isArray(user?.friends)
            ? user.friends.map((id) => String(id))
            : [];
        allowedUserIds = [
            input.userId,
            ...friendIds,
        ];
    }
    const originalTweetQuery = {
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
    const retweetQuery = {};
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
    const [originalTweets, retweets,] = await Promise.all([
        Tweet_model_1.TweetModel.find(originalTweetQuery)
            .sort({
            createdAt: -1,
        })
            .limit(queryLimit)
            .lean(),
        TweetRetweet_model_1.TweetRetweetModel.find(retweetQuery)
            .sort({
            createdAt: -1,
        })
            .limit(queryLimit)
            .lean(),
    ]);
    const retweetedTweetIds = retweets.map((retweet) => retweet.tweetId);
    const originalTweetIds = originalTweets.map((tweet) => tweet.tweetId);
    const allTweetIds = [
        ...new Set([
            ...originalTweetIds,
            ...retweetedTweetIds,
        ]),
    ];
    const allTweets = allTweetIds.length > 0
        ? await Tweet_model_1.TweetModel.find({
            tweetId: {
                $in: allTweetIds,
            },
            isDeleted: false,
        }).lean()
        : [];
    const tweetMap = new Map();
    for (const tweet of allTweets) {
        tweetMap.set(tweet.tweetId, tweet);
    }
    const activities = [];
    for (const tweet of originalTweets) {
        activities.push({
            type: "tweet",
            feedItemId: `tweet:${tweet.tweetId}`,
            createdAt: new Date(tweet.createdAt),
            tweet,
            retweetBy: null,
        });
    }
    for (const retweet of retweets) {
        const originalTweet = tweetMap.get(retweet.tweetId);
        if (!originalTweet) {
            continue;
        }
        activities.push({
            type: "retweet",
            feedItemId: `retweet:${String(retweet._id)}`,
            createdAt: new Date(retweet.createdAt),
            tweet: originalTweet,
            retweetBy: retweet,
        });
    }
    activities.sort((first, second) => second.createdAt.getTime() -
        first.createdAt.getTime());
    const hasMore = activities.length >
        limit;
    const pageActivities = activities.slice(0, limit);
    const result = [];
    for (const activity of pageActivities) {
        result.push(await buildTweetResponse({
            tweet: activity.tweet,
            viewerUserId: input.userId,
            retweetBy: activity.retweetBy ||
                null,
            feedItemId: activity.feedItemId,
            feedCreatedAt: activity.createdAt,
        }));
    }
    const lastActivity = pageActivities[pageActivities.length - 1];
    const nextCursor = hasMore &&
        lastActivity
        ? lastActivity.createdAt
            .toISOString()
        : null;
    return {
        ok: true,
        tweets: result,
        nextCursor,
    };
}
async function getTweetDetailsService(input) {
    const tweet = await Tweet_model_1.TweetModel.findOne({
        tweetId: (0, tweets_utils_1.cleanId)(input.tweetId),
        isDeleted: false,
    }).lean();
    if (!tweet) {
        return {
            ok: false,
            reason: "tweet_not_found",
        };
    }
    return {
        ok: true,
        tweet: await buildTweetResponse({
            tweet,
            viewerUserId: input.userId,
            feedItemId: `tweet:${tweet.tweetId}`,
            feedCreatedAt: tweet.createdAt,
        }),
    };
}
async function toggleTweetLikeService(input) {
    const permission = await checkTweetActionPermission(input.userId);
    if (!permission.ok) {
        return {
            ok: false,
            reason: permission.reason,
        };
    }
    const tweetId = (0, tweets_utils_1.cleanId)(input.tweetId);
    const tweet = await Tweet_model_1.TweetModel.findOne({
        tweetId,
        isDeleted: false,
    });
    if (!tweet) {
        return {
            ok: false,
            reason: "tweet_not_found",
        };
    }
    const existing = await TweetLike_model_1.TweetLikeModel.findOne({
        tweetId,
        userId: input.userId,
    });
    if (existing) {
        await existing.deleteOne();
        await safelyDecreaseCounter(tweetId, "likesCount");
        /*
          حذف إشعار اللايك عند إلغاء اللايك.
        */
        try {
            await (0, tweets_notifications_1.deleteTweetLikeNotification)({
                recipientUserId: tweet.authorId,
                senderUserId: input.userId,
                tweetId,
            });
        }
        catch (error) {
            console.error("[DELETE TWEET LIKE NOTIFICATION ERROR]", {
                tweetId,
                recipientUserId: tweet.authorId,
                senderUserId: input.userId,
                error,
            });
        }
        const updated = await Tweet_model_1.TweetModel.findOne({
            tweetId,
        }).lean();
        return {
            ok: true,
            liked: false,
            likesCount: Number(updated?.likesCount || 0),
        };
    }
    try {
        await TweetLike_model_1.TweetLikeModel.create({
            tweetId,
            userId: input.userId,
        });
    }
    catch (error) {
        if (error?.code !== 11000) {
            throw error;
        }
    }
    await Tweet_model_1.TweetModel.updateOne({
        tweetId,
    }, {
        $inc: {
            likesCount: 1,
        },
    });
    await (0, tweets_notifications_1.createTweetNotification)({
        recipientUserId: tweet.authorId,
        senderUserId: input.userId,
        senderUsername: input.username,
        type: "tweet_like",
        tweetId,
        body: `${input.username} liked your tweet`,
    });
    const updated = await Tweet_model_1.TweetModel.findOne({
        tweetId,
    }).lean();
    return {
        ok: true,
        liked: true,
        likesCount: Number(updated?.likesCount || 0),
    };
}
async function toggleTweetRetweetService(input) {
    const permission = await checkTweetActionPermission(input.userId);
    if (!permission.ok) {
        return {
            ok: false,
            reason: permission.reason,
        };
    }
    const tweetId = (0, tweets_utils_1.cleanId)(input.tweetId);
    const tweet = await Tweet_model_1.TweetModel.findOne({
        tweetId,
        isDeleted: false,
    });
    if (!tweet) {
        return {
            ok: false,
            reason: "tweet_not_found",
        };
    }
    const existing = await TweetRetweet_model_1.TweetRetweetModel.findOne({
        tweetId,
        userId: input.userId,
    });
    if (existing) {
        const removedRetweetId = String(existing._id);
        await existing.deleteOne();
        await safelyDecreaseCounter(tweetId, "retweetsCount");
        /*
          حذف إشعار الريتويت عند إلغاء الريتويت.
        */
        try {
            await (0, tweets_notifications_1.deleteTweetRetweetNotification)({
                recipientUserId: tweet.authorId,
                senderUserId: input.userId,
                tweetId,
            });
        }
        catch (error) {
            console.error("[DELETE TWEET RETWEET NOTIFICATION ERROR]", {
                tweetId,
                recipientUserId: tweet.authorId,
                senderUserId: input.userId,
                error,
            });
        }
        const updated = await Tweet_model_1.TweetModel.findOne({
            tweetId,
        }).lean();
        return {
            ok: true,
            retweeted: false,
            tweetId,
            removedFeedItemId: `retweet:${removedRetweetId}`,
            retweetBy: null,
            retweetsCount: Number(updated?.retweetsCount ||
                0),
        };
    }
    let createdRetweet;
    let wasCreated = false;
    try {
        createdRetweet =
            await TweetRetweet_model_1.TweetRetweetModel.create({
                tweetId,
                userId: input.userId,
                username: input.username,
            });
        wasCreated = true;
    }
    catch (error) {
        if (error?.code !== 11000) {
            throw error;
        }
        createdRetweet =
            await TweetRetweet_model_1.TweetRetweetModel.findOne({
                tweetId,
                userId: input.userId,
            });
    }
    if (!createdRetweet) {
        return {
            ok: false,
            reason: "retweet_create_failed",
        };
    }
    if (wasCreated) {
        await Tweet_model_1.TweetModel.updateOne({
            tweetId,
        }, {
            $inc: {
                retweetsCount: 1,
            },
        });
    }
    if (wasCreated &&
        tweet.authorId !==
            input.userId) {
        await (0, tweets_notifications_1.createTweetNotification)({
            recipientUserId: tweet.authorId,
            senderUserId: input.userId,
            senderUsername: input.username,
            type: "tweet_retweet",
            tweetId,
            body: `${input.username} retweeted your tweet`,
        });
    }
    const updated = await Tweet_model_1.TweetModel.findOne({
        tweetId,
    }).lean();
    const retweetObject = createdRetweet?.toObject
        ? createdRetweet.toObject()
        : createdRetweet;
    return {
        ok: true,
        retweeted: true,
        tweetId,
        feedItemId: `retweet:${String(retweetObject?._id)}`,
        feedCreatedAt: retweetObject?.createdAt,
        retweetBy: {
            userId: input.userId,
            username: input.username,
            createdAt: retweetObject?.createdAt,
        },
        retweetsCount: Number(updated?.retweetsCount ||
            0),
    };
}
async function addTweetViewService(input) {
    const tweetId = (0, tweets_utils_1.cleanId)(input.tweetId);
    const tweetExists = await Tweet_model_1.TweetModel.exists({
        tweetId,
        isDeleted: false,
    });
    if (!tweetExists) {
        return {
            ok: false,
            reason: "tweet_not_found",
        };
    }
    let viewAdded = false;
    try {
        await TweetView_model_1.TweetViewModel.create({
            tweetId,
            userId: input.userId,
        });
        viewAdded = true;
    }
    catch (error) {
        if (error?.code !== 11000) {
            throw error;
        }
    }
    if (viewAdded) {
        await Tweet_model_1.TweetModel.updateOne({
            tweetId,
        }, {
            $inc: {
                viewsCount: 1,
            },
        });
    }
    const tweet = await Tweet_model_1.TweetModel.findOne({
        tweetId,
    }).lean();
    return {
        ok: true,
        viewAdded,
        viewsCount: Number(tweet?.viewsCount || 0),
    };
}
async function createTweetCommentService(input) {
    const permission = await checkTweetActionPermission(input.userId);
    if (!permission.ok) {
        return {
            ok: false,
            reason: permission.reason,
        };
    }
    const tweetId = (0, tweets_utils_1.cleanId)(input.tweetId);
    const text = (0, tweets_utils_1.cleanText)(input.text);
    if (!text) {
        return {
            ok: false,
            reason: "comment_text_required",
        };
    }
    if (text.length >
        tweets_utils_1.TWEET_COMMENT_MAX_LENGTH) {
        return {
            ok: false,
            reason: "comment_text_too_long",
        };
    }
    const tweet = await Tweet_model_1.TweetModel.findOne({
        tweetId,
        isDeleted: false,
    });
    if (!tweet) {
        return {
            ok: false,
            reason: "tweet_not_found",
        };
    }
    const mentionedUsers = await (0, tweets_utils_1.resolveMentionedUsers)(text, input.userId);
    const comment = await TweetComment_model_1.TweetCommentModel.create({
        commentId: `comment_${(0, crypto_1.randomUUID)()}`,
        tweetId,
        authorId: input.userId,
        authorUsername: input.username,
        text,
        mentions: mentionedUsers.map((user) => user.userId),
    });
    await Tweet_model_1.TweetModel.updateOne({
        tweetId,
    }, {
        $inc: {
            commentsCount: 1,
        },
    });
    await (0, tweets_notifications_1.createTweetNotification)({
        recipientUserId: tweet.authorId,
        senderUserId: input.userId,
        senderUsername: input.username,
        type: "tweet_comment",
        tweetId,
        commentId: comment.commentId,
        body: `${input.username} commented on your tweet`,
    });
    for (const mentionedUser of mentionedUsers) {
        if (mentionedUser.userId ===
            tweet.authorId) {
            continue;
        }
        await (0, tweets_notifications_1.createTweetNotification)({
            recipientUserId: mentionedUser.userId,
            senderUserId: input.userId,
            senderUsername: input.username,
            type: "comment_mention",
            tweetId,
            commentId: comment.commentId,
            body: `${input.username} mentioned you in a comment`,
        });
    }
    return {
        ok: true,
        comment: await buildCommentResponse(comment.toObject()),
    };
}
async function buildCommentResponse(comment) {
    const author = await getTweetAuthor(comment.authorId);
    return {
        commentId: comment.commentId,
        tweetId: comment.tweetId,
        text: comment.text,
        author: (0, tweets_utils_1.publicTweetUser)(author),
        mentions: Array.isArray(comment.mentions)
            ? comment.mentions
            : [],
        isEdited: comment.isEdited === true,
        editedAt: comment.editedAt || null,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
    };
}
async function updateTweetCommentService(input) {
    const permission = await checkTweetActionPermission(input.userId);
    if (!permission.ok) {
        return {
            ok: false,
            reason: permission.reason,
        };
    }
    const commentId = (0, tweets_utils_1.cleanId)(input.commentId);
    const text = (0, tweets_utils_1.cleanText)(input.text);
    if (!text) {
        return {
            ok: false,
            reason: "comment_text_required",
        };
    }
    if (text.length >
        tweets_utils_1.TWEET_COMMENT_MAX_LENGTH) {
        return {
            ok: false,
            reason: "comment_text_too_long",
        };
    }
    const comment = await TweetComment_model_1.TweetCommentModel.findOne({
        commentId,
        isDeleted: false,
    });
    if (!comment) {
        return {
            ok: false,
            reason: "comment_not_found",
        };
    }
    if (comment.authorId !==
        input.userId) {
        return {
            ok: false,
            reason: "comment_update_forbidden",
        };
    }
    const oldMentions = new Set(comment.mentions || []);
    const mentionedUsers = await (0, tweets_utils_1.resolveMentionedUsers)(text, input.userId);
    comment.text = text;
    comment.mentions =
        mentionedUsers.map((user) => user.userId);
    comment.isEdited = true;
    comment.editedAt =
        new Date();
    await comment.save();
    for (const mentionedUser of mentionedUsers) {
        if (oldMentions.has(mentionedUser.userId)) {
            continue;
        }
        await (0, tweets_notifications_1.createTweetNotification)({
            recipientUserId: mentionedUser.userId,
            senderUserId: input.userId,
            senderUsername: input.username,
            type: "comment_mention",
            tweetId: comment.tweetId,
            commentId: comment.commentId,
            body: `${input.username} mentioned you in a comment`,
        });
    }
    return {
        ok: true,
        comment: await buildCommentResponse(comment.toObject()),
    };
}
async function deleteTweetCommentService(input) {
    const permission = await checkTweetActionPermission(input.userId);
    if (!permission.ok) {
        return {
            ok: false,
            reason: permission.reason,
        };
    }
    const comment = await TweetComment_model_1.TweetCommentModel.findOne({
        commentId: (0, tweets_utils_1.cleanId)(input.commentId),
        isDeleted: false,
    });
    if (!comment) {
        return {
            ok: false,
            reason: "comment_not_found",
        };
    }
    if (comment.authorId !==
        input.userId) {
        return {
            ok: false,
            reason: "comment_delete_forbidden",
        };
    }
    comment.isDeleted = true;
    comment.deletedAt =
        new Date();
    await comment.save();
    await safelyDecreaseCounter(comment.tweetId, "commentsCount");
    return {
        ok: true,
        commentId: comment.commentId,
        tweetId: comment.tweetId,
    };
}
async function listTweetCommentsService(input) {
    const tweetId = (0, tweets_utils_1.cleanId)(input.tweetId);
    const exists = await Tweet_model_1.TweetModel.exists({
        tweetId,
        isDeleted: false,
    });
    if (!exists) {
        return {
            ok: false,
            reason: "tweet_not_found",
        };
    }
    const limit = (0, tweets_utils_1.clampLimit)(input.limit, 20, 50);
    const cursor = (0, tweets_utils_1.parseCursor)(input.cursor);
    const query = {
        tweetId,
        isDeleted: false,
    };
    if (cursor) {
        query.createdAt = {
            $lt: cursor,
        };
    }
    const comments = await TweetComment_model_1.TweetCommentModel.find(query)
        .sort({
        createdAt: -1,
    })
        .limit(limit)
        .lean();
    const result = [];
    for (const comment of comments) {
        result.push(await buildCommentResponse(comment));
    }
    const nextCursor = comments.length === limit
        ? new Date(comments[comments.length - 1].createdAt).toISOString()
        : null;
    return {
        ok: true,
        comments: result,
        nextCursor,
    };
}
//# sourceMappingURL=tweets.service.js.map