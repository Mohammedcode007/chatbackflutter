export const WS_HANDLERS = {
  AUTH_LOGIN: "auth.login",
  AUTH_REGISTER: "auth.register",
  AUTH_LOGOUT: "auth.logout",
  AUTH_RESUME: "auth.resume",
  AUTH_FORGOT_PASSWORD: "auth.forgot_password",
  AUTH_VERIFY_OTP: "auth.verify_otp",
  AUTH_RESET_PASSWORD: "auth.reset_password",

  STORE_ITEMS_LIST: "store.items.list",
  STORE_ITEM_BUY: "store.item.buy",
  STORE_ITEM_ACTIVATE: "store.item.activate",
  STORE_POINTS_ADD: "store.points.add",

  USERS_BLOCKED_LIST: "users.blocked.list",
  USERS_PROFILE_GET: "users.profile.get",
  USERS_SEARCH: "users.search",
  USERS_SETTINGS_UPDATE: "users.settings.update",
  USERS_PROFILE_UPDATE: "users.profile.update",
  USERS_PROFILE_IMAGE_UPDATE: "users.profile.image.update",
  USERS_DELETE_ACCOUNT: "users.account.delete",
  USERS_BLOCK: "users.block",
  USERS_UNBLOCK: "users.unblock",
ROOM_UNBAN: "room.unban",
  DM_SEND: "dm.send",
  DM_TYPING: "dm.typing",
  DM_SEEN: "dm.seen",
  DM_EDIT: "dm.edit",
  DM_DELETE: "dm.delete",
  DM_CLEAR: "dm.clear",
  DM_SHARE: "dm.share",
  DM_PENDING_DELIVER: "dm.pending.deliver",

  DM_OPEN: "dm.open",
  DM_CLOSE: "dm.close",

  FRIEND_REQUEST_SEND: "friend.request.send",
  FRIEND_REQUEST_RESPOND: "friend.request.respond",
  FRIEND_REQUESTS_INCOMING_LIST: "friend.requests.incoming.list",

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

  TWEETS_LIST: "tweets.list",
  TWEETS_LIKE: "tweets.like",
  TWEETS_COMMENT: "tweets.comment",
  TWEETS_RETWEET: "tweets.retweet",

  NOTIFICATIONS_LIST: "notifications.list",
  NOTIFICATIONS_READ: "notifications.read",

  FEATURES_MY: "features.my",
  FEATURES_ACTIVATE: "features.activate",

  ROOM_CREATE: "room.create",
  ROOM_JOIN: "room.join",
  ROOM_LEAVE: "room.leave",
  ROOM_LIST: "room.list",

  ROOM_MESSAGE_SEND: "room.message.send",
  ROOM_MESSAGE_REACTION: "room.message.reaction",

  ROOM_ROLE_SET: "room.role.set",

// الجديد: جلب الرتب وحذف الرتبة
ROOM_ROLES_LIST: "room.roles.list",
ROOM_ROLE_REMOVE: "room.role.remove",

// الجديد: جلب لوجات الغرفة والمحظورين
ROOM_LOGS_LIST: "room.logs.list",
ROOM_BANNED_LIST: "room.banned.list",
  /*
    الجديد للطرد والحظر.
  */
  ROOM_KICK: "room.kick",
  ROOM_BAN: "room.ban",

  /*
    اتركه مؤقتًا لو مستخدم في ملفات قديمة.
    بعد ما تتأكد أنه غير مستخدم، ممكن تحذفه لاحقًا.
  */
  ROOM_BAN_USER: "room.ban.user",

  ROOM_SET_PASSWORD: "room.password.set",
  ROOM_LOCK_SET: "room.lock.set",
  ROOM_PIN_SET: "room.pin.set",

  ROOM_FAVORITE_TOGGLE: "room.favorite.toggle",
  ROOM_BOOST: "room.boost",




  TWEETS_CREATE:
  "tweets.create",

TWEETS_DELETE:
  "tweets.delete",

TWEETS_FEED:
  "tweets.feed",

TWEETS_DETAILS:
  "tweets.details",

TWEETS_LIKE_TOGGLE:
  "tweets.like.toggle",

TWEETS_RETWEET_TOGGLE:
  "tweets.retweet.toggle",

TWEETS_VIEW:
  "tweets.view",

TWEETS_COMMENT_CREATE:
  "tweets.comment.create",

TWEETS_COMMENT_UPDATE:
  "tweets.comment.update",

TWEETS_COMMENT_DELETE:
  "tweets.comment.delete",

TWEETS_COMMENTS_LIST:
  "tweets.comments.list",
} as const;

