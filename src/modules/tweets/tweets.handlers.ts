import { WsHandler } from "../../websocket/ws.types";
import { sendError, sendSuccess } from "../../websocket/ws.utils";
import { requireLogin } from "../../websocket/ws.auth";
import { WS_EVENTS, WS_HANDLERS } from "../../websocket/ws.events";
import { createId } from "../../utils/id";

const fakeTweets: any[] = [];

const handleTweetsList: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.TWEETS_LIST_EVENT)) return;

  sendSuccess(context.socket, {
    handler: WS_EVENTS.TWEETS_LIST_EVENT,
    request_id: context.message.request_id,
    tweets: fakeTweets,
  });
};

const handleTweetCreate: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.TWEET_CREATE_EVENT)) return;

  const body = String(context.message.body || "").trim();

  if (!body) {
    sendError(
      context.socket,
      WS_EVENTS.TWEET_CREATE_EVENT,
      "missing_body",
      context.message.request_id
    );

    return;
  }

  const tweet = {
    tweet_id: createId(),
    user_id: context.client!.userId,
    username: context.client!.username,
    body,
    likes_count: 0,
    comments_count: 0,
    retweets_count: 0,
    created_at: new Date().toISOString(),
  };

  fakeTweets.unshift(tweet);

  sendSuccess(context.socket, {
    handler: WS_EVENTS.TWEET_CREATE_EVENT,
    request_id: context.message.request_id,
    tweet,
  });
};

const handleTweetLike: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.TWEET_LIKE_EVENT)) return;

  sendSuccess(context.socket, {
    handler: WS_EVENTS.TWEET_LIKE_EVENT,
    request_id: context.message.request_id,
    tweet_id: context.message.tweet_id,
    liked: true,
  });
};

const handleTweetComment: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.TWEET_COMMENT_EVENT)) return;

  sendSuccess(context.socket, {
    handler: WS_EVENTS.TWEET_COMMENT_EVENT,
    request_id: context.message.request_id,
    comment: {
      comment_id: createId(),
      tweet_id: context.message.tweet_id,
      user_id: context.client!.userId,
      username: context.client!.username,
      body: context.message.body,
      created_at: new Date().toISOString(),
    },
  });
};

const handleTweetRetweet: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.TWEET_RETWEET_EVENT)) return;

  sendSuccess(context.socket, {
    handler: WS_EVENTS.TWEET_RETWEET_EVENT,
    request_id: context.message.request_id,
    tweet_id: context.message.tweet_id,
    retweeted: true,
  });
};

export const tweetsHandlers = {
  [WS_HANDLERS.TWEETS_LIST]: handleTweetsList,
  [WS_HANDLERS.TWEETS_CREATE]: handleTweetCreate,
  [WS_HANDLERS.TWEETS_LIKE]: handleTweetLike,
  [WS_HANDLERS.TWEETS_COMMENT]: handleTweetComment,
  [WS_HANDLERS.TWEETS_RETWEET]: handleTweetRetweet,
};