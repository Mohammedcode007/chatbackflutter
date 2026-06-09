import { WsHandlerContext } from "./ws.types";
import { sendError } from "./ws.utils";

export function requireLogin(context: WsHandlerContext, eventHandler: string) {
  if (!context.client?.isLoggedIn || !context.client.userId) {
    sendError(
      context.socket,
      eventHandler,
      "not_logged_in",
      context.message.request_id
    );

    return false;
  }

  return true;
}