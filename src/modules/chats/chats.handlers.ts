import type { WsHandler } from "../../websocket/ws.types";
import { requireLogin } from "../../websocket/ws.auth";
import { safeSend, sendError, sendSuccess } from "../../websocket/ws.utils";
import {
  getUserSockets,
  isUserOnline,
} from "../../websocket/stores/clients.store";
import { WS_EVENTS, WS_HANDLERS } from "../../websocket/ws.events";
import { createId } from "../../utils/id";

import { canSendPrivateMessage } from "../privacy/privacy.service";
import {
  addPendingPrivateMessage,
  PendingPrivateMessage,
} from "./pending-messages.queue";

const handleChatMessageSend: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.CHAT_MESSAGE_EVENT)) return;

  const sender = context.client!;

  const receiverId = String(context.message.receiver_id || "").trim();
  const body = String(context.message.body || "").trim();
  const messageType = String(context.message.message_type || "text").trim();
  const localMessageId = String(context.message.local_message_id || "").trim();

  if (!receiverId || !body) {
    sendError(
      context.socket,
      WS_EVENTS.CHAT_MESSAGE_EVENT,
      "missing_receiver_or_body",
      context.message.request_id
    );
    return;
  }

  const permission = await canSendPrivateMessage({
    senderId: sender.userId!,
    receiverId,
  });

  if (!permission.ok) {
    sendError(
      context.socket,
      WS_EVENTS.CHAT_MESSAGE_EVENT,
      permission.reason,
      context.message.request_id
    );
    return;
  }

  const message: PendingPrivateMessage = {
    message_id: createId(),
    local_message_id: localMessageId || null,

    sender_id: sender.userId!,
    sender_username: sender.username || "",
    sender_photo_url: sender.photoUrl || "",

    receiver_id: receiverId,

    body,
    message_type: messageType,

    created_at: new Date().toISOString(),
  };

  /**
   * لو المستخدم عامل Manual Offline:
   * نعتبره غير متاح للتسليم الفوري حتى لو عنده socket متصل.
   */
  const receiverManualOffline = Boolean(permission.receiver.isManualOffline);

  const receiverCanReceiveNow =
    isUserOnline(receiverId) && !receiverManualOffline;

  if (receiverCanReceiveNow) {
    for (const receiverSocket of getUserSockets(receiverId)) {
      safeSend(receiverSocket, {
        handler: WS_EVENTS.CHAT_MESSAGE_EVENT,
        type: "success",
        reason: "null",
        delivery: "live",
        ...message,
      });
    }
  } else {
    await addPendingPrivateMessage(receiverId, message);
  }

  sendSuccess(context.socket, {
    handler: WS_EVENTS.CHAT_MESSAGE_EVENT,
    request_id: context.message.request_id,

    status: receiverCanReceiveNow ? "sent" : "queued",
    receiver_online: isUserOnline(receiverId),
    receiver_manual_offline: receiverManualOffline,

    local_message_id: localMessageId || null,
    message_id: message.message_id,
    receiver_id: receiverId,
    created_at: message.created_at,
  });
};

const handleTypingStart: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.CHAT_TYPING_EVENT)) return;

  const sender = context.client!;
  const receiverId = String(context.message.receiver_id || "").trim();

  if (!receiverId) return;

  const permission = await canSendPrivateMessage({
    senderId: sender.userId!,
    receiverId,
  });

  if (!permission.ok) return;

  if (permission.receiver.isManualOffline) return;

  for (const receiverSocket of getUserSockets(receiverId)) {
    safeSend(receiverSocket, {
      handler: WS_EVENTS.CHAT_TYPING_EVENT,
      type: "success",
      reason: "null",
      typing: true,
      sender_id: sender.userId,
      sender_username: sender.username,
      receiver_id: receiverId,
    });
  }
};

const handleTypingStop: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.CHAT_TYPING_EVENT)) return;

  const sender = context.client!;
  const receiverId = String(context.message.receiver_id || "").trim();

  if (!receiverId) return;

  const permission = await canSendPrivateMessage({
    senderId: sender.userId!,
    receiverId,
  });

  if (!permission.ok) return;

  if (permission.receiver.isManualOffline) return;

  for (const receiverSocket of getUserSockets(receiverId)) {
    safeSend(receiverSocket, {
      handler: WS_EVENTS.CHAT_TYPING_EVENT,
      type: "success",
      reason: "null",
      typing: false,
      sender_id: sender.userId,
      sender_username: sender.username,
      receiver_id: receiverId,
    });
  }
};

const handleChatsList: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.CHATS_LIST_EVENT)) return;

  sendSuccess(context.socket, {
    handler: WS_EVENTS.CHATS_LIST_EVENT,
    request_id: context.message.request_id,
    source: "local_device_only",
    chats: [],
  });
};

export const chatsHandlers = {
  [WS_HANDLERS.CHATS_LIST]: handleChatsList,
  [WS_HANDLERS.CHATS_MESSAGE_SEND]: handleChatMessageSend,
  [WS_HANDLERS.CHATS_TYPING_START]: handleTypingStart,
  [WS_HANDLERS.CHATS_TYPING_STOP]: handleTypingStop,
};