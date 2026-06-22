export type TweetMediaType =
  | "none"
  | "images"
  | "video";

export type TweetMediaPayload = {
  type: "image" | "video";

  url: string;
  public_id?: string;
  publicId?: string;

  thumbnail_url?: string;
  thumbnailUrl?: string;

  width?: number;
  height?: number;
  duration?: number;
};

export type CreateTweetPayload = {
  handler: "tweets.create";

  request_id?: string;

  text?: string;

  media_type?: TweetMediaType;
  mediaType?: TweetMediaType;

  media?: TweetMediaPayload[];
};

export type DeleteTweetPayload = {
  handler: "tweets.delete";

  request_id?: string;

  tweet_id?: string;
  tweetId?: string;
};

export type TweetFeedPayload = {
  handler: "tweets.feed";

  request_id?: string;

  feed_type?: "latest" | "friends";
  feedType?: "latest" | "friends";

  cursor?: string | null;
  limit?: number;
};

export type TweetDetailsPayload = {
  handler: "tweets.details";

  request_id?: string;

  tweet_id?: string;
  tweetId?: string;
};

export type TweetLikeTogglePayload = {
  handler: "tweets.like.toggle";

  request_id?: string;

  tweet_id?: string;
  tweetId?: string;
};

export type TweetRetweetTogglePayload = {
  handler: "tweets.retweet.toggle";

  request_id?: string;

  tweet_id?: string;
  tweetId?: string;
};

export type TweetViewPayload = {
  handler: "tweets.view";

  request_id?: string;

  tweet_id?: string;
  tweetId?: string;
};

export type CreateCommentPayload = {
  handler: "tweets.comment.create";

  request_id?: string;

  tweet_id?: string;
  tweetId?: string;

  text?: string;
};

export type UpdateCommentPayload = {
  handler: "tweets.comment.update";

  request_id?: string;

  comment_id?: string;
  commentId?: string;

  text?: string;
};

export type DeleteCommentPayload = {
  handler: "tweets.comment.delete";

  request_id?: string;

  comment_id?: string;
  commentId?: string;
};

export type CommentsListPayload = {
  handler: "tweets.comments.list";

  request_id?: string;

  tweet_id?: string;
  tweetId?: string;

  cursor?: string | null;
  limit?: number;
};