export const WS_EVENTS = {
  CONNECTION_EVENT: "connection_event",

  LOGIN_EVENT: "login_event",
  REGISTER_EVENT: "register_event",
  LOGOUT_EVENT: "logout_event",
  FORGOT_PASSWORD_EVENT: "forgot_password_event",
  VERIFY_OTP_EVENT: "verify_otp_event",
  RESET_PASSWORD_EVENT: "reset_password_event",

  STORE_ITEMS_EVENT: "store_items_event",
  STORE_BUY_EVENT: "store_buy_event",
  STORE_ACTIVATE_EVENT: "store_activate_event",
  STORE_POINTS_EVENT: "store_points_event",

  USER_SETTINGS_EVENT: "user_settings_event",
  USER_PROFILE_EVENT: "user_profile_event",
  USER_PROFILE_IMAGE_EVENT: "user_profile_image_event",
  USER_DELETE_ACCOUNT_EVENT: "user_delete_account_event",
  USER_BLOCK_EVENT: "user_block_event",

  USER_PROFILE_GET_EVENT: "user_profile_get_event",
  USERS_SEARCH_EVENT: "users_search_event",

  FRIEND_REQUEST_SEND_EVENT: "friend_request_send_event",
  FRIEND_REQUEST_RESPOND_EVENT: "friend_request_respond_event",
  FRIEND_REQUESTS_INCOMING_LIST_EVENT:
    "friend_requests_incoming_list_event",

  DM_SEND_EVENT: "dm_send_event",
  DM_MESSAGE_EVENT: "dm_message_event",
  DM_DELIVERY_EVENT: "dm_delivery_event",
  DM_SEEN_EVENT: "dm_seen_event",
  DM_TYPING_EVENT: "dm_typing_event",
  DM_EDIT_EVENT: "dm_edit_event",
  DM_DELETE_EVENT: "dm_delete_event",
  DM_CLEAR_EVENT: "dm_clear_event",
  DM_SHARE_EVENT: "dm_share_event",
  DM_ERROR_EVENT: "dm_error_event",
  DM_OPEN_EVENT: "dm_open_event",
  DM_CLOSE_EVENT: "dm_close_event",

  FRIENDS_LIST_EVENT: "friends_list_event",
  FRIEND_REQUEST_EVENT: "friend_request_event",
  FRIEND_ACCEPT_EVENT: "friend_accept_event",
  FRIEND_REJECT_EVENT: "friend_reject_event",
  FRIEND_REMOVE_EVENT: "friend_remove_event",

  USER_PROFILE_LIVE_UPDATE_EVENT: "user_profile_live_update_event",

  CHATS_LIST_EVENT: "chats_list_event",
  CHAT_OPEN_EVENT: "chat_open_event",
  CHAT_MESSAGE_EVENT: "chat_message_event",
  CHAT_MESSAGE_SEEN_EVENT: "chat_message_seen_event",
  CHAT_TYPING_EVENT: "chat_typing_event",
  CHAT_PENDING_DELIVERY_EVENT: "chat_pending_delivery_event",

  USERS_BLOCKED_LIST_EVENT: "users_blocked_list_event",

  ROOMS_LIST_EVENT: "rooms_list_event",

  TWEETS_LIST_EVENT: "tweets_list_event",
  TWEET_CREATE_EVENT: "tweet_create_event",
  TWEET_LIKE_EVENT: "tweet_like_event",
  TWEET_COMMENT_EVENT: "tweet_comment_event",
  TWEET_RETWEET_EVENT: "tweet_retweet_event",

  NOTIFICATION_EVENT: "notification_event",
  FEATURES_EVENT: "features_event",

  ERROR_EVENT: "error_event",

  ROOM_CREATE_EVENT: "room.create",
  ROOM_JOIN_EVENT: "room.join",
  ROOM_LEAVE_EVENT: "room.leave",
  ROOM_LIST_EVENT: "room.list",

  ROOM_ACTIVE_COUNT_EVENT: "room.active_count.update",

  ROOM_MESSAGE_EVENT: "room.message",
  ROOM_MESSAGE_SEND_EVENT: "room.message.send",
  ROOM_REACTION_EVENT: "room.message.reaction",

  ROOM_USERS_EVENT: "room.users",
  ROOM_UPDATE_EVENT: "room.update",
  ROOM_ERROR_EVENT: "room.error",

  /*
    أحداث مباشرة تصل للمستخدم المطرود أو المحظور.
    هذه ليست handlers من الفرونت، بل events يستقبلها الفرونت.
  */
  ROOM_KICKED_EVENT: "room:kicked",
  ROOM_BANNED_EVENT: "room:banned",


  TWEETS_CREATE_EVENT:
  "tweets.create_event",

TWEETS_DELETE_EVENT:
  "tweets.delete_event",

TWEETS_FEED_EVENT:
  "tweets.feed_event",

TWEETS_DETAILS_EVENT:
  "tweets.details_event",

TWEETS_LIKE_EVENT:
  "tweets.like_event",

TWEETS_RETWEET_EVENT:
  "tweets.retweet_event",

TWEETS_VIEW_EVENT:
  "tweets.view_event",

TWEETS_COMMENT_EVENT:
  "tweets.comment_event",

TWEETS_COMMENTS_EVENT:
  "tweets.comments_event",

TWEETS_ERROR_EVENT:
  "tweets.error_event",

TWEETS_COOLDOWN_EVENT:
  "tweets.cooldown_event",
} as const;