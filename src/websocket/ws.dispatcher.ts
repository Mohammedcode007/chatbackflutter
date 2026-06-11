import { WsHandler, WsHandlerContext } from "./ws.types";
import { sendError } from "./ws.utils";
import { WS_EVENTS, WS_HANDLERS } from "./ws.events";
import { storeHandlers } from "../modules/store/store.handlers";
import { authHandlers } from "../modules/auth/auth.handlers";
import { friendsHandlers } from "../modules/friends/friends.handlers";
import { chatsHandlers } from "../modules/chats/chats.handlers";
import { roomsHandlers } from "../modules/rooms/rooms.handlers";
import { tweetsHandlers } from "../modules/tweets/tweets.handlers";
import { notificationsHandlers } from "../modules/notifications/notifications.handlers";
import { featuresHandlers } from "../modules/features/features.handlers";
import { usersHandlers } from "../modules/users/users.handlers";
import { dmHandlers } from "../modules/dm/dm.handlers";
const handlers: Record<string, WsHandler> = {
  ...authHandlers,
  ...storeHandlers,

  ...friendsHandlers,
  ...chatsHandlers,
  ...roomsHandlers,
  ...tweetsHandlers,
  ...notificationsHandlers,
  ...featuresHandlers,
  ...dmHandlers,

  ...usersHandlers,
};

export async function dispatchWsMessage(context: WsHandlerContext) {
  const handlerName = context.message.handler;

  const handler = handlers[handlerName];

  if (!handler) {
    sendError(
      context.socket,
      WS_EVENTS.ERROR_EVENT,
      `unknown_handler:${handlerName}`,
      context.message.request_id
    );

    return;
  }

  try {
    await handler(context);
  } catch (error: any) {
    sendError(
      context.socket,
      WS_EVENTS.ERROR_EVENT,
      error?.message || "server_error",
      context.message.request_id
    );
  }
}