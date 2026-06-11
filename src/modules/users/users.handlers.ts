import type { WsHandler } from "../../websocket/ws.types";
import { requireLogin } from "../../websocket/ws.auth";
import { sendError, sendSuccess } from "../../websocket/ws.utils";
import { WS_EVENTS, WS_HANDLERS } from "../../websocket/ws.events";
import { UserModel } from "../../models/User.model";
import { deliverPendingPrivateMessages } from "../chats/chats.delivery";
import {
  updateClient,
  sendToUserIfOnline,
} from "../../websocket/stores/clients.store";
import {
  deleteMyAccountService,
  getFullUserProfileService,
  getFriendsService,
  getIncomingFriendRequestsService,
  removeFriendService,
  respondFriendRequestService,
  searchUsersService,
  sendFriendRequestService,
  updateUserProfileImageService,
  updateUserProfileService,
  getBlockedUsersService,
} from "./users.service";

const notifyFriendsAboutUserUpdate = async (
  context: Parameters<WsHandler>[0],
  user: any,
  changedFields: string[] = []
) => {
  const userId = String(user?.userId || "").trim();

  if (!userId) return;

  const fullUser = await UserModel.findOne({ userId }).lean();

  if (!fullUser) return;

  const friends = Array.isArray((fullUser as any).friends)
    ? (fullUser as any).friends
    : [];

  const hideActivityStatus = fullUser.hideActivityStatus === true;
  const isManualOffline = fullUser.isManualOffline === true;
  const isHidden = hideActivityStatus || isManualOffline;

  const publicUser = {
    userId: fullUser.userId,
    username: fullUser.username,

    photoUrl: fullUser.photoUrl || "",
    coverUrl: fullUser.coverUrl || "",

    accountColor: fullUser.accountColor || "#2BCB00",

    badgeKey: fullUser.badgeKey || "",
    badgeName: fullUser.badgeName || "",
    badgeValue: fullUser.badgeValue || "",

    badges: Array.isArray((fullUser as any).inventory)
      ? (fullUser as any).inventory
          .filter((item: any) => {
            return item.type === "badge" && item.isActive === true;
          })
          .map((item: any) => ({
            itemId: item.itemId || "",
            key: item.key || "",
            name: item.name || "",
            value: item.value || "",
          }))
      : fullUser.badgeValue
      ? [
          {
            itemId: "",
            key: fullUser.badgeKey || "",
            name: fullUser.badgeName || "",
            value: fullUser.badgeValue || "",
          },
        ]
      : [],

    verificationType: fullUser.verificationType || "none",

    statusMessage: fullUser.statusMessage || "",

    current: isHidden ? "0" : fullUser.current || "0",

    hideActivityStatus,
    isManualOffline,

    isOnline: isHidden
      ? false
      : fullUser.current === "1" || fullUser.current === "online",

    country: fullUser.country || "",
    gender: fullUser.gender || "",
    birthdate: fullUser.birthdate || "",

    privacy: {
      dmPrivacy: fullUser.privacy?.dmPrivacy || "open",
      friendRequestPrivacy:
        fullUser.privacy?.friendRequestPrivacy || "open",
      allowCalls: fullUser.privacy?.allowCalls || "all",
    },

    stats: {
      friendsCount: fullUser.stats?.friendsCount || 0,
      profileViewsCount: fullUser.stats?.profileViewsCount || 0,
      giftsSentCount: fullUser.stats?.giftsSentCount || 0,
      giftsReceivedCount: fullUser.stats?.giftsReceivedCount || 0,
    },

    updatedAt: fullUser.updatedAt,
  };

  for (const friendUserId of friends) {
sendToUserIfOnline(friendUserId, {
  handler: WS_EVENTS.USER_PROFILE_LIVE_UPDATE_EVENT,
  type: "user_updated",
  userId,
  user: publicUser,
  changedFields,
});
  }
};
const handleUpdateProfile: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.USER_PROFILE_EVENT)) return;

  const userId = context.client!.userId!;

  const result = await updateUserProfileService({
    userId,
    payload: context.message,
  });

  if (!result.ok) {
    sendError(
      context.socket,
      WS_EVENTS.USER_PROFILE_EVENT,
      result.reason,
      context.message.request_id
    );
    return;
  }

  sendSuccess(context.socket, {
    handler: WS_EVENTS.USER_PROFILE_EVENT,
    request_id: context.message.request_id,

    user_id: result.user.userId,
    username: result.user.username,
    photo_url: result.user.photoUrl || "",
    current: result.user.current || "0",

    user: result.user,
  });
await notifyFriendsAboutUserUpdate(
  context,
  result.user,
  result.changedFields || []
);
  if (
    context.message.hide_activity_status === false ||
    context.message.hideActivityStatus === false
  ) {
    await deliverPendingPrivateMessages(userId);
  }
};

