import type { WsHandler } from "../../websocket/ws.types";
import { requireLogin } from "../../websocket/ws.auth";
import { sendError, sendSuccess } from "../../websocket/ws.utils";
import { WS_EVENTS, WS_HANDLERS } from "../../websocket/ws.events";
import { UserModel } from "../../models/User.model";
import { deliverPendingPrivateMessages } from "../chats/chats.delivery";
import { updateUserProfileService } from "./users.service";

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

  /*
    لو المستخدم كان مخفي النشاط ثم رجعه false
    نسلم الرسائل المؤجلة.
  */
  if (
    context.message.hide_activity_status === false ||
    context.message.hideActivityStatus === false
  ) {
    await deliverPendingPrivateMessages(userId);
  }
};

/*
  هذا القديم نتركه لو Flutter يستخدم users.settings.update
  لكنه الآن يستدعي نفس دالة التحديث الجديدة.
*/
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

export const usersHandlers = {
  [WS_HANDLERS.USERS_PROFILE_UPDATE]: handleUpdateProfile,

  [WS_HANDLERS.USERS_SETTINGS_UPDATE]: handleUpdateSettings,

  [WS_HANDLERS.USERS_BLOCK]: handleBlockUser,
  [WS_HANDLERS.USERS_UNBLOCK]: handleUnblockUser,
};