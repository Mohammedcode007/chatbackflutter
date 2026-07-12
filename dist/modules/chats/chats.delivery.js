"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliverPendingPrivateMessages = deliverPendingPrivateMessages;
const ws_utils_1 = require("../../websocket/ws.utils");
const ws_events_1 = require("../../websocket/ws.events");
const clients_store_1 = require("../../websocket/stores/clients.store");
const pending_messages_queue_1 = require("./pending-messages.queue");
const privacy_service_1 = require("../privacy/privacy.service");
const User_model_1 = require("../../models/User.model");
async function deliverPendingPrivateMessages(userId) {
    const receiver = await User_model_1.UserModel.findOne({ userId }).lean();
    if (!receiver)
        return;
    /**
     * لو المستخدم عامل Offline يدوي:
     * لا نسلّم له الرسائل المؤجلة حتى يفتح الحالة Online.
     */
    if (receiver.isManualOffline) {
        return;
    }
    const pendingMessages = await (0, pending_messages_queue_1.popAllPendingPrivateMessages)(userId);
    if (pendingMessages.length === 0)
        return;
    for (const message of pendingMessages) {
        const permission = await (0, privacy_service_1.canSendPrivateMessage)({
            senderId: message.sender_id,
            receiverId: userId,
        });
        /**
         * لو أثناء فترة الانتظار المستقبل قفل الخاص أو عمل بلوك:
         * لا نسلّم الرسالة ولا نعيد حفظها.
         */
        if (!permission.ok) {
            continue;
        }
        const sockets = (0, clients_store_1.getUserSockets)(userId);
        if (sockets.size === 0) {
            await (0, pending_messages_queue_1.addPendingPrivateMessage)(userId, message);
            continue;
        }
        for (const socket of sockets) {
            (0, ws_utils_1.safeSend)(socket, {
                handler: ws_events_1.WS_EVENTS.CHAT_MESSAGE_EVENT,
                type: "success",
                reason: "null",
                delivery: "queued",
                ...message,
            });
        }
    }
}
//# sourceMappingURL=chats.delivery.js.map