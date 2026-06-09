import { safeSend } from "../../websocket/ws.utils";
import { WS_EVENTS } from "../../websocket/ws.events";
import { getUserSockets } from "../../websocket/stores/clients.store";
import {
  popAllPendingPrivateMessages,
  addPendingPrivateMessage,
} from "./pending-messages.queue";
import { canSendPrivateMessage } from "../privacy/privacy.service";
import { UserModel } from "../../models/User.model";

export async function deliverPendingPrivateMessages(userId: string) {
  const receiver = await UserModel.findOne({ userId }).lean();

  if (!receiver) return;

  /**
   * لو المستخدم عامل Offline يدوي:
   * لا نسلّم له الرسائل المؤجلة حتى يفتح الحالة Online.
   */
  if (receiver.isManualOffline) {
    return;
  }

  const pendingMessages = await popAllPendingPrivateMessages(userId);

  if (pendingMessages.length === 0) return;

  for (const message of pendingMessages) {
    const permission = await canSendPrivateMessage({
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

    const sockets = getUserSockets(userId);

    if (sockets.size === 0) {
      await addPendingPrivateMessage(userId, message);
      continue;
    }

    for (const socket of sockets) {
      safeSend(socket, {
        handler: WS_EVENTS.CHAT_MESSAGE_EVENT,
        type: "success",
        reason: "null",
        delivery: "queued",
        ...message,
      });
    }
  }
}