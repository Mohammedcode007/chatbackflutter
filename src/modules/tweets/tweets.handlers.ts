import type {
  WsHandler,
} from "../../websocket/ws.types";

import {
  sendError,
  sendSuccess,
} from "../../websocket/ws.utils";

import {
  isCommentsListPayload,
  isCreateCommentPayload,
  isCreateTweetPayload,
  isDeleteCommentPayload,
  isDeleteTweetPayload,
  isTweetDetailsPayload,
  isTweetFeedPayload,
  isTweetLikePayload,
  isTweetRetweetPayload,
  isTweetViewPayload,
  isUpdateCommentPayload,
} from "./tweets.validators";

import {
  addTweetViewService,
  createTweetCommentService,
  createTweetService,
  deleteTweetCommentService,
  deleteTweetService,
  getTweetDetailsService,
  getTweetFeedService,
  listTweetCommentsService,
  toggleTweetLikeService,
  toggleTweetRetweetService,
  updateTweetCommentService,
} from "./tweets.service";

function requireAuth(
  context: Parameters<WsHandler>[0]
) {
  const userId =
    context.client?.userId;

  const username =
    context.client?.username;

  const isLoggedIn =
    context.client?.isLoggedIn ===
    true;

  if (
    !isLoggedIn ||
    !userId ||
    !username
  ) {
    sendError(
      context.socket,
      "tweets.error_event",
      "unauthorized",
      context.message
        ?.request_id
    );

    return null;
  }

  return {
    userId,
    username,
  };
}

const handleCreateTweet: WsHandler =
  async (context) => {
    const auth =
      requireAuth(context);

    if (!auth) return;

    if (
      !isCreateTweetPayload(
        context.message
      )
    ) {
      sendError(
        context.socket,
        "tweets.create_event",
        "invalid_create_tweet_payload",
        context.message
          ?.request_id
      );

      return;
    }

    const result =
      await createTweetService({
        userId:
          auth.userId,

        username:
          auth.username,

        payload:
          context.message,
      });

    if (!result.ok) {
      sendError(
        context.socket,
        "tweets.create_event",
        result.reason,
        context.message
          .request_id
      );

      if (
        "remainingSeconds" in
        result
      ) {
        sendSuccess(
          context.socket,
          {
            handler:
              "tweets.cooldown_event",

            request_id:
              context.message
                .request_id,

            remaining_seconds:
              result.remainingSeconds,
          }
        );
      }

      return;
    }

    sendSuccess(
      context.socket,
      {
        handler:
          "tweets.create_event",

        request_id:
          context.message
            .request_id,

        tweet:
          result.tweet,
      }
    );
  };

const handleDeleteTweet: WsHandler =
  async (context) => {
    const auth =
      requireAuth(context);

    if (!auth) return;

    if (
      !isDeleteTweetPayload(
        context.message
      )
    ) {
      sendError(
        context.socket,
        "tweets.delete_event",
        "invalid_delete_tweet_payload",
        context.message
          ?.request_id
      );

      return;
    }

    const result =
      await deleteTweetService({
        userId:
          auth.userId,

        tweetId:
          context.message
            .tweet_id ??
          context.message
            .tweetId ??
          "",
      });

    if (!result.ok) {
      sendError(
        context.socket,
        "tweets.delete_event",
        result.reason,
        context.message
          .request_id
      );

      return;
    }

    sendSuccess(
      context.socket,
      {
        handler:
          "tweets.delete_event",

        request_id:
          context.message
            .request_id,

        tweet_id:
          result.tweetId,
      }
    );
  };

const handleFeed: WsHandler =
  async (context) => {
    const auth =
      requireAuth(context);

    if (!auth) return;

    if (
      !isTweetFeedPayload(
        context.message
      )
    ) {
      sendError(
        context.socket,
        "tweets.feed_event",
        "invalid_tweet_feed_payload",
        context.message
          ?.request_id
      );

      return;
    }

    const result =
      await getTweetFeedService({
        userId:
          auth.userId,

        feedType:
          context.message
            .feed_type ??
          context.message
            .feedType ??
          "latest",

        cursor:
          context.message
            .cursor,

        limit:
          context.message
            .limit,
      });

    sendSuccess(
      context.socket,
      {
        handler:
          "tweets.feed_event",

        request_id:
          context.message
            .request_id,

        tweets:
          result.tweets,

        next_cursor:
          result.nextCursor,
      }
    );
  };

