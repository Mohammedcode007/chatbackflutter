"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dmHandlers = void 0;
const ws_auth_1 = require("../../websocket/ws.auth");
const ws_utils_1 = require("../../websocket/ws.utils");
const clients_store_1 = require("../../websocket/stores/clients.store");
const ws_events_1 = require("../../websocket/ws.events");
const dm_service_1 = require("./dm.service");
const dmActiveChats_store_1 = require("../../websocket/stores/dmActiveChats.store");
function textValue(value) {
    return String(value || "").trim();
}
const handleDmOpen = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.DM_OPEN_EVENT))
        return;
    const userId = context.client.userId;
    const chatId = textValue(context.message.chatId || context.message.chat_id);
    console.log("[DM_OPEN_RECEIVED]", {
        userId,
        chatId,
        requestId: context.message.request_id,
        socketId: context.socket.id || "",
        at: new Date().toISOString(),
    });
    if (!chatId) {
        console.log("[DM_OPEN_ERROR_MISSING_CHAT_ID]", {
            userId,
            message: context.message,
        });
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.DM_OPEN_EVENT, "missing_chat_id", context.message.request_id);
        return;
    }
    (0, dmActiveChats_store_1.setUserActiveDmChat)(userId, chatId);
    console.log("[DM_OPEN_SAVED_ACTIVE_CHAT]", {
        userId,
        chatId,
        active: true,
        at: new Date().toISOString(),
    });
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: ws_events_1.WS_EVENTS.DM_OPEN_EVENT,
        request_id: context.message.request_id,
        type: "success",
        chatId,
    });
};
const handleDmClose = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.DM_CLOSE_EVENT))
        return;
    const userId = context.client.userId;
    const chatId = textValue(context.message.chatId || context.message.chat_id);
    console.log("[DM_CLOSE_RECEIVED]", {
        userId,
        chatId,
        requestId: context.message.request_id,
        at: new Date().toISOString(),
    });
    (0, dmActiveChats_store_1.clearUserActiveDmChat)(userId);
    console.log("[DM_CLOSE_CLEARED_ACTIVE_CHAT]", {
        userId,
        chatId,
        active: false,
        at: new Date().toISOString(),
    });
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: ws_events_1.WS_EVENTS.DM_CLOSE_EVENT,
        request_id: context.message.request_id,
        type: "success",
    });
};
const handleDmSend = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.DM_SEND_EVENT))
        return;
    const fromUserId = context.client.userId;
    console.log("[DM_SEND_RECEIVED]", {
        fromUserId,
        requestId: context.message.request_id,
        toUserId: context.message.to_user_id ||
            context.message.toUserId ||
            context.message.target_user_id ||
            context.message.targetUserId,
        type: context.message.type || context.message.message_type,
        text: context.message.text,
        at: new Date().toISOString(),
    });
    const result = await (0, dm_service_1.sendDmMessageService)({
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
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.DM_SEND_EVENT, result.reason, context.message.request_id);
        return;
    }
    /*
      هل الطرف الآخر فاتح نفس المحادثة؟
      هذا لا نستخدمه لتحديد delivered الآن.
      نستخدمه فقط في اللوج حتى نعرف هل seen متوقع أم لا.
    */
    const targetActiveInSameChat = (0, dmActiveChats_store_1.isUserActiveInDmChat)(result.message.toUserId, result.message.chatId);
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
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: ws_events_1.WS_EVENTS.DM_SEND_EVENT,
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
        (0, clients_store_1.sendToUserIfOnline)(result.message.toUserId, {
            handler: ws_events_1.WS_EVENTS.DM_MESSAGE_EVENT,
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
            (0, ws_utils_1.sendSuccess)(context.socket, {
                handler: ws_events_1.WS_EVENTS.DM_DELIVERY_EVENT,
                request_id: context.message.request_id,
                type: "delivered",
                messageId: result.message.messageId,
                tempId: result.message.tempId,
                chatId: result.message.chatId,
                toUserId: result.message.toUserId,
                delivered: true,
                deliveredAt: new Date().toISOString(),
            });
        }
        else {
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
    }
    else {
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
const handleDmTyping = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.DM_TYPING_EVENT))
        return;
    const fromUserId = context.client.userId;
    const toUserId = textValue(context.message.to_user_id ||
        context.message.toUserId ||
        context.message.target_user_id ||
        context.message.targetUserId);
    const result = await (0, dm_service_1.canSendDmSignal)({
        fromUserId,
        toUserId,
    });
    /*
      لو المستقبل offline أو hide activity لا نرسل typing ولا نرجع error مزعج.
    */
    if (!result.ok)
        return;
    (0, clients_store_1.sendToUserIfOnline)(toUserId, {
        handler: ws_events_1.WS_EVENTS.DM_TYPING_EVENT,
        type: "typing",
        fromUserId,
        toUserId,
        isTyping: context.message.isTyping === true,
    });
};
const handleDmSeen = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.DM_SEEN_EVENT))
        return;
    const fromUserId = context.client.userId;
    const toUserId = textValue(context.message.to_user_id ||
        context.message.toUserId ||
        context.message.target_user_id ||
        context.message.targetUserId);
    const chatId = textValue(context.message.chatId || context.message.chat_id);
    const messageIds = Array.isArray(context.message.messageIds)
        ? context.message.messageIds
            .map((id) => String(id || "").trim())
            .filter(Boolean)
        : [];
    console.log("[DM_SEEN_RECEIVED]", {
        fromUserId,
        toUserId,
        chatId,
        messageIds,
        count: messageIds.length,
        requestId: context.message.request_id,
        socketId: context.socket.id || "",
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
    const activeInSameChat = (0, dmActiveChats_store_1.isUserActiveInDmChat)(fromUserId, chatId);
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
    const result = await (0, dm_service_1.canSendDmSignal)({
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
    if (!result.ok)
        return;
    console.log("[DM_SEEN_SENT_TO_SENDER]", {
        fromUserId,
        toUserId,
        chatId,
        messageIds,
        at: new Date().toISOString(),
    });
    (0, clients_store_1.sendToUserIfOnline)(toUserId, {
        handler: ws_events_1.WS_EVENTS.DM_SEEN_EVENT,
        type: "seen",
        fromUserId,
        toUserId,
        chatId,
        messageIds,
        seenAt: new Date().toISOString(),
    });
};
const handleDmEdit = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.DM_EDIT_EVENT))
        return;
    const fromUserId = context.client.userId;
    const toUserId = textValue(context.message.to_user_id ||
        context.message.toUserId ||
        context.message.target_user_id ||
        context.message.targetUserId);
    const messageId = textValue(context.message.message_id || context.message.messageId);
    const text = textValue(context.message.text || context.message.body);
    if (!toUserId || !messageId || !text) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.DM_EDIT_EVENT, "invalid_edit_payload", context.message.request_id);
        return;
    }
    const permission = await (0, dm_service_1.checkDmPermissionOnly)({
        fromUserId,
        toUserId,
    });
    if (!permission.ok) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.DM_EDIT_EVENT, permission.reason, context.message.request_id);
        return;
    }
    const payload = {
        handler: ws_events_1.WS_EVENTS.DM_EDIT_EVENT,
        type: "edited",
        fromUserId,
        toUserId,
        messageId,
        text,
        editedAt: new Date().toISOString(),
    };
    (0, ws_utils_1.sendSuccess)(context.socket, {
        ...payload,
        request_id: context.message.request_id,
    });
    if (permission.targetOnlineReal) {
        (0, clients_store_1.sendToUserIfOnline)(toUserId, payload);
    }
};
const handleDmDelete = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.DM_DELETE_EVENT))
        return;
    const fromUserId = context.client.userId;
    const toUserId = textValue(context.message.to_user_id ||
        context.message.toUserId ||
        context.message.target_user_id ||
        context.message.targetUserId);
    const messageId = textValue(context.message.message_id || context.message.messageId);
    if (!toUserId || !messageId) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.DM_DELETE_EVENT, "invalid_delete_payload", context.message.request_id);
        return;
    }
    const permission = await (0, dm_service_1.checkDmPermissionOnly)({
        fromUserId,
        toUserId,
    });
    if (!permission.ok) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.DM_DELETE_EVENT, permission.reason, context.message.request_id);
        return;
    }
    const payload = {
        handler: ws_events_1.WS_EVENTS.DM_DELETE_EVENT,
        type: "deleted",
        fromUserId,
        toUserId,
        messageId,
        deletedAt: new Date().toISOString(),
    };
    (0, ws_utils_1.sendSuccess)(context.socket, {
        ...payload,
        request_id: context.message.request_id,
    });
    if (permission.targetOnlineReal) {
        (0, clients_store_1.sendToUserIfOnline)(toUserId, payload);
    }
};
const handleDmClear = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.DM_CLEAR_EVENT))
        return;
    /*
      clear محلي فقط في Flutter.
      الباك يرجع success فقط للتأكيد.
    */
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: ws_events_1.WS_EVENTS.DM_CLEAR_EVENT,
        request_id: context.message.request_id,
        cleared: true,
    });
};
const handleDmPendingDeliver = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.DM_MESSAGE_EVENT))
        return;
    const userId = context.client.userId;
    const messages = await (0, dm_service_1.getAndClearPendingDmMessages)(userId);
    for (const message of messages) {
        /*
          أرسل الرسالة للمستقبل الذي سجل دخول الآن.
        */
        (0, ws_utils_1.sendSuccess)(context.socket, {
            handler: ws_events_1.WS_EVENTS.DM_MESSAGE_EVENT,
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
        const permission = await (0, dm_service_1.checkDmPermissionOnly)({
            fromUserId: message.fromUserId,
            toUserId: message.toUserId,
        });
        if (permission.ok &&
            permission.isFriend === true &&
            permission.targetHidden !== true) {
            (0, clients_store_1.sendToUserIfOnline)(message.fromUserId, {
                handler: ws_events_1.WS_EVENTS.DM_DELIVERY_EVENT,
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
exports.dmHandlers = {
    [ws_events_1.WS_HANDLERS.DM_SEND]: handleDmSend,
    [ws_events_1.WS_HANDLERS.DM_TYPING]: handleDmTyping,
    [ws_events_1.WS_HANDLERS.DM_SEEN]: handleDmSeen,
    [ws_events_1.WS_HANDLERS.DM_EDIT]: handleDmEdit,
    [ws_events_1.WS_HANDLERS.DM_DELETE]: handleDmDelete,
    [ws_events_1.WS_HANDLERS.DM_CLEAR]: handleDmClear,
    [ws_events_1.WS_HANDLERS.DM_OPEN]: handleDmOpen,
    [ws_events_1.WS_HANDLERS.DM_CLOSE]: handleDmClose,
    [ws_events_1.WS_HANDLERS.DM_PENDING_DELIVER]: handleDmPendingDeliver,
};
//# sourceMappingURL=dm.handlers.js.map