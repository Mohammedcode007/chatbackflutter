import type { WsHandler } from "../../websocket/ws.types";
import { sendError, sendSuccess } from "../../websocket/ws.utils";
import { updateClient } from "../../websocket/stores/clients.store";
import { leaveAllSocketRooms } from "../../websocket/stores/rooms.store";
import { WS_EVENTS, WS_HANDLERS } from "../../websocket/ws.events";

import { isLoginPayload, isRegisterPayload } from "./auth.validators";
import { loginService, logoutService, registerService } from "./auth.service";
import { deliverPendingPrivateMessages } from "../chats/chats.delivery";

const saveLoggedInClient = (context: Parameters<WsHandler>[0], user: any, session: string) => {
  updateClient(context.socket, {
    mongoId: user.mongoId,
    userId: user.userId,
    username: user.username,
    photoUrl: user.photoUrl,
    session,
    isLoggedIn: true,
  });
};

const sendAuthSuccess = (
  context: Parameters<WsHandler>[0],
  eventHandler: string,
  user: any
) => {
  sendSuccess(context.socket, {
    handler: eventHandler,
    request_id: context.message.request_id,

    user_id: user.userId,
    username: user.username,
    photo_url: user.photoUrl,
    current: user.current,

    is_manual_offline: user.isManualOffline,
    privacy: user.privacy,
    features: user.features,
  });
};

const handleRegister: WsHandler = async (context) => {
  const { socket, message } = context;

  if (!isRegisterPayload(message)) {
    sendError(
      socket,
      WS_EVENTS.REGISTER_EVENT,
      "invalid_register_payload",
      message.request_id
    );
    return;
  }

  const result = await registerService(message);

  if (!result.ok) {
    sendError(
      socket,
      WS_EVENTS.REGISTER_EVENT,
      result.reason,
      message.request_id
    );
    return;
  }

  const user = result.user;

  saveLoggedInClient(context, user, message.session);

  sendAuthSuccess(context, WS_EVENTS.REGISTER_EVENT, user);
};

const handleLogin: WsHandler = async (context) => {
  const { socket, message } = context;

  if (!isLoginPayload(message)) {
    sendError(
      socket,
      WS_EVENTS.LOGIN_EVENT,
      "invalid_login_payload",
      message.request_id
    );
    return;
  }

  const result = await loginService(message);

  if (!result.ok) {
    sendError(
      socket,
      WS_EVENTS.LOGIN_EVENT,
      result.reason,
      message.request_id
    );
    return;
  }

  const user = result.user;

  saveLoggedInClient(context, user, message.session);

  sendAuthSuccess(context, WS_EVENTS.LOGIN_EVENT, user);

  await deliverPendingPrivateMessages(user.userId);
};

const handleLogout: WsHandler = async (context) => {
  const { socket, message } = context;

  await logoutService();

  leaveAllSocketRooms(socket);

  updateClient(socket, {
    mongoId: undefined,
    userId: undefined,
    username: undefined,
    photoUrl: undefined,
    session: undefined,
    isLoggedIn: false,
    activeRoomId: undefined,
    activeChatId: undefined,
  });

  sendSuccess(socket, {
    handler: WS_EVENTS.LOGOUT_EVENT,
    request_id: message.request_id,
    message: "logged_out",
  });
};
export const authHandlers = {
  [WS_HANDLERS.AUTH_REGISTER]: handleRegister,
  register: handleRegister,

  [WS_HANDLERS.AUTH_LOGIN]: handleLogin,
  login: handleLogin,

  [WS_HANDLERS.AUTH_LOGOUT]: handleLogout,
  logout: handleLogout,
};