const handleDetails: WsHandler =
  async (context) => {
    const auth =
      requireAuth(context);

    if (!auth) return;

    if (
      !isTweetDetailsPayload(
        context.message
      )
    ) {
      sendError(
        context.socket,
        "tweets.details_event",
        "invalid_tweet_details_payload",
        context.message
          ?.request_id
      );

      return;
    }

    const result =
      await getTweetDetailsService({
        userId:
          auth.userId,

        tweetId:
          context.message
            .tweet_id ??
          context.message
            .tweetId ??
          "",
      });

    if (!result.ok) {
      sendError(
        context.socket,
        "tweets.details_event",
        result.reason,
        context.message
          .request_id
      );

      return;
    }

    sendSuccess(
      context.socket,
      {
        handler:
          "tweets.details_event",

        request_id:
          context.message
            .request_id,

        tweet:
          result.tweet,
      }
    );
  };

const handleLikeToggle: WsHandler =
  async (context) => {
    const auth =
      requireAuth(context);

    if (!auth) return;

    if (
      !isTweetLikePayload(
        context.message
      )
    ) {
      sendError(
        context.socket,
        "tweets.like_event",
        "invalid_tweet_like_payload",
        context.message
          ?.request_id
      );

      return;
    }

    const result =
      await toggleTweetLikeService({
        userId:
          auth.userId,

        username:
          auth.username,

        tweetId:
          context.message
            .tweet_id ??
          context.message
            .tweetId ??
          "",
      });

    if (!result.ok) {
      sendError(
        context.socket,
        "tweets.like_event",
        result.reason,
        context.message
          .request_id
      );

      return;
    }

    sendSuccess(
      context.socket,
      {
        handler:
          "tweets.like_event",

        request_id:
          context.message
            .request_id,

        tweet_id:
          context.message
            .tweet_id ??
          context.message
            .tweetId,

        liked:
          result.liked,

        likes_count:
          result.likesCount,
      }
    );
  };

const handleRetweetToggle: WsHandler =
  async (context) => {
    const auth =
      requireAuth(context);

    if (!auth) return;

    if (
      !isTweetRetweetPayload(
        context.message
      )
    ) {
      sendError(
        context.socket,
        "tweets.retweet_event",
        "invalid_retweet_payload",
        context.message
          ?.request_id
      );

      return;
    }

    const result =
      await toggleTweetRetweetService({
        userId:
          auth.userId,

        username:
          auth.username,

        tweetId:
          context.message
            .tweet_id ??
          context.message
            .tweetId ??
          "",
      });

    if (!result.ok) {
      sendError(
        context.socket,
        "tweets.retweet_event",
        result.reason,
        context.message
          .request_id
      );

      return;
    }

    sendSuccess(
      context.socket,
      {
        handler:
          "tweets.retweet_event",

        request_id:
          context.message
            .request_id,

        tweet_id:
          context.message
            .tweet_id ??
          context.message
            .tweetId,

        retweeted:
          result.retweeted,

        retweets_count:
          result.retweetsCount,
      }
    );
  };

const handleView: WsHandler =
  async (context) => {
    const auth =
      requireAuth(context);

    if (!auth) return;

    if (
      !isTweetViewPayload(
        context.message
      )
    ) {
      sendError(
        context.socket,
        "tweets.view_event",
        "invalid_tweet_view_payload",
        context.message
          ?.request_id
      );

      return;
    }

    const result =
      await addTweetViewService({
        userId:
          auth.userId,

        tweetId:
          context.message
            .tweet_id ??
          context.message
            .tweetId ??
          "",
      });

    if (!result.ok) {
      sendError(
        context.socket,
        "tweets.view_event",
        result.reason,
        context.message
          .request_id
      );

      return;
    }

    sendSuccess(
      context.socket,
      {
        handler:
          "tweets.view_event",

        request_id:
          context.message
            .request_id,

        tweet_id:
          context.message
            .tweet_id ??
          context.message
            .tweetId,

        view_added:
          result.viewAdded,

        views_count:
          result.viewsCount,
      }
    );
  };

