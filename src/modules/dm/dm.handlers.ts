import type { WsHandler } from "../../websocket/ws.types";
import { requireLogin } from "../../websocket/ws.auth";
import { sendError, sendSuccess } from "../../websocket/ws.utils";
import { sendToUserIfOnline } from "../../websocket/stores/clients.store";
import { WS_EVENTS, WS_HANDLERS } from "../../websocket/ws.events";
import { merchantConfig } from "../../features/merchant/merchant.config";
import { executeMerchantCommand } from "../../features/merchant/merchant-command.service";
import {
  canSendDmSignal,
  checkDmPermissionOnly,
  getAndClearPendingDmMessages,
  sendDmMessageService,
} from "./dm.service";
import { clearUserActiveDmChat, isUserActiveInDmChat, setUserActiveDmChat } from "../../websocket/stores/dmActiveChats.store";

function textValue(value: any) {
  return String(value || "").trim();
}
const handleDmOpen: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.DM_OPEN_EVENT)) return;

  const userId = context.client!.userId!;
  const chatId = textValue(context.message.chatId || context.message.chat_id);

  console.log("[DM_OPEN_RECEIVED]", {
    userId,
    chatId,
    requestId: context.message.request_id,
    socketId: (context.socket as any).id || "",
    at: new Date().toISOString(),
  });

  if (!chatId) {
    console.log("[DM_OPEN_ERROR_MISSING_CHAT_ID]", {
      userId,
      message: context.message,
    });

    sendError(
      context.socket,
      WS_EVENTS.DM_OPEN_EVENT,
      "missing_chat_id",
      context.message.request_id
    );
    return;
  }

  setUserActiveDmChat(userId, chatId);

  console.log("[DM_OPEN_SAVED_ACTIVE_CHAT]", {
    userId,
    chatId,
    active: true,
    at: new Date().toISOString(),
  });

  sendSuccess(context.socket, {
    handler: WS_EVENTS.DM_OPEN_EVENT,
    request_id: context.message.request_id,
    type: "success",
    chatId,
  });
};
const handleDmClose: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.DM_CLOSE_EVENT)) return;

  const userId = context.client!.userId!;
  const chatId = textValue(context.message.chatId || context.message.chat_id);

  console.log("[DM_CLOSE_RECEIVED]", {
    userId,
    chatId,
    requestId: context.message.request_id,
    at: new Date().toISOString(),
  });

  clearUserActiveDmChat(userId);

  console.log("[DM_CLOSE_CLEARED_ACTIVE_CHAT]", {
    userId,
    chatId,
    active: false,
    at: new Date().toISOString(),
  });

  sendSuccess(context.socket, {
    handler: WS_EVENTS.DM_CLOSE_EVENT,
    request_id: context.message.request_id,
    type: "success",
  });
};
const handleDmSend: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.DM_SEND_EVENT)) return;

  const fromUserId = context.client!.userId!;

  console.log("[DM_SEND_RECEIVED]", {
    fromUserId,
    requestId: context.message.request_id,
    toUserId:
      context.message.to_user_id ||
      context.message.toUserId ||
      context.message.target_user_id ||
      context.message.targetUserId,
    type: context.message.type || context.message.message_type,
    text: context.message.text,
    at: new Date().toISOString(),
  });

  const result = await sendDmMessageService({
    fromUserId,
    payload: context.message,
  });

  if (!result.ok) {
    console.log("[DM_SEND_ERROR]", {
      fromUserId,
      reason: result.reason,
      requestId: context.message.request_id,
      at: new Date().toISOString(),
    });

    sendError(
      context.socket,
      WS_EVENTS.DM_SEND_EVENT,
      result.reason,
      context.message.request_id
    );
    return;
  }

  /*
    هل الطرف الآخر فاتح نفس المحادثة؟
    هذا لا نستخدمه لتحديد delivered الآن.
    نستخدمه فقط في اللوج حتى نعرف هل seen متوقع أم لا.
  */
  const targetActiveInSameChat = isUserActiveInDmChat(
    result.message.toUserId,
    result.message.chatId
  );

  /*
    deliveredVisible:
    يعني الطرف الآخر Online + صديق + لم يخفِ حالته.
    هذا يعطي علامتين عادي.
  */
  const deliveredVisible = result.delivered === true;

  console.log("[DM_SEND_DELIVERY_CHECK]", {
    fromUserId,
    toUserId: result.message.toUserId,
    chatId: result.message.chatId,
    messageId: result.message.messageId,
    tempId: result.message.tempId,

    deliveredVisible,
    resultDelivered: result.delivered,

    targetOnlineReal: result.targetOnlineReal,
    targetHidden: result.targetHidden,
    isFriend: result.isFriend,
    canShowTargetActivity: result.canShowTargetActivity,

    /*
      لو true، غالبًا سيأتي dmSeen بعدها وتتحول العلامتين للون.
      لو false، تظل علامتين عادي فقط.
    */
    targetActiveInSameChat,

    storedInRedis: result.storedInRedis,
    at: new Date().toISOString(),
  });

  /*
    رد للمرسل:
    delivered = true لو الطرف الآخر Online ولم يخفِ حالته.
    هذا يظهر علامتين عادي في Flutter.
  */
  sendSuccess(context.socket, {
    handler: WS_EVENTS.DM_SEND_EVENT,
    request_id: context.message.request_id,
    message: result.message,
    delivered: deliveredVisible,
    storedInRedis: result.storedInRedis,
    targetHidden: result.targetHidden,
    isFriend: result.isFriend,
    canShowTargetActivity: result.canShowTargetActivity,
  });

  console.log("[DM_SEND_ACK_SENT_TO_SENDER]", {
    fromUserId,
    toUserId: result.message.toUserId,
    chatId: result.message.chatId,
    messageId: result.message.messageId,
    deliveredSentToFlutter: deliveredVisible,
    targetActiveInSameChat,
    at: new Date().toISOString(),
  });

  /*
    إرسال الرسالة للمستقبل يعتمد على الاتصال الحقيقي.
  */
  if (result.targetOnlineReal) {
    console.log("[DM_SEND_INCOMING_TO_TARGET]", {
      fromUserId,
      toUserId: result.message.toUserId,
      chatId: result.message.chatId,
      messageId: result.message.messageId,
      targetOnlineReal: result.targetOnlineReal,
      at: new Date().toISOString(),
    });

    sendToUserIfOnline(result.message.toUserId, {
      handler: WS_EVENTS.DM_MESSAGE_EVENT,
      type: "incoming",
      message: result.message,
      fromUsername: result.message.fromUsername,
      fromPhotoUrl: result.message.fromPhotoUrl,
      targetHidden: result.targetHidden,
    });

    /*
      نرسل delivery event لو Online ولم يخفِ حالته.
      هذا يجعلها علامتين عادي.
      التلوين لا يحدث هنا.
      التلوين يحدث فقط من DM_SEEN_EVENT.
    */
    if (deliveredVisible) {
      console.log("[DM_SEND_DELIVERY_EVENT_SENT]", {
        fromUserId,
        toUserId: result.message.toUserId,
        chatId: result.message.chatId,
        messageId: result.message.messageId,
        tempId: result.message.tempId,
        targetActiveInSameChat,
        at: new Date().toISOString(),
      });

      sendSuccess(context.socket, {
        handler: WS_EVENTS.DM_DELIVERY_EVENT,
        request_id: context.message.request_id,
        type: "delivered",
        messageId: result.message.messageId,
        tempId: result.message.tempId,
        chatId: result.message.chatId,
        toUserId: result.message.toUserId,
        delivered: true,
        deliveredAt: new Date().toISOString(),
      });
    } else {
      console.log("[DM_SEND_DELIVERY_EVENT_SKIPPED]", {
        fromUserId,
        toUserId: result.message.toUserId,
        chatId: result.message.chatId,
        messageId: result.message.messageId,
        reason: "target_offline_or_hidden_or_not_allowed",
        resultDelivered: result.delivered,
        targetOnlineReal: result.targetOnlineReal,
        targetHidden: result.targetHidden,
        isFriend: result.isFriend,
        canShowTargetActivity: result.canShowTargetActivity,
        at: new Date().toISOString(),
      });
    }
  } else {
    console.log("[DM_SEND_TARGET_OFFLINE_OR_NOT_CONNECTED]", {
      fromUserId,
      toUserId: result.message.toUserId,
      chatId: result.message.chatId,
      messageId: result.message.messageId,
      storedInRedis: result.storedInRedis,
      at: new Date().toISOString(),
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
    ? context.message.messageIds
      .map((id: any) => String(id || "").trim())
      .filter(Boolean)
    : [];

  console.log("[DM_SEEN_RECEIVED]", {
    fromUserId,
    toUserId,
    chatId,
    messageIds,
    count: messageIds.length,
    requestId: context.message.request_id,
    socketId: (context.socket as any).id || "",
    at: new Date().toISOString(),
  });

  if (!toUserId || !chatId || messageIds.length === 0) {
    console.log("[DM_SEEN_IGNORED_INVALID_PAYLOAD]", {
      fromUserId,
      toUserId,
      chatId,
      messageIds,
    });
    return;
  }

  const activeInSameChat = isUserActiveInDmChat(fromUserId, chatId);

  console.log("[DM_SEEN_ACTIVE_CHECK]", {
    fromUserId,
    chatId,
    activeInSameChat,
    at: new Date().toISOString(),
  });

  /*
    مهم جدًا:
    لا نرسل seen إلا لو المستخدم فاتح نفس المحادثة حاليًا.
  */
  if (!activeInSameChat) {
    console.log("[DM_SEEN_BLOCKED_NOT_ACTIVE_IN_CHAT]", {
      fromUserId,
      toUserId,
      chatId,
      messageIds,
    });
    return;
  }
  const result = await canSendDmSignal({
    fromUserId,
    toUserId,
  });

  /*
    canSendDmSignal تمنع seen لو:
    - ليسوا أصدقاء
    - المستخدم مخفي الحالة
    - الطرف الآخر مخفي الحالة
    - يوجد حظر
  */
  if (!result.ok) return;
  console.log("[DM_SEEN_SENT_TO_SENDER]", {
    fromUserId,
    toUserId,
    chatId,
    messageIds,
    at: new Date().toISOString(),
  });
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
      fromUsername: message.fromUsername,
      fromPhotoUrl: message.fromPhotoUrl,
      fromRedis: true,
    });

    /*
      لا نبلغ المرسل الأصلي بوصول الرسالة إلا لو:
      المرسل والمستقبل أصدقاء
      والمستقبل ليس مخفي الحالة
    */
    const permission = await checkDmPermissionOnly({
      fromUserId: message.fromUserId,
      toUserId: message.toUserId,
    });

    if (
      permission.ok &&
      permission.isFriend === true &&
      permission.targetHidden !== true
    ) {
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
  }
};

export const dmHandlers = {
  [WS_HANDLERS.DM_SEND]: handleDmSend,
  [WS_HANDLERS.DM_TYPING]: handleDmTyping,
  [WS_HANDLERS.DM_SEEN]: handleDmSeen,
  [WS_HANDLERS.DM_EDIT]: handleDmEdit,
  [WS_HANDLERS.DM_DELETE]: handleDmDelete,
  [WS_HANDLERS.DM_CLEAR]: handleDmClear,
  [WS_HANDLERS.DM_OPEN]: handleDmOpen,
  [WS_HANDLERS.DM_CLOSE]: handleDmClose,
  [WS_HANDLERS.DM_PENDING_DELIVER]: handleDmPendingDeliver,
};