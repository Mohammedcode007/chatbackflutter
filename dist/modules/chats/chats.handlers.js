"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatsHandlers = void 0;
const ws_auth_1 = require("../../websocket/ws.auth");
const ws_utils_1 = require("../../websocket/ws.utils");
const clients_store_1 = require("../../websocket/stores/clients.store");
const ws_events_1 = require("../../websocket/ws.events");
const id_1 = require("../../utils/id");
const privacy_service_1 = require("../privacy/privacy.service");
const pending_messages_queue_1 = require("./pending-messages.queue");
const handleChatMessageSend = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.CHAT_MESSAGE_EVENT))
        return;
    const sender = context.client;
    const receiverId = String(context.message.receiver_id || "").trim();
    const body = String(context.message.body || "").trim();
    const messageType = String(context.message.message_type || "text").trim();
    const localMessageId = String(context.message.local_message_id || "").trim();
    if (!receiverId || !body) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.CHAT_MESSAGE_EVENT, "missing_receiver_or_body", context.message.request_id);
        return;
    }
    const permission = await (0, privacy_service_1.canSendPrivateMessage)({
        senderId: sender.userId,
        receiverId,
    });
    if (!permission.ok) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.CHAT_MESSAGE_EVENT, permission.reason, context.message.request_id);
        return;
    }
    const message = {
        message_id: (0, id_1.createId)(),
        local_message_id: localMessageId || null,
        sender_id: sender.userId,
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
    const receiverCanReceiveNow = (0, clients_store_1.isUserOnline)(receiverId) && !receiverManualOffline;
    if (receiverCanReceiveNow) {
        for (const receiverSocket of (0, clients_store_1.getUserSockets)(receiverId)) {
            (0, ws_utils_1.safeSend)(receiverSocket, {
                handler: ws_events_1.WS_EVENTS.CHAT_MESSAGE_EVENT,
                type: "success",
                reason: "null",
                delivery: "live",
                ...message,
            });
        }
    }
    else {
        await (0, pending_messages_queue_1.addPendingPrivateMessage)(receiverId, message);
    }
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: ws_events_1.WS_EVENTS.CHAT_MESSAGE_EVENT,
        request_id: context.message.request_id,
        status: receiverCanReceiveNow ? "sent" : "queued",
        receiver_online: (0, clients_store_1.isUserOnline)(receiverId),
        receiver_manual_offline: receiverManualOffline,
        local_message_id: localMessageId || null,
        message_id: message.message_id,
        receiver_id: receiverId,
        created_at: message.created_at,
    });
};
const handleTypingStart = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.CHAT_TYPING_EVENT))
        return;
    const sender = context.client;
    const receiverId = String(context.message.receiver_id || "").trim();
    if (!receiverId)
        return;
    const permission = await (0, privacy_service_1.canSendPrivateMessage)({
        senderId: sender.userId,
        receiverId,
    });
    if (!permission.ok)
        return;
    if (permission.receiver.isManualOffline)
        return;
    for (const receiverSocket of (0, clients_store_1.getUserSockets)(receiverId)) {
        (0, ws_utils_1.safeSend)(receiverSocket, {
            handler: ws_events_1.WS_EVENTS.CHAT_TYPING_EVENT,
            type: "success",
            reason: "null",
            typing: true,
            sender_id: sender.userId,
            sender_username: sender.username,
            receiver_id: receiverId,
        });
    }
};
const handleTypingStop = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.CHAT_TYPING_EVENT))
        return;
    const sender = context.client;
    const receiverId = String(context.message.receiver_id || "").trim();
    if (!receiverId)
        return;
    const permission = await (0, privacy_service_1.canSendPrivateMessage)({
        senderId: sender.userId,
        receiverId,
    });
    if (!permission.ok)
        return;
    if (permission.receiver.isManualOffline)
        return;
    for (const receiverSocket of (0, clients_store_1.getUserSockets)(receiverId)) {
        (0, ws_utils_1.safeSend)(receiverSocket, {
            handler: ws_events_1.WS_EVENTS.CHAT_TYPING_EVENT,
            type: "success",
            reason: "null",
            typing: false,
            sender_id: sender.userId,
            sender_username: sender.username,
            receiver_id: receiverId,
        });
    }
};
const handleChatsList = async (context) => {
    if (!(0, ws_auth_1.requireLogin)(context, ws_events_1.WS_EVENTS.CHATS_LIST_EVENT))
        return;
    (0, ws_utils_1.sendSuccess)(context.socket, {
        handler: ws_events_1.WS_EVENTS.CHATS_LIST_EVENT,
        request_id: context.message.request_id,
        source: "local_device_only",
        chats: [],
    });
};
exports.chatsHandlers = {
    [ws_events_1.WS_HANDLERS.CHATS_LIST]: handleChatsList,
    [ws_events_1.WS_HANDLERS.CHATS_MESSAGE_SEND]: handleChatMessageSend,
    [ws_events_1.WS_HANDLERS.CHATS_TYPING_START]: handleTypingStart,
    [ws_events_1.WS_HANDLERS.CHATS_TYPING_STOP]: handleTypingStop,
};
//# sourceMappingURL=chats.handlers.js.map