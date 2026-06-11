import type { WsHandler } from "../../websocket/ws.types";
import { requireLogin } from "../../websocket/ws.auth";
import { sendError, sendSuccess } from "../../websocket/ws.utils";
import { sendToUserIfOnline } from "../../websocket/stores/clients.store";
import { WS_EVENTS, WS_HANDLERS } from "../../websocket/ws.events";

import {
  canSendDmSignal,
  checkDmPermissionOnly,
  getAndClearPendingDmMessages,
  sendDmMessageService,
} from "./dm.service";

function textValue(value: any) {
  return String(value || "").trim();
}

const handleDmSend: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.DM_SEND_EVENT)) return;

  const fromUserId = context.client!.userId!;

  const result = await sendDmMessageService({
    fromUserId,
    payload: context.message,
  });

  if (!result.ok) {
    sendError(
      context.socket,
      WS_EVENTS.DM_SEND_EVENT,
      result.reason,
      context.message.request_id
    );
    return;
  }

  /*
    رد للمرسل.
    لو delivered=false يبقى الرسالة اتخزنت Redis لأن المستقبل Offline.
  */
  sendSuccess(context.socket, {
    handler: WS_EVENTS.DM_SEND_EVENT,
    request_id: context.message.request_id,
    message: result.message,
    delivered: result.delivered,
    storedInRedis: result.storedInRedis,
    targetHidden: result.targetHidden,
  });

  /*
    لو المستقبل Online حقيقي، أرسل له الرسالة فورًا.
    حتى لو عامل hide activity.
  */
  if (result.delivered) {
    sendToUserIfOnline(result.message.toUserId, {
      handler: WS_EVENTS.DM_MESSAGE_EVENT,
      type: "incoming",
      message: result.message,
      targetHidden: result.targetHidden,
    });

    /*
      أرسل للمرسل delivered.
      لو المستقبل hide activity، سيظل delivered فقط بدون seen.
    */
    sendSuccess(context.socket, {
      handler: WS_EVENTS.DM_DELIVERY_EVENT,
      request_id: context.message.request_id,
      messageId: result.message.messageId,
      tempId: result.message.tempId,
      chatId: result.message.chatId,
      toUserId: result.message.toUserId,
      delivered: true,
    });
  }
};

const handleDmTyping: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.DM_TYPING_EVENT)) return;

  const fromUserId = context.client!.userId!;

  const toUserId = textValue(
    context.message.to_user_id ||
      context.message.toUserId ||
      context.message.target_user_id ||
      context.message.targetUserId
  );

  const result = await canSendDmSignal({
    fromUserId,
    toUserId,
  });

  /*
    لو المستقبل offline أو hide activity لا نرسل typing ولا نرجع error مزعج.
  */
  if (!result.ok) return;

  sendToUserIfOnline(toUserId, {
    handler: WS_EVENTS.DM_TYPING_EVENT,
    type: "typing",
    fromUserId,
    toUserId,
    isTyping: context.message.isTyping === true,
  });
};

const handleDmSeen: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.DM_SEEN_EVENT)) return;

  const fromUserId = context.client!.userId!;

  const toUserId = textValue(
    context.message.to_user_id ||
      context.message.toUserId ||
      context.message.target_user_id ||
      context.message.targetUserId
  );

  const chatId = textValue(context.message.chatId || context.message.chat_id);

  const messageIds = Array.isArray(context.message.messageIds)
    ? context.message.messageIds.map((id: any) => String(id)).filter(Boolean)
    : [];

  const result = await canSendDmSignal({
    fromUserId,
    toUserId,
  });

  /*
    لو القارئ عامل hide activity، لا ترسل seen للطرف الآخر.
    وهذا يتم هنا لأن canSendDmSignal سيرجع target_hidden_activity.
  */
  if (!result.ok) return;

  sendToUserIfOnline(toUserId, {
    handler: WS_EVENTS.DM_SEEN_EVENT,
    type: "seen",
    fromUserId,
    toUserId,
    chatId,
    messageIds,
    seenAt: new Date().toISOString(),
  });
};

