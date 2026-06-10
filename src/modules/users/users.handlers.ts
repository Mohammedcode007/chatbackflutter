import type { WsHandler } from "../../websocket/ws.types";
import { requireLogin } from "../../websocket/ws.auth";
import { sendError, sendSuccess } from "../../websocket/ws.utils";
import { WS_EVENTS, WS_HANDLERS } from "../../websocket/ws.events";
import { UserModel } from "../../models/User.model";
import { deliverPendingPrivateMessages } from "../chats/chats.delivery";
import { updateClient } from "../../websocket/stores/clients.store";

import {
  deleteMyAccountService,
  getFullUserProfileService,
  respondFriendRequestService,
  searchUsersService,
  sendFriendRequestService,
  updateUserProfileImageService,
  updateUserProfileService,
} from "./users.service";

const sendToUserIfOnline = (
  context: Parameters<WsHandler>[0],
  userId: string,
  payload: any
) => {
  /*
    لو عندك دالة إرسال لمستخدم أونلاين باسم مختلف،
    عدّل هذا الجزء فقط.
  */
  const anyContext = context as any;

  if (typeof anyContext.broadcastToUser === "function") {
    anyContext.broadcastToUser(userId, payload);
    return;
  }

  if (typeof anyContext.sendToUser === "function") {
    anyContext.sendToUser(userId, payload);
    return;
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
  sendToUserIfOnline(context, toUserId, {
    handler: WS_EVENTS.FRIEND_REQUEST_SEND_EVENT,
    type: "incoming",
    request: result.request,
    fromUser: result.fromUser,
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
  sendToUserIfOnline(context, result.request.fromUserId, {
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

  [WS_HANDLERS.USERS_PROFILE_GET]: handleGetUserProfile,
  [WS_HANDLERS.USERS_SEARCH]: handleSearchUsers,

  [WS_HANDLERS.FRIEND_REQUEST_SEND]: handleSendFriendRequest,
  [WS_HANDLERS.FRIEND_REQUEST_RESPOND]: handleRespondFriendRequest,
};