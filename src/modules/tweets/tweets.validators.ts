import type {
  CommentsListPayload,
  CreateCommentPayload,
  CreateTweetPayload,
  DeleteCommentPayload,
  DeleteTweetPayload,
  TweetDetailsPayload,
  TweetFeedPayload,
  TweetLikeTogglePayload,
  TweetRetweetTogglePayload,
  TweetViewPayload,
  UpdateCommentPayload,
} from "./tweets.types";

export function isCreateTweetPayload(
  message: any
): message is CreateTweetPayload {
  return (
    message &&
    message.handler ===
      "tweets.create" &&
    (message.request_id === undefined ||
      typeof message.request_id ===
        "string") &&
    (message.text === undefined ||
      typeof message.text === "string") &&
    (message.media === undefined ||
      Array.isArray(message.media))
  );
}

export function isDeleteTweetPayload(
  message: any
): message is DeleteTweetPayload {
  return (
    message &&
    message.handler ===
      "tweets.delete" &&
    typeof (
      message.tweet_id ??
      message.tweetId
    ) === "string"
  );
}

export function isTweetFeedPayload(
  message: any
): message is TweetFeedPayload {
  return (
    message &&
    message.handler ===
      "tweets.feed"
  );
}

export function isTweetDetailsPayload(
  message: any
): message is TweetDetailsPayload {
  return (
    message &&
    message.handler ===
      "tweets.details" &&
    typeof (
      message.tweet_id ??
      message.tweetId
    ) === "string"
  );
}

export function isTweetLikePayload(
  message: any
): message is TweetLikeTogglePayload {
  return (
    message &&
    message.handler ===
      "tweets.like.toggle" &&
    typeof (
      message.tweet_id ??
      message.tweetId
    ) === "string"
  );
}

export function isTweetRetweetPayload(
  message: any
): message is TweetRetweetTogglePayload {
  return (
    message &&
    message.handler ===
      "tweets.retweet.toggle" &&
    typeof (
      message.tweet_id ??
      message.tweetId
    ) === "string"
  );
}

export function isTweetViewPayload(
  message: any
): message is TweetViewPayload {
  return (
    message &&
    message.handler ===
      "tweets.view" &&
    typeof (
      message.tweet_id ??
      message.tweetId
    ) === "string"
  );
}

export function isCreateCommentPayload(
  message: any
): message is CreateCommentPayload {
  return (
    message &&
    message.handler ===
      "tweets.comment.create" &&
    typeof (
      message.tweet_id ??
      message.tweetId
    ) === "string" &&
    typeof message.text === "string"
  );
}

export function isUpdateCommentPayload(
  message: any
): message is UpdateCommentPayload {
  return (
    message &&
    message.handler ===
      "tweets.comment.update" &&
    typeof (
      message.comment_id ??
      message.commentId
    ) === "string" &&
    typeof message.text === "string"
  );
}

export function isDeleteCommentPayload(
  message: any
): message is DeleteCommentPayload {
  return (
    message &&
    message.handler ===
      "tweets.comment.delete" &&
    typeof (
      message.comment_id ??
      message.commentId
    ) === "string"
  );
}

export function isCommentsListPayload(
  message: any
): message is CommentsListPayload {
  return (
    message &&
    message.handler ===
      "tweets.comments.list" &&
    typeof (
      message.tweet_id ??
      message.tweetId
    ) === "string"
  );
}