const handleDmEdit: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.DM_EDIT_EVENT)) return;

  const fromUserId = context.client!.userId!;

  const toUserId = textValue(
    context.message.to_user_id ||
      context.message.toUserId ||
      context.message.target_user_id ||
      context.message.targetUserId
  );

  const messageId = textValue(
    context.message.message_id || context.message.messageId
  );

  const text = textValue(context.message.text || context.message.body);

  if (!toUserId || !messageId || !text) {
    sendError(
      context.socket,
      WS_EVENTS.DM_EDIT_EVENT,
      "invalid_edit_payload",
      context.message.request_id
    );
    return;
  }

  const permission = await checkDmPermissionOnly({
    fromUserId,
    toUserId,
  });

  if (!permission.ok) {
    sendError(
      context.socket,
      WS_EVENTS.DM_EDIT_EVENT,
      permission.reason,
      context.message.request_id
    );
    return;
  }

  const payload = {
    handler: WS_EVENTS.DM_EDIT_EVENT,
    type: "edited",
    fromUserId,
    toUserId,
    messageId,
    text,
    editedAt: new Date().toISOString(),
  };

  sendSuccess(context.socket, {
    ...payload,
    request_id: context.message.request_id,
  });

  if (permission.targetOnlineReal) {
    sendToUserIfOnline(toUserId, payload);
  }
};

const handleDmDelete: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.DM_DELETE_EVENT)) return;

  const fromUserId = context.client!.userId!;

  const toUserId = textValue(
    context.message.to_user_id ||
      context.message.toUserId ||
      context.message.target_user_id ||
      context.message.targetUserId
  );

  const messageId = textValue(
    context.message.message_id || context.message.messageId
  );

  if (!toUserId || !messageId) {
    sendError(
      context.socket,
      WS_EVENTS.DM_DELETE_EVENT,
      "invalid_delete_payload",
      context.message.request_id
    );
    return;
  }

  const permission = await checkDmPermissionOnly({
    fromUserId,
    toUserId,
  });

  if (!permission.ok) {
    sendError(
      context.socket,
      WS_EVENTS.DM_DELETE_EVENT,
      permission.reason,
      context.message.request_id
    );
    return;
  }

  const payload = {
    handler: WS_EVENTS.DM_DELETE_EVENT,
    type: "deleted",
    fromUserId,
    toUserId,
    messageId,
    deletedAt: new Date().toISOString(),
  };

  sendSuccess(context.socket, {
    ...payload,
    request_id: context.message.request_id,
  });

  if (permission.targetOnlineReal) {
    sendToUserIfOnline(toUserId, payload);
  }
};
const handleDmClear: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.DM_CLEAR_EVENT)) return;

  /*
    clear محلي فقط في Flutter.
    الباك يرجع success فقط للتأكيد.
  */
  sendSuccess(context.socket, {
    handler: WS_EVENTS.DM_CLEAR_EVENT,
    request_id: context.message.request_id,
    cleared: true,
  });
};

const handleDmPendingDeliver: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.DM_MESSAGE_EVENT)) return;

  const userId = context.client!.userId!;

  const messages = await getAndClearPendingDmMessages(userId);

  for (const message of messages) {
    /*
      أرسل الرسالة للمستقبل الذي سجل دخول الآن.
    */
    sendSuccess(context.socket, {
      handler: WS_EVENTS.DM_MESSAGE_EVENT,
      type: "incoming",
      message,
      fromRedis: true,
    });

    /*
      أبلغ المرسل الأصلي أن الرسالة وصلت الآن.
    */
    sendToUserIfOnline(message.fromUserId, {
      handler: WS_EVENTS.DM_DELIVERY_EVENT,
      type: "delivered",
      messageId: message.messageId,
      tempId: message.tempId,
      chatId: message.chatId,
      toUserId: message.toUserId,
      delivered: true,
      deliveredAt: new Date().toISOString(),
    });
  }
};

export const dmHandlers = {
  [WS_HANDLERS.DM_SEND]: handleDmSend,
  [WS_HANDLERS.DM_TYPING]: handleDmTyping,
  [WS_HANDLERS.DM_SEEN]: handleDmSeen,
  [WS_HANDLERS.DM_EDIT]: handleDmEdit,
  [WS_HANDLERS.DM_DELETE]: handleDmDelete,
  [WS_HANDLERS.DM_CLEAR]: handleDmClear,
  [WS_HANDLERS.DM_PENDING_DELIVER]: handleDmPendingDeliver,
};