const handleCreateComment: WsHandler =
  async (context) => {
    const auth =
      requireAuth(context);

    if (!auth) return;

    if (
      !isCreateCommentPayload(
        context.message
      )
    ) {
      sendError(
        context.socket,
        "tweets.comment_event",
        "invalid_create_comment_payload",
        context.message
          ?.request_id
      );

      return;
    }

    const result =
      await createTweetCommentService({
        userId:
          auth.userId,

        username:
          auth.username,

        tweetId:
          context.message
            .tweet_id ??
          context.message
            .tweetId ??
          "",

        text:
          context.message
            .text ??
          "",
      });

    if (!result.ok) {
      sendError(
        context.socket,
        "tweets.comment_event",
        result.reason,
        context.message
          .request_id
      );

      return;
    }

    sendSuccess(
      context.socket,
      {
        handler:
          "tweets.comment_event",

        type:
          "created",

        request_id:
          context.message
            .request_id,

        comment:
          result.comment,
      }
    );
  };

const handleUpdateComment: WsHandler =
  async (context) => {
    const auth =
      requireAuth(context);

    if (!auth) return;

    if (
      !isUpdateCommentPayload(
        context.message
      )
    ) {
      sendError(
        context.socket,
        "tweets.comment_event",
        "invalid_update_comment_payload",
        context.message
          ?.request_id
      );

      return;
    }

    const result =
      await updateTweetCommentService({
        userId:
          auth.userId,

        username:
          auth.username,

        commentId:
          context.message
            .comment_id ??
          context.message
            .commentId ??
          "",

        text:
          context.message
            .text ??
          "",
      });

    if (!result.ok) {
      sendError(
        context.socket,
        "tweets.comment_event",
        result.reason,
        context.message
          .request_id
      );

      return;
    }

    sendSuccess(
      context.socket,
      {
        handler:
          "tweets.comment_event",

        type:
          "updated",

        request_id:
          context.message
            .request_id,

        comment:
          result.comment,
      }
    );
  };

const handleDeleteComment: WsHandler =
  async (context) => {
    const auth =
      requireAuth(context);

    if (!auth) return;

    if (
      !isDeleteCommentPayload(
        context.message
      )
    ) {
      sendError(
        context.socket,
        "tweets.comment_event",
        "invalid_delete_comment_payload",
        context.message
          ?.request_id
      );

      return;
    }

    const result =
      await deleteTweetCommentService({
        userId:
          auth.userId,

        commentId:
          context.message
            .comment_id ??
          context.message
            .commentId ??
          "",
      });

    if (!result.ok) {
      sendError(
        context.socket,
        "tweets.comment_event",
        result.reason,
        context.message
          .request_id
      );

      return;
    }

    sendSuccess(
      context.socket,
      {
        handler:
          "tweets.comment_event",

        type:
          "deleted",

        request_id:
          context.message
            .request_id,

        comment_id:
          result.commentId,

        tweet_id:
          result.tweetId,
      }
    );
  };

const handleCommentsList: WsHandler =
  async (context) => {
    const auth =
      requireAuth(context);

    if (!auth) return;

    if (
      !isCommentsListPayload(
        context.message
      )
    ) {
      sendError(
        context.socket,
        "tweets.comments_event",
        "invalid_comments_list_payload",
        context.message
          ?.request_id
      );

      return;
    }

    const result =
      await listTweetCommentsService({
        tweetId:
          context.message
            .tweet_id ??
          context.message
            .tweetId ??
          "",

        cursor:
          context.message
            .cursor,

        limit:
          context.message
            .limit,
      });

    if (!result.ok) {
      sendError(
        context.socket,
        "tweets.comments_event",
        result.reason,
        context.message
          .request_id
      );

      return;
    }

    sendSuccess(
      context.socket,
      {
        handler:
          "tweets.comments_event",

        request_id:
          context.message
            .request_id,

        comments:
          result.comments,

        next_cursor:
          result.nextCursor,
      }
    );
  };

export const tweetsHandlers: Record<string, WsHandler> = {
    "tweets.create":
    handleCreateTweet,

  "tweets.delete":
    handleDeleteTweet,

  "tweets.feed":
    handleFeed,

  "tweets.details":
    handleDetails,

  "tweets.like.toggle":
    handleLikeToggle,

  "tweets.retweet.toggle":
    handleRetweetToggle,

  "tweets.view":
    handleView,

  "tweets.comment.create":
    handleCreateComment,

  "tweets.comment.update":
    handleUpdateComment,

  "tweets.comment.delete":
    handleDeleteComment,

  "tweets.comments.list":
    handleCommentsList,
};