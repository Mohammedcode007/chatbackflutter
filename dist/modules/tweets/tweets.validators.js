"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCreateTweetPayload = isCreateTweetPayload;
exports.isDeleteTweetPayload = isDeleteTweetPayload;
exports.isTweetFeedPayload = isTweetFeedPayload;
exports.isTweetDetailsPayload = isTweetDetailsPayload;
exports.isTweetLikePayload = isTweetLikePayload;
exports.isTweetRetweetPayload = isTweetRetweetPayload;
exports.isTweetViewPayload = isTweetViewPayload;
exports.isCreateCommentPayload = isCreateCommentPayload;
exports.isUpdateCommentPayload = isUpdateCommentPayload;
exports.isDeleteCommentPayload = isDeleteCommentPayload;
exports.isCommentsListPayload = isCommentsListPayload;
function isCreateTweetPayload(message) {
    return (message &&
        message.handler ===
            "tweets.create" &&
        (message.request_id === undefined ||
            typeof message.request_id ===
                "string") &&
        (message.text === undefined ||
            typeof message.text === "string") &&
        (message.media === undefined ||
            Array.isArray(message.media)));
}
function isDeleteTweetPayload(message) {
    return (message &&
        message.handler ===
            "tweets.delete" &&
        typeof (message.tweet_id ??
            message.tweetId) === "string");
}
function isTweetFeedPayload(message) {
    return (message &&
        message.handler ===
            "tweets.feed");
}
function isTweetDetailsPayload(message) {
    return (message &&
        message.handler ===
            "tweets.details" &&
        typeof (message.tweet_id ??
            message.tweetId) === "string");
}
function isTweetLikePayload(message) {
    return (message &&
        message.handler ===
            "tweets.like.toggle" &&
        typeof (message.tweet_id ??
            message.tweetId) === "string");
}
function isTweetRetweetPayload(message) {
    return (message &&
        message.handler ===
            "tweets.retweet.toggle" &&
        typeof (message.tweet_id ??
            message.tweetId) === "string");
}
function isTweetViewPayload(message) {
    return (message &&
        message.handler ===
            "tweets.view" &&
        typeof (message.tweet_id ??
            message.tweetId) === "string");
}
function isCreateCommentPayload(message) {
    return (message &&
        message.handler ===
            "tweets.comment.create" &&
        typeof (message.tweet_id ??
            message.tweetId) === "string" &&
        typeof message.text === "string");
}
function isUpdateCommentPayload(message) {
    return (message &&
        message.handler ===
            "tweets.comment.update" &&
        typeof (message.comment_id ??
            message.commentId) === "string" &&
        typeof message.text === "string");
}
function isDeleteCommentPayload(message) {
    return (message &&
        message.handler ===
            "tweets.comment.delete" &&
        typeof (message.comment_id ??
            message.commentId) === "string");
}
function isCommentsListPayload(message) {
    return (message &&
        message.handler ===
            "tweets.comments.list" &&
        typeof (message.tweet_id ??
            message.tweetId) === "string");
}
//# sourceMappingURL=tweets.validators.js.map