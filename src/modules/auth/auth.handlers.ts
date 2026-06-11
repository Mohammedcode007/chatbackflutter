import type { WsHandler } from "../../websocket/ws.types";
import { sendError, sendSuccess } from "../../websocket/ws.utils";
import {
  updateClient,
  sendToUserIfOnline,
} from "../../websocket/stores/clients.store";
import { leaveAllSocketRooms } from "../../websocket/stores/rooms.store";
import { WS_EVENTS, WS_HANDLERS } from "../../websocket/ws.events";
import { UserModel } from "../../models/User.model";
import { isLoginPayload, isRegisterPayload } from "./auth.validators";
import { loginService, logoutService, registerService } from "./auth.service";
import { deliverPendingPrivateMessages } from "../chats/chats.delivery";
import { getAndClearPendingDmMessages } from "../dm/dm.service";
const notifyFriendsAboutAuthStatus = async (
  userId: string,
  changedFields: string[] = []
) => {
  if (!userId) return;

  const user = await UserModel.findOne({ userId }).lean();

  if (!user) return;

  const friends = Array.isArray((user as any).friends)
    ? (user as any).friends
    : [];

  const hideActivityStatus = user.hideActivityStatus === true;
  const isManualOffline = user.isManualOffline === true;
  const isHidden = hideActivityStatus || isManualOffline;

  const publicUser = {
    userId: user.userId,
    username: user.username,

    photoUrl: user.photoUrl || "",
    coverUrl: user.coverUrl || "",

    accountColor: user.accountColor || "#2BCB00",

    badgeKey: user.badgeKey || "",
    badgeName: user.badgeName || "",
    badgeValue: user.badgeValue || "",

    badges: Array.isArray((user as any).inventory)
      ? (user as any).inventory
          .filter((item: any) => {
            return item.type === "badge" && item.isActive === true;
          })
          .map((item: any) => ({
            itemId: item.itemId || "",
            key: item.key || "",
            name: item.name || "",
            value: item.value || "",
          }))
      : user.badgeValue
      ? [
          {
            itemId: "",
            key: user.badgeKey || "",
            name: user.badgeName || "",
            value: user.badgeValue || "",
          },
        ]
      : [],

    verificationType: user.verificationType || "none",

    statusMessage: user.statusMessage || "",

    current: isHidden ? "0" : user.current || "0",

    hideActivityStatus,
    isManualOffline,

    isOnline: isHidden
      ? false
      : user.current === "1" || user.current === "online",

    country: user.country || "",
    gender: user.gender || "",
    birthdate: user.birthdate || "",

    privacy: {
      dmPrivacy: user.privacy?.dmPrivacy || "open",
      friendRequestPrivacy: user.privacy?.friendRequestPrivacy || "open",
      allowCalls: user.privacy?.allowCalls || "all",
    },

    stats: {
      friendsCount: user.stats?.friendsCount || 0,
      profileViewsCount: user.stats?.profileViewsCount || 0,
      giftsSentCount: user.stats?.giftsSentCount || 0,
      giftsReceivedCount: user.stats?.giftsReceivedCount || 0,
    },

    updatedAt: user.updatedAt,
  };

  for (const friendUserId of friends) {
    sendToUserIfOnline(friendUserId, {
      handler: WS_EVENTS.USER_PROFILE_LIVE_UPDATE_EVENT,
      type: "user_updated",
      userId,
      user: publicUser,
      changedFields,
    });
  }
};
const saveLoggedInClient = (
  context: Parameters<WsHandler>[0],
  user: any,
  session: string
) => {
  updateClient(context.socket, {
    mongoId: user.mongoId || String(user._id),
    userId: user.userId,
    username: user.username,
    photoUrl: user.photoUrl || "",
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
    photo_url: user.photoUrl || "",
    current: user.current || "0",

    user,
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

await notifyFriendsAboutAuthStatus(user.userId, [
  "current",
  "isOnline",
  "isManualOffline",
]);
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
const pendingDmMessages = await getAndClearPendingDmMessages(user.userId);

for (const message of pendingDmMessages) {
  sendSuccess(context.socket, {
    handler: WS_EVENTS.DM_MESSAGE_EVENT,
    type: "incoming",
    message,
    fromRedis: true,
  });

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
await notifyFriendsAboutAuthStatus(user.userId, [
  "current",
  "isOnline",
  "isManualOffline",
]);

await deliverPendingPrivateMessages(user.userId);
};

const handleLogout: WsHandler = async (context) => {
  const { socket, message } = context;

  const userId = context.client?.userId;

  await logoutService({ userId });

  if (userId) {
await notifyFriendsAboutAuthStatus(userId, [
  "current",
  "isOnline",
  "isManualOffline",
]);
  }

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