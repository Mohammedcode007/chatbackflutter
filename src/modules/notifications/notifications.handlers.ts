import { WsHandler } from "../../websocket/ws.types";
import { sendSuccess } from "../../websocket/ws.utils";
import { requireLogin } from "../../websocket/ws.auth";
import { WS_EVENTS, WS_HANDLERS } from "../../websocket/ws.events";

const handleNotificationsList: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.NOTIFICATION_EVENT)) return;

  sendSuccess(context.socket, {
    handler: WS_EVENTS.NOTIFICATION_EVENT,
    request_id: context.message.request_id,
    notifications: [],
  });
};

const handleNotificationRead: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.NOTIFICATION_EVENT)) return;

  sendSuccess(context.socket, {
    handler: WS_EVENTS.NOTIFICATION_EVENT,
    request_id: context.message.request_id,
    notification_id: context.message.notification_id,
    read: true,
  });
};

export const notificationsHandlers = {
  [WS_HANDLERS.NOTIFICATIONS_LIST]: handleNotificationsList,
  [WS_HANDLERS.NOTIFICATIONS_READ]: handleNotificationRead,
};