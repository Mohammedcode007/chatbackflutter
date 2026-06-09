export const WS_HANDLERS = {
  AUTH_LOGIN: "auth.login",
  AUTH_LOGOUT: "auth.logout",
AUTH_REGISTER: "auth.register",
  USERS_SETTINGS_UPDATE: "users.settings.update",
  USERS_BLOCK: "users.block",
  USERS_UNBLOCK: "users.unblock",

  FRIENDS_LIST: "friends.list",
  FRIENDS_REQUEST: "friends.request",
  FRIENDS_ACCEPT: "friends.accept",
  FRIENDS_REJECT: "friends.reject",
  FRIENDS_REMOVE: "friends.remove",

  CHATS_LIST: "chats.list",
  CHATS_OPEN: "chats.open",
  CHATS_MESSAGE_SEND: "chats.message.send",
  CHATS_MESSAGE_SEEN: "chats.message.seen",
  CHATS_TYPING_START: "chats.typing.start",
  CHATS_TYPING_STOP: "chats.typing.stop",
  CHATS_PENDING_DELIVER: "chats.pending.deliver",

  ROOMS_LIST: "rooms.list",
  ROOMS_JOIN: "rooms.join",
  ROOMS_LEAVE: "rooms.leave",
  ROOMS_MESSAGE_SEND: "rooms.message.send",
  ROOMS_USERS_LIST: "rooms.users.list",

  TWEETS_CREATE: "tweets.create",
  TWEETS_LIST: "tweets.list",
  TWEETS_LIKE: "tweets.like",
  TWEETS_COMMENT: "tweets.comment",
  TWEETS_RETWEET: "tweets.retweet",

  NOTIFICATIONS_LIST: "notifications.list",
  NOTIFICATIONS_READ: "notifications.read",

  FEATURES_MY: "features.my",
  FEATURES_ACTIVATE: "features.activate",
} as const;

export const WS_EVENTS = {
  CONNECTION_EVENT: "connection_event",

  LOGIN_EVENT: "login_event",
  LOGOUT_EVENT: "logout_event",
REGISTER_EVENT: "register_event",
  USER_SETTINGS_EVENT: "user_settings_event",
  USER_BLOCK_EVENT: "user_block_event",

  FRIENDS_LIST_EVENT: "friends_list_event",
  FRIEND_REQUEST_EVENT: "friend_request_event",
  FRIEND_ACCEPT_EVENT: "friend_accept_event",
  FRIEND_REJECT_EVENT: "friend_reject_event",
  FRIEND_REMOVE_EVENT: "friend_remove_event",

  CHATS_LIST_EVENT: "chats_list_event",
  CHAT_OPEN_EVENT: "chat_open_event",
  CHAT_MESSAGE_EVENT: "chat_message_event",
  CHAT_MESSAGE_SEEN_EVENT: "chat_message_seen_event",
  CHAT_TYPING_EVENT: "chat_typing_event",
  CHAT_PENDING_DELIVERY_EVENT: "chat_pending_delivery_event",

  ROOMS_LIST_EVENT: "rooms_list_event",
  ROOM_JOIN_EVENT: "room_join_event",
  ROOM_LEAVE_EVENT: "room_leave_event",
  ROOM_MESSAGE_EVENT: "room_message_event",
  ROOM_USERS_EVENT: "room_users_event",

  TWEETS_LIST_EVENT: "tweets_list_event",
  TWEET_CREATE_EVENT: "tweet_create_event",
  TWEET_LIKE_EVENT: "tweet_like_event",
  TWEET_COMMENT_EVENT: "tweet_comment_event",
  TWEET_RETWEET_EVENT: "tweet_retweet_event",

  NOTIFICATION_EVENT: "notification_event",
  FEATURES_EVENT: "features_event",

  ERROR_EVENT: "error_event",
} as const;