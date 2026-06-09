import type { WsHandler } from "../../websocket/ws.types";
import { requireLogin } from "../../websocket/ws.auth";
import { sendError, sendSuccess, safeSend } from "../../websocket/ws.utils";
import { WS_EVENTS, WS_HANDLERS } from "../../websocket/ws.events";
import { FriendRequestModel } from "../../models/FriendRequest.model";
import { FriendshipModel } from "../../models/Friendship.model";
import { getUserSockets } from "../../websocket/stores/clients.store";
import { canSendFriendRequest } from "../privacy/privacy.service";

function pairUsers(userA: string, userB: string) {
  return [userA, userB].sort();
}

const handleFriendsList: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.FRIENDS_LIST_EVENT)) return;

  const userId = context.client!.userId!;

  const friendships = await FriendshipModel.find({
    $or: [{ userA: userId }, { userB: userId }],
  }).lean();

  const friends = friendships.map((item) => {
    return item.userA === userId ? item.userB : item.userA;
  });

  sendSuccess(context.socket, {
    handler: WS_EVENTS.FRIENDS_LIST_EVENT,
    request_id: context.message.request_id,
    friends,
  });
};

const handleFriendRequest: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.FRIEND_REQUEST_EVENT)) return;

  const fromUserId = context.client!.userId!;
  const toUserId = String(context.message.to_user_id || "").trim();

  if (!toUserId) {
    sendError(
      context.socket,
      WS_EVENTS.FRIEND_REQUEST_EVENT,
      "missing_to_user_id",
      context.message.request_id
    );
    return;
  }

  const permission = await canSendFriendRequest({
    fromUserId,
    toUserId,
  });

  if (!permission.ok) {
    sendError(
      context.socket,
      WS_EVENTS.FRIEND_REQUEST_EVENT,
      permission.reason,
      context.message.request_id
    );
    return;
  }

  const existing = await FriendRequestModel.findOne({
    fromUserId,
    toUserId,
    status: "pending",
  });

  if (existing) {
    sendError(
      context.socket,
      WS_EVENTS.FRIEND_REQUEST_EVENT,
      "request_already_sent",
      context.message.request_id
    );
    return;
  }

  const request = await FriendRequestModel.create({
    fromUserId,
    toUserId,
    status: "pending",
  });

  const event = {
    handler: WS_EVENTS.FRIEND_REQUEST_EVENT,
    type: "success",
    reason: "null",
    request_id: String(request._id),
    from_user_id: fromUserId,
    to_user_id: toUserId,
    status: "pending",
    created_at: request.createdAt.toISOString(),
  };

  sendSuccess(context.socket, {
    handler: WS_EVENTS.FRIEND_REQUEST_EVENT,
    request_id: context.message.request_id,
    status: "sent",
    to_user_id: toUserId,
  });

  for (const socket of getUserSockets(toUserId)) {
    safeSend(socket, event);
  }
};

const handleFriendAccept: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.FRIEND_REQUEST_EVENT)) return;

  const userId = context.client!.userId!;
  const requestId = String(context.message.friend_request_id || "").trim();

  const request = await FriendRequestModel.findOne({
    _id: requestId,
    toUserId: userId,
    status: "pending",
  });

  if (!request) {
    sendError(
      context.socket,
      WS_EVENTS.FRIEND_REQUEST_EVENT,
      "request_not_found",
      context.message.request_id
    );
    return;
  }

  request.status = "accepted";
  await request.save();

  const [userA, userB] = pairUsers(request.fromUserId, request.toUserId);

  await FriendshipModel.updateOne(
    { userA, userB },
    { $setOnInsert: { userA, userB } },
    { upsert: true }
  );

  const event = {
    handler: WS_EVENTS.FRIEND_REQUEST_EVENT,
    type: "success",
    reason: "null",
    status: "accepted",
    from_user_id: request.fromUserId,
    to_user_id: request.toUserId,
  };

  safeSend(context.socket, event);

  for (const socket of getUserSockets(request.fromUserId)) {
    safeSend(socket, event);
  }
};

export const friendsHandlers = {
  [WS_HANDLERS.FRIENDS_LIST]: handleFriendsList,
  [WS_HANDLERS.FRIENDS_REQUEST]: handleFriendRequest,
  [WS_HANDLERS.FRIENDS_ACCEPT]: handleFriendAccept,
};