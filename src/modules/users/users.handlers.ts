import type { WsHandler } from "../../websocket/ws.types";
import { requireLogin } from "../../websocket/ws.auth";
import { sendError, sendSuccess } from "../../websocket/ws.utils";
import { WS_EVENTS, WS_HANDLERS } from "../../websocket/ws.events";
import { UserModel } from "../../models/User.model";
import { deliverPendingPrivateMessages } from "../chats/chats.delivery";

const handleUpdateSettings: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.USER_SETTINGS_EVENT)) return;

  const userId = context.client!.userId!;

  const update: any = {};

  if (typeof context.message.is_manual_offline === "boolean") {
    update.isManualOffline = context.message.is_manual_offline;
  }

  if (
    context.message.dm_privacy &&
    ["open", "friends_only", "closed"].includes(context.message.dm_privacy)
  ) {
    update["privacy.dmPrivacy"] = context.message.dm_privacy;
  }

  if (
    context.message.friend_request_privacy &&
    ["open", "closed"].includes(context.message.friend_request_privacy)
  ) {
    update["privacy.friendRequestPrivacy"] =
      context.message.friend_request_privacy;
  }

  if (Object.keys(update).length === 0) {
    sendError(
      context.socket,
      WS_EVENTS.USER_SETTINGS_EVENT,
      "no_valid_settings",
      context.message.request_id
    );
    return;
  }

  const user = await UserModel.findOneAndUpdate(
    { userId },
    { $set: update },
    { new: true }
  ).lean();

  sendSuccess(context.socket, {
    handler: WS_EVENTS.USER_SETTINGS_EVENT,
    request_id: context.message.request_id,
    is_manual_offline: user?.isManualOffline,
    privacy: user?.privacy,
  });

  /**
   * لو المستخدم غيّر حالته من manual offline إلى online،
   * نسلّم الرسائل المؤجلة فورًا.
   */
  if (context.message.is_manual_offline === false) {
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
  [WS_HANDLERS.USERS_SETTINGS_UPDATE]: handleUpdateSettings,
  [WS_HANDLERS.USERS_BLOCK]: handleBlockUser,
  [WS_HANDLERS.USERS_UNBLOCK]: handleUnblockUser,
};