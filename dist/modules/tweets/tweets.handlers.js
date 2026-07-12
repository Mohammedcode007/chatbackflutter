"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tweetsHandlers = void 0;
const ws_utils_1 = require("../../websocket/ws.utils");
const tweets_validators_1 = require("./tweets.validators");
const tweets_service_1 = require("./tweets.service");
function requireAuth(context) {
    const userId = context.client?.userId;
    const username = context.client?.username;
    const isLoggedIn = context.client?.isLoggedIn ===
        true;
    if (!isLoggedIn ||
        !userId ||
        !username) {
        (0, ws_utils_1.sendError)(context.socket, "tweets.error_event", "unauthorized", context.message
            ?.request_id);
        return null;
    }
    return {
        userId,
        username,
    };
}
const handleCreateTweet = async (context) => {
    const auth = requireAuth(context);
    if (!auth)
        return;
    if (!(0, tweets_validators_1.isCreateTweetPayload)(context.message)) {
        (0, ws_utils_1.sendError)(context.socket, "tweets.create_event", "invalid_create_tweet_payload", context.message
            ?.request_id);
        return;
    }
    const result = await (0, tweets_service_1.createTweetService)({
        userId: auth.userId,
        username: auth.username,
        payload: context.message,
    });
    if (!result.ok) {
        (0, ws_utils_1.sendError)(context.socket, "tweets.create_event", result.reason, context.message
            .request_id);
        if ("remainingSeconds" in
            result) {
            (0, ws_utils_1.sendSuccess)(context.socket, {
                handler: "tweets.cooldown_event",
                request_id: context.message
                    .request_id,
                remaining_seconds: result.remainingSeconds,
            });
        }
        return;
    }
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: "tweets.create_event",
        request_id: context.message
            .request_id,
        tweet: result.tweet,
    });
};
const handleDeleteTweet = async (context) => {
    const auth = requireAuth(context);
    if (!auth)
        return;
    if (!(0, tweets_validators_1.isDeleteTweetPayload)(context.message)) {
        (0, ws_utils_1.sendError)(context.socket, "tweets.delete_event", "invalid_delete_tweet_payload", context.message
            ?.request_id);
        return;
    }
    const result = await (0, tweets_service_1.deleteTweetService)({
        userId: auth.userId,
        tweetId: context.message
            .tweet_id ??
            context.message
                .tweetId ??
            "",
    });
    if (!result.ok) {
        (0, ws_utils_1.sendError)(context.socket, "tweets.delete_event", result.reason, context.message
            .request_id);
        return;
    }
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: "tweets.delete_event",
        request_id: context.message
            .request_id,
        tweet_id: result.tweetId,
    });
};
const handleFeed = async (context) => {
    const auth = requireAuth(context);
    if (!auth)
        return;
    if (!(0, tweets_validators_1.isTweetFeedPayload)(context.message)) {
        (0, ws_utils_1.sendError)(context.socket, "tweets.feed_event", "invalid_tweet_feed_payload", context.message
            ?.request_id);
        return;
    }
    const result = await (0, tweets_service_1.getTweetFeedService)({
        userId: auth.userId,
        feedType: context.message
            .feed_type ??
            context.message
                .feedType ??
            "latest",
        cursor: context.message
            .cursor,
        limit: context.message
            .limit,
    });
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: "tweets.feed_event",
        request_id: context.message
            .request_id,
        tweets: result.tweets,
        next_cursor: result.nextCursor,
    });
};
const handleDetails = async (context) => {
    const auth = requireAuth(context);
    if (!auth)
        return;
    if (!(0, tweets_validators_1.isTweetDetailsPayload)(context.message)) {
        (0, ws_utils_1.sendError)(context.socket, "tweets.details_event", "invalid_tweet_details_payload", context.message
            ?.request_id);
        return;
    }
    const result = await (0, tweets_service_1.getTweetDetailsService)({
        userId: auth.userId,
        tweetId: context.message
            .tweet_id ??
            context.message
                .tweetId ??
            "",
    });
    if (!result.ok) {
        (0, ws_utils_1.sendError)(context.socket, "tweets.details_event", result.reason, context.message
            .request_id);
        return;
    }
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: "tweets.details_event",
        request_id: context.message
            .request_id,
        tweet: result.tweet,
    });
};
const handleLikeToggle = async (context) => {
    const auth = requireAuth(context);
    if (!auth)
        return;
    if (!(0, tweets_validators_1.isTweetLikePayload)(context.message)) {
        (0, ws_utils_1.sendError)(context.socket, "tweets.like_event", "invalid_tweet_like_payload", context.message
            ?.request_id);
        return;
    }
    const result = await (0, tweets_service_1.toggleTweetLikeService)({
        userId: auth.userId,
        username: auth.username,
        tweetId: context.message
            .tweet_id ??
            context.message
                .tweetId ??
            "",
    });
    if (!result.ok) {
        (0, ws_utils_1.sendError)(context.socket, "tweets.like_event", result.reason, context.message
            .request_id);
        return;
    }
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: "tweets.like_event",
        request_id: context.message
            .request_id,
        tweet_id: context.message
            .tweet_id ??
            context.message
                .tweetId,
        liked: result.liked,
        likes_count: result.likesCount,
    });
};
const handleRetweetToggle = async (context) => {
    const auth = requireAuth(context);
    if (!auth)
        return;
    if (!(0, tweets_validators_1.isTweetRetweetPayload)(context.message)) {
        (0, ws_utils_1.sendError)(context.socket, "tweets.retweet_event", "invalid_retweet_payload", context.message
            ?.request_id);
        return;
    }
    const result = await (0, tweets_service_1.toggleTweetRetweetService)({
        userId: auth.userId,
        username: auth.username,
        tweetId: context.message
            .tweet_id ??
            context.message
                .tweetId ??
            "",
    });
    if (!result.ok) {
        (0, ws_utils_1.sendError)(context.socket, "tweets.retweet_event", result.reason, context.message
            .request_id);
        return;
    }
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: "tweets.retweet_event",
        request_id: context.message
            .request_id,
        tweet_id: context.message
            .tweet_id ??
            context.message
                .tweetId,
        retweeted: result.retweeted,
        retweets_count: result.retweetsCount,
    });
};
const handleView = async (context) => {
    const auth = requireAuth(context);
    if (!auth)
        return;
    if (!(0, tweets_validators_1.isTweetViewPayload)(context.message)) {
        (0, ws_utils_1.sendError)(context.socket, "tweets.view_event", "invalid_tweet_view_payload", context.message
            ?.request_id);
        return;
    }
    const result = await (0, tweets_service_1.addTweetViewService)({
        userId: auth.userId,
        tweetId: context.message
            .tweet_id ??
            context.message
                .tweetId ??
            "",
    });
    if (!result.ok) {
        (0, ws_utils_1.sendError)(context.socket, "tweets.view_event", result.reason, context.message
            .request_id);
        return;
    }
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: "tweets.view_event",
        request_id: context.message
            .request_id,
        tweet_id: context.message
            .tweet_id ??
            context.message
                .tweetId,
        view_added: result.viewAdded,
        views_count: result.viewsCount,
    });
};
const handleCreateComment = async (context) => {
    const auth = requireAuth(context);
    if (!auth)
        return;
    if (!(0, tweets_validators_1.isCreateCommentPayload)(context.message)) {
        (0, ws_utils_1.sendError)(context.socket, "tweets.comment_event", "invalid_create_comment_payload", context.message
            ?.request_id);
        return;
    }
    const result = await (0, tweets_service_1.createTweetCommentService)({
        userId: auth.userId,
        username: auth.username,
        tweetId: context.message
            .tweet_id ??
            context.message
                .tweetId ??
            "",
        text: context.message
            .text ??
            "",
    });
    if (!result.ok) {
        (0, ws_utils_1.sendError)(context.socket, "tweets.comment_event", result.reason, context.message
            .request_id);
        return;
    }
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: "tweets.comment_event",
        type: "created",
        request_id: context.message
            .request_id,
        comment: result.comment,
    });
};
const handleUpdateComment = async (context) => {
    const auth = requireAuth(context);
    if (!auth)
        return;
    if (!(0, tweets_validators_1.isUpdateCommentPayload)(context.message)) {
        (0, ws_utils_1.sendError)(context.socket, "tweets.comment_event", "invalid_update_comment_payload", context.message
            ?.request_id);
        return;
    }
    const result = await (0, tweets_service_1.updateTweetCommentService)({
        userId: auth.userId,
        username: auth.username,
        commentId: context.message
            .comment_id ??
            context.message
                .commentId ??
            "",
        text: context.message
            .text ??
            "",
    });
    if (!result.ok) {
        (0, ws_utils_1.sendError)(context.socket, "tweets.comment_event", result.reason, context.message
            .request_id);
        return;
    }
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: "tweets.comment_event",
        type: "updated",
        request_id: context.message
            .request_id,
        comment: result.comment,
    });
};
const handleDeleteComment = async (context) => {
    const auth = requireAuth(context);
    if (!auth)
        return;
    if (!(0, tweets_validators_1.isDeleteCommentPayload)(context.message)) {
        (0, ws_utils_1.sendError)(context.socket, "tweets.comment_event", "invalid_delete_comment_payload", context.message
            ?.request_id);
        return;
    }
    const result = await (0, tweets_service_1.deleteTweetCommentService)({
        userId: auth.userId,
        commentId: context.message
            .comment_id ??
            context.message
                .commentId ??
            "",
    });
    if (!result.ok) {
        (0, ws_utils_1.sendError)(context.socket, "tweets.comment_event", result.reason, context.message
            .request_id);
        return;
    }
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: "tweets.comment_event",
        type: "deleted",
        request_id: context.message
            .request_id,
        comment_id: result.commentId,
        tweet_id: result.tweetId,
    });
};
const handleCommentsList = async (context) => {
    const auth = requireAuth(context);
    if (!auth)
        return;
    if (!(0, tweets_validators_1.isCommentsListPayload)(context.message)) {
        (0, ws_utils_1.sendError)(context.socket, "tweets.comments_event", "invalid_comments_list_payload", context.message
            ?.request_id);
        return;
    }
    const result = await (0, tweets_service_1.listTweetCommentsService)({
        tweetId: context.message
            .tweet_id ??
            context.message
                .tweetId ??
            "",
        cursor: context.message
            .cursor,
        limit: context.message
            .limit,
    });
    if (!result.ok) {
        (0, ws_utils_1.sendError)(context.socket, "tweets.comments_event", result.reason, context.message
            .request_id);
        return;
    }
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: "tweets.comments_event",
        request_id: context.message
            .request_id,
        comments: result.comments,
        next_cursor: result.nextCursor,
    });
};
exports.tweetsHandlers = {
    "tweets.create": handleCreateTweet,
    "tweets.delete": handleDeleteTweet,
    "tweets.feed": handleFeed,
    "tweets.details": handleDetails,
    "tweets.like.toggle": handleLikeToggle,
    "tweets.retweet.toggle": handleRetweetToggle,
    "tweets.view": handleView,
    "tweets.comment.create": handleCreateComment,
    "tweets.comment.update": handleUpdateComment,
    "tweets.comment.delete": handleDeleteComment,
    "tweets.comments.list": handleCommentsList,
};
//# sourceMappingURL=tweets.handlers.js.map