const handleUpdateSettings: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.USER_SETTINGS_EVENT)) return;

  const userId = context.client!.userId!;

  const result = await updateUserProfileService({
    userId,
    payload: context.message,
  });

  if (!result.ok) {
    sendError(
      context.socket,
      WS_EVENTS.USER_SETTINGS_EVENT,
      result.reason,
      context.message.request_id
    );
    return;
  }

  sendSuccess(context.socket, {
    handler: WS_EVENTS.USER_SETTINGS_EVENT,
    request_id: context.message.request_id,

    user_id: result.user.userId,
    username: result.user.username,
    photo_url: result.user.photoUrl || "",
    current: result.user.current || "0",

    user: result.user,
  });
await notifyFriendsAboutUserUpdate(
  context,
  result.user,
  result.changedFields || []
);
  if (
    context.message.is_manual_offline === false ||
    context.message.hide_activity_status === false ||
    context.message.hideActivityStatus === false
  ) {
    await deliverPendingPrivateMessages(userId);
  }
};

const handleBlockUser: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.USER_BLOCK_EVENT)) return;

  const userId = context.client!.userId!;
  const targetUserId = String(context.message.target_user_id || "").trim();

  if (!targetUserId || targetUserId === userId) {
    sendError(
      context.socket,
      WS_EVENTS.USER_BLOCK_EVENT,
      "invalid_target_user",
      context.message.request_id
    );
    return;
  }

  await UserModel.updateOne(
    { userId },
    {
      $addToSet: {
        blockedUsers: targetUserId,
      },
    }
  );

  sendSuccess(context.socket, {
    handler: WS_EVENTS.USER_BLOCK_EVENT,
    request_id: context.message.request_id,
    target_user_id: targetUserId,
    blocked: true,
  });
};

const handleUnblockUser: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.USER_BLOCK_EVENT)) return;

  const userId = context.client!.userId!;
  const targetUserId = String(context.message.target_user_id || "").trim();

  if (!targetUserId) {
    sendError(
      context.socket,
      WS_EVENTS.USER_BLOCK_EVENT,
      "invalid_target_user",
      context.message.request_id
    );
    return;
  }

  await UserModel.updateOne(
    { userId },
    {
      $pull: {
        blockedUsers: targetUserId,
      },
    }
  );

  sendSuccess(context.socket, {
    handler: WS_EVENTS.USER_BLOCK_EVENT,
    request_id: context.message.request_id,
    target_user_id: targetUserId,
    blocked: false,
  });
};

const handleUpdateProfileImage: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.USER_PROFILE_IMAGE_EVENT)) return;

  const userId = context.client!.userId!;

  const imageType = String(context.message.image_type || "").trim();
  const base64 = String(context.message.base64 || "").trim();

  if (!["avatar", "cover"].includes(imageType)) {
    sendError(
      context.socket,
      WS_EVENTS.USER_PROFILE_IMAGE_EVENT,
      "invalid_image_type",
      context.message.request_id
    );
    return;
  }

  if (!base64) {
    sendError(
      context.socket,
      WS_EVENTS.USER_PROFILE_IMAGE_EVENT,
      "missing_base64",
      context.message.request_id
    );
    return;
  }

  const result = await updateUserProfileImageService({
    userId,
    imageType: imageType as "avatar" | "cover",
    base64,
  });

  if (!result.ok) {
    sendError(
      context.socket,
      WS_EVENTS.USER_PROFILE_IMAGE_EVENT,
      result.reason,
      context.message.request_id
    );
    return;
  }

  sendSuccess(context.socket, {
    handler: WS_EVENTS.USER_PROFILE_IMAGE_EVENT,
    request_id: context.message.request_id,

    image_type: result.imageType,
    url: result.url,

    user_id: result.user.userId,
    username: result.user.username,
    photo_url: result.user.photoUrl || "",
    cover_url: result.user.coverUrl || "",

    user: result.user,
  });
  await notifyFriendsAboutUserUpdate(
  context,
  result.user,
  [result.imageType === "avatar" ? "photoUrl" : "coverUrl"]
);
};
const handleGetBlockedUsers: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.USERS_BLOCKED_LIST_EVENT)) return;

  const userId = context.client!.userId!;

  const result = await getBlockedUsersService({
    userId,
  });

  if (!result.ok) {
    sendError(
      context.socket,
      WS_EVENTS.USERS_BLOCKED_LIST_EVENT,
      result.reason,
      context.message.request_id
    );
    return;
  }

  sendSuccess(context.socket, {
    handler: WS_EVENTS.USERS_BLOCKED_LIST_EVENT,
    request_id: context.message.request_id,
    blockedUsers: result.blockedUsers,
  });
};


const handleDeleteMyAccount: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.USER_DELETE_ACCOUNT_EVENT)) return;

  const userId = context.client!.userId!;
  const confirm = String(context.message.confirm || "").trim();

  if (confirm !== "DELETE_MY_ACCOUNT") {
    sendError(
      context.socket,
      WS_EVENTS.USER_DELETE_ACCOUNT_EVENT,
      "invalid_delete_confirm",
      context.message.request_id
    );
    return;
  }

  const result = await deleteMyAccountService({
    userId,
  });

  if (!result.ok) {
    sendError(
      context.socket,
      WS_EVENTS.USER_DELETE_ACCOUNT_EVENT,
      result.reason,
      context.message.request_id
    );
    return;
  }

  updateClient(context.socket, {
    mongoId: undefined,
    userId: undefined,
    username: undefined,
    photoUrl: undefined,
    session: undefined,
    isLoggedIn: false,
    activeRoomId: undefined,
    activeChatId: undefined,
  });

  sendSuccess(context.socket, {
    handler: WS_EVENTS.USER_DELETE_ACCOUNT_EVENT,
    request_id: context.message.request_id,
    deleted: true,
  });
};

const handleGetUserProfile: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.USER_PROFILE_GET_EVENT)) return;

  const viewerUserId = context.client!.userId!;

  const targetUserId = String(
    context.message.target_user_id ||
      context.message.targetUserId ||
      context.message.user_id ||
      ""
  ).trim();

  if (!targetUserId) {
    sendError(
      context.socket,
      WS_EVENTS.USER_PROFILE_GET_EVENT,
      "missing_target_user_id",
      context.message.request_id
    );
    return;
  }

  const result = await getFullUserProfileService({
    viewerUserId,
    targetUserId,
  });

  if (!result.ok) {
    sendError(
      context.socket,
      WS_EVENTS.USER_PROFILE_GET_EVENT,
      result.reason,
      context.message.request_id
    );
    return;
  }

  sendSuccess(context.socket, {
    handler: WS_EVENTS.USER_PROFILE_GET_EVENT,
    request_id: context.message.request_id,
    profile: result.profile,
  });
};

const handleSearchUsers: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.USERS_SEARCH_EVENT)) return;

  const viewerUserId = context.client!.userId!;
  const query = String(context.message.query || "").trim();
  const limit = Number(context.message.limit || 20);

  const result = await searchUsersService({
    viewerUserId,
    query,
    limit,
  });

  if (!result.ok) {
    sendError(
      context.socket,
      WS_EVENTS.USERS_SEARCH_EVENT,
      result.reason,
      context.message.request_id
    );
    return;
  }

  sendSuccess(context.socket, {
    handler: WS_EVENTS.USERS_SEARCH_EVENT,
    request_id: context.message.request_id,
    users: result.users,
  });
};

const handleSendFriendRequest: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.FRIEND_REQUEST_SEND_EVENT)) return;

  const fromUserId = context.client!.userId!;

  const toUserId = String(
    context.message.to_user_id ||
      context.message.toUserId ||
      context.message.target_user_id ||
      context.message.targetUserId ||
      ""
  ).trim();

  if (!toUserId) {
    sendError(
      context.socket,
      WS_EVENTS.FRIEND_REQUEST_SEND_EVENT,
      "missing_to_user_id",
      context.message.request_id
    );
    return;
  }

  const result = await sendFriendRequestService({
    fromUserId,
    toUserId,
  });

  if (!result.ok) {
    sendError(
      context.socket,
      WS_EVENTS.FRIEND_REQUEST_SEND_EVENT,
      result.reason,
      context.message.request_id
    );
    return;
  }

  /*
    رد للمرسل
  */
  sendSuccess(context.socket, {
    handler: WS_EVENTS.FRIEND_REQUEST_SEND_EVENT,
    request_id: context.message.request_id,
    request: result.request,
    toUser: result.toUser,
  });

  /*
    إشعار فوري للمستقبل لو أونلاين
  */
sendToUserIfOnline(toUserId, {
  handler: WS_EVENTS.FRIEND_REQUEST_SEND_EVENT,
  type: "incoming",
  request: result.request,
  fromUser: result.fromUser,
});
};
const handleGetIncomingFriendRequests: WsHandler = async (context) => {
  if (
    !requireLogin(
      context,
      WS_EVENTS.FRIEND_REQUESTS_INCOMING_LIST_EVENT
    )
  ) {
    return;
  }

  const userId = context.client!.userId!;

  const result = await getIncomingFriendRequestsService({
    userId,
  });

  sendSuccess(context.socket, {
    handler: WS_EVENTS.FRIEND_REQUESTS_INCOMING_LIST_EVENT,
    request_id: context.message.request_id,
    requests: result.requests,
  });
};
const handleGetFriends: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.FRIENDS_LIST_EVENT)) return;

  const userId = context.client!.userId!;

  const result = await getFriendsService({
    userId,
  });

  if (!result.ok) {
    sendError(
      context.socket,
      WS_EVENTS.FRIENDS_LIST_EVENT,
      result.reason,
      context.message.request_id
    );
    return;
  }

  sendSuccess(context.socket, {
    handler: WS_EVENTS.FRIENDS_LIST_EVENT,
    request_id: context.message.request_id,
    friends: result.friends,
  });
};
const handleRemoveFriend: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.FRIEND_REMOVE_EVENT)) return;

  const userId = context.client!.userId!;

  const friendUserId = String(
    context.message.friend_user_id ||
      context.message.friendUserId ||
      context.message.target_user_id ||
      context.message.targetUserId ||
      ""
  ).trim();

  if (!friendUserId) {
    sendError(
      context.socket,
      WS_EVENTS.FRIEND_REMOVE_EVENT,
      "missing_friend_user_id",
      context.message.request_id
    );
    return;
  }

  const result = await removeFriendService({
    userId,
    friendUserId,
  });

  if (!result.ok) {
    sendError(
      context.socket,
      WS_EVENTS.FRIEND_REMOVE_EVENT,
      result.reason,
      context.message.request_id
    );
    return;
  }

  sendSuccess(context.socket, {
    handler: WS_EVENTS.FRIEND_REMOVE_EVENT,
    request_id: context.message.request_id,
    removedUserId: result.removedUserId,
  });

sendToUserIfOnline(friendUserId, {
  handler: WS_EVENTS.FRIEND_REMOVE_EVENT,
  type: "friend_removed",
  removedUserId: userId,
});
};
const handleRespondFriendRequest: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.FRIEND_REQUEST_RESPOND_EVENT)) return;

  const userId = context.client!.userId!;

  const requestId = String(
    context.message.request_id_value ||
      context.message.friend_request_id ||
      context.message.friendRequestId ||
      ""
  ).trim();

  const action = String(context.message.action || "").trim();

  if (!requestId) {
    sendError(
      context.socket,
      WS_EVENTS.FRIEND_REQUEST_RESPOND_EVENT,
      "missing_request_id",
      context.message.request_id
    );
    return;
  }

  if (action !== "accept" && action !== "reject") {
    sendError(
      context.socket,
      WS_EVENTS.FRIEND_REQUEST_RESPOND_EVENT,
      "invalid_friend_request_action",
      context.message.request_id
    );
    return;
  }

  const result = await respondFriendRequestService({
    userId,
    requestId,
    action: action as "accept" | "reject",
  });

  if (!result.ok) {
    sendError(
      context.socket,
      WS_EVENTS.FRIEND_REQUEST_RESPOND_EVENT,
      result.reason,
      context.message.request_id
    );
    return;
  }

  /*
    رد للشخص الذي قبل/رفض
  */
  sendSuccess(context.socket, {
    handler: WS_EVENTS.FRIEND_REQUEST_RESPOND_EVENT,
    request_id: context.message.request_id,
    action: result.action,
    request: result.request,
    fromUser: result.fromUser,
    toUser: result.toUser,
  });

  /*
    إشعار فوري للمرسل الأصلي
  */
sendToUserIfOnline(result.request.fromUserId, {
  handler: WS_EVENTS.FRIEND_REQUEST_RESPOND_EVENT,
  type: "friend_request_updated",
  action: result.action,
  request: result.request,
  fromUser: result.fromUser,
  toUser: result.toUser,
});
};

export const usersHandlers = {
  [WS_HANDLERS.USERS_PROFILE_UPDATE]: handleUpdateProfile,
  [WS_HANDLERS.USERS_PROFILE_IMAGE_UPDATE]: handleUpdateProfileImage,
  [WS_HANDLERS.USERS_DELETE_ACCOUNT]: handleDeleteMyAccount,

  [WS_HANDLERS.USERS_SETTINGS_UPDATE]: handleUpdateSettings,

  [WS_HANDLERS.USERS_BLOCK]: handleBlockUser,
  [WS_HANDLERS.USERS_UNBLOCK]: handleUnblockUser,
  [WS_HANDLERS.USERS_BLOCKED_LIST]: handleGetBlockedUsers,

  [WS_HANDLERS.USERS_PROFILE_GET]: handleGetUserProfile,
  [WS_HANDLERS.USERS_SEARCH]: handleSearchUsers,

  [WS_HANDLERS.FRIEND_REQUEST_SEND]: handleSendFriendRequest,
  [WS_HANDLERS.FRIEND_REQUEST_RESPOND]: handleRespondFriendRequest,

  [WS_HANDLERS.FRIEND_REQUESTS_INCOMING_LIST]:
    handleGetIncomingFriendRequests,

  [WS_HANDLERS.FRIENDS_LIST]: handleGetFriends,

  [WS_HANDLERS.FRIENDS_REMOVE]: handleRemoveFriend,
};