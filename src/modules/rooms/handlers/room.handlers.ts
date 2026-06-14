import type { WsHandler } from "../../../websocket/ws.types";
import { requireLogin } from "../../../websocket/ws.auth";
import { sendError, sendSuccess } from "../../../websocket/ws.utils";
import { sendToUserIfOnline } from "../../../websocket/stores/clients.store";
import {
  getRoomUsers,
  isUserInRoom,
  updateRoomUserRole,
  removeUserFromSpecificRoom,
} from "../../../websocket/stores/roomClients.store";
import { WS_EVENTS, WS_HANDLERS } from "../../../websocket/ws.events";
import {
  listRoomUsersByRoleService,
  listRoomLogsService,
  listRoomBannedService,
} from "../services/room-admin-query.service";
import { setRoomRoleService } from "../services/room-role.service";
import { createRoomService } from "../services/room-create.service";
import { joinRoomService, leaveRoomService } from "../services/room-join.service";
import { sendRoomLiveMessageService } from "../services/room-message.service";
import { listRoomsService } from "../services/room-query.service";
import { toggleFavoriteRoomService } from "../services/room-favorite.service";
import { boostRoomService } from "../services/room-boost.service";
import { getClientIp } from "../utils/room.ip";
import {
  kickUserFromRoomService,
  banUserFromRoomService,
} from "../services/room-ban.service";
import { RoomModel } from "../models/Room.model";
const ROOM_MESSAGE_EVENT = "room.message";
const ROOM_USERS_EVENT = "room.users";
const ROOM_ACTIVE_COUNT_EVENT = "room.active_count.update";

function text(value: any) {
  return String(value || "").trim();
}

function boolValue(value: any) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function logStart(name: string, context: any) {
  console.log(`\n===== ${name}_START =====`);
  console.log(`[${name}] raw message:`, context.message);
  console.log(`[${name}] client:`, {
    userId: context.client?.userId,
    username: context.client?.username,
    photoUrl: (context.client as any)?.photoUrl,
    connectionId: context.client?.connectionId,
    isLoggedIn: !!context.client?.userId,
  });
}

function logEnd(name: string) {
  console.log(`===== ${name}_END =====\n`);
}

function getResultMessage(result: any) {
  return result?.message || result?.liveMessage || result?.roomMessage || null;
}

function getRoomLiveUser(roomId: string, userId: string) {
  const users = getRoomUsers(roomId);

  return users.find((user: any) => text(user.userId) === text(userId)) || null;
}

function normalizeActiveUser(user: any) {
  return {
    userId: text(user.userId),
    username: text(user.username),
    photoUrl: text(user.photoUrl),
    socketId: text(user.socketId),
    joinedAt: user.joinedAt || "",
    dc: user.dc === true,

    role: text(user.role || "none"),

    accountColor: text(user.accountColor),
    badgeKey: text(user.badgeKey),
    badgeName: text(user.badgeName),
    badgeValue: text(user.badgeValue),
    verificationType: text(user.verificationType || "none"),
  };
}

function getActiveUsers(roomId: string) {
  return getRoomUsers(roomId).map(normalizeActiveUser);
}

function broadcastToRoomUsers(roomId: string, payload: any) {
  const users = getRoomUsers(roomId);

  console.log("[broadcastToRoomUsers] sending:", {
    roomId,
    usersCount: users.length,
    handler: payload.handler,
    type: payload.type,
  });

  for (const user of users) {
    const userId = text((user as any).userId);

    if (!userId) continue;

    console.log("[broadcastToRoomUsers] to user:", {
      userId,
      username: (user as any).username,
      socketId: (user as any).socketId,
      handler: payload.handler,
    });

    sendToUserIfOnline(userId, payload);
  }
}
function forceUserLeaveLiveRoom(input: {
  context: any;
  roomId: string;
  targetUserId: string;
  eventName: string;
  message: string;
}) {
  const roomId = text(input.roomId);
  const targetUserId = text(input.targetUserId);

  if (!roomId || !targetUserId) {
    return {
      socketIds: [] as string[],
    };
  }

  const liveLeave = removeUserFromSpecificRoom({
    roomId,
    userId: targetUserId,
  });

  for (const socketId of liveLeave.socketIds) {
    const targetSocket = (input.context.socket as any).nsp?.sockets?.get(
      socketId
    );

    if (targetSocket) {
      targetSocket.leave(roomId);

      targetSocket.emit(input.eventName, {
        roomId,
        message: input.message,
      });
    }
  }

  /*
    احتياطيًا، لأن عندك نظام إرسال حسب userId أيضًا.
  */
  sendToUserIfOnline(targetUserId, {
    handler: input.eventName,
    type: input.eventName,
    roomId,
    message: input.message,
  });

  return {
    socketIds: liveLeave.socketIds,
  };
}
function enrichLiveMessage(roomId: string, message: any) {
  if (!message) return message;

  const fromUserId = text(message.fromUserId || message.userId);

  if (!fromUserId) return message;

  const liveUser = getRoomLiveUser(roomId, fromUserId);

  if (!liveUser) return message;

  const normalized = normalizeActiveUser(liveUser);

  return {
    ...message,

    fromUserId: text(message.fromUserId || normalized.userId),
    fromUsername: text(message.fromUsername || normalized.username),
    fromPhotoUrl: text(message.fromPhotoUrl || normalized.photoUrl),
    fromRole: text(message.fromRole || normalized.role || "none"),

    accountColor: normalized.accountColor,
    badgeKey: normalized.badgeKey,
    badgeName: normalized.badgeName,
    badgeValue: normalized.badgeValue,
    verificationType: normalized.verificationType,
  };
}

function makeRoomEventMessage(input: {
  roomId: string;
  userId: string;
  username: string;
  photoUrl: string;
  role?: string;

  accountColor?: string;
  badgeKey?: string;
  badgeName?: string;
  badgeValue?: string;
  verificationType?: string;

  type: "join" | "leave";
}) {
  const now = Date.now();
  const username = input.username || "User";

  const textValue =
    input.type === "join" ? `${username} دخل` : `${username} خرج`;

  return {
    messageId: `${input.type}_${input.userId}_${now}`,
    roomId: input.roomId,

    messageKind: input.type,
    type: "none",

    fromUserId: input.userId,
    fromUsername: username,
    fromPhotoUrl: input.photoUrl,
    fromRole: input.role || "none",

    text: textValue,

    media: null,
    mention: null,
    gift: null,
    entryVideo: null,
    replyTo: null,
    reactions: [],

    accountColor: input.accountColor || "",
    badgeKey: input.badgeKey || "",
    badgeName: input.badgeName || "",
    badgeValue: input.badgeValue || "",
    verificationType: input.verificationType || "none",

    system: {
      action: input.type,
      actorId: input.userId,
      actorUsername: username,
      targetUserId: input.userId,
      targetUsername: username,
      dc: false,
    },

    createdAt: new Date().toISOString(),
  };
}

function roleLabel(role: string) {
  switch (role) {
    case "owner":
      return "اونر";

    case "admin":
      return "ادمن";

    case "member":
      return "عضو";

    case "none":
      return "بدون رتبة";

    default:
      return role || "بدون رتبة";
  }
}

function makeRoomRoleMessage(input: {
  roomId: string;

  actorId: string;
  actorUsername: string;

  targetUserId: string;
  targetUsername: string;

  oldRole: string;
  newRole: string;
}) {
  const now = Date.now();

  const actorUsername = text(input.actorUsername) || "User";
  const targetUsername = text(input.targetUsername) || "User";

  const isRemove = input.newRole === "none";

  const textValue = isRemove
    ? `${actorUsername} أزال رتبة ${targetUsername}`
    : `${actorUsername} وضع ${targetUsername} ${roleLabel(input.newRole)}`;

  return {
    messageId: `role_${input.actorId}_${input.targetUserId}_${now}`,
    roomId: input.roomId,

    /*
      هذه مثل join / leave.
      الفرونت يجب أن يعرض messageKind = role في المنتصف.
    */
    messageKind: "role",
    type: "none",

    fromUserId: input.actorId,
    fromUsername: actorUsername,
    fromPhotoUrl: "",
    fromRole: "none",

    text: textValue,

    media: null,
    mention: null,
    gift: null,
    entryVideo: null,
    replyTo: null,
    reactions: [],

    accountColor: "",
    badgeKey: "",
    badgeName: "",
    badgeValue: "",
    verificationType: "none",

    system: {
      action: isRemove ? "role_removed" : "role_set",

      actorId: input.actorId,
      actorUsername,

      targetUserId: input.targetUserId,
      targetUsername,

      oldRole: input.oldRole,
      newRole: input.newRole,
    },

    createdAt: new Date().toISOString(),
  };
}
const handleRoomKick: WsHandler = async (context) => {
  const logName = "ROOM_KICK_HANDLER";

  try {
    logStart(logName, context);

    if (!requireLogin(context, WS_EVENTS.ROOM_UPDATE_EVENT)) {
      console.log(`[${logName}] requireLogin failed`);
      logEnd(logName);
      return;
    }

    const actorId = context.client!.userId!;
    const actorUsername = text(context.client?.username);

    const roomId = text(context.message.roomId || context.message.room_id);

    const targetUserId = text(
      context.message.targetUserId || context.message.target_user_id
    );

    const targetUsername = text(
      context.message.targetUsername || context.message.target_username
    );

    if (!roomId) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_UPDATE_EVENT,
        "room_id_required",
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    if (!targetUserId) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_UPDATE_EVENT,
        "target_user_id_required",
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    const targetLiveUser = getRoomLiveUser(roomId, targetUserId);

    const finalTargetUsername =
      targetUsername || text((targetLiveUser as any)?.username) || targetUserId;

    const result = await kickUserFromRoomService({
      actorId,
      actorUsername,
      targetUserId,
      targetUsername: finalTargetUsername,
      roomId,
    });

    console.log(`[${logName}] service result:`, result);

    if (!result.ok) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_UPDATE_EVENT,
        result.reason,
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    forceUserLeaveLiveRoom({
      context,
      roomId,
      targetUserId,
      eventName: "room:kicked",
      message: "تم طردك من الغرفة",
    });

    const activeUsers = getActiveUsers(roomId);
    const activeCount = activeUsers.length;

    sendSuccess(context.socket, {
      handler: WS_EVENTS.ROOM_UPDATE_EVENT,
      type: "kick",
      request_id: context.message.request_id,
      roomId,
      targetUserId,
      targetUsername: finalTargetUsername,
      activeCount,
      activeUsers,
    });

    broadcastToRoomUsers(roomId, {
      handler: ROOM_ACTIVE_COUNT_EVENT,
      type: "active_count",
      roomId,
      activeCount,
      activeUsers,
      users: activeUsers,
    });

    broadcastToRoomUsers(roomId, {
      handler: ROOM_USERS_EVENT,
      type: "users",
      roomId,
      users: activeUsers,
      activeUsers,
      activeCount,
    });

    broadcastToRoomUsers(roomId, {
      handler: ROOM_MESSAGE_EVENT,
      type: "message",
      roomId,
      message: makeRoomModerationMessage({
        roomId,
        actorId,
        actorUsername,
        targetUserId,
        targetUsername: finalTargetUsername,
        action: "kick",
      }),
    });

    logEnd(logName);
  } catch (error) {
    console.error(`[${logName}] unexpected error:`, error);

    sendError(
      context.socket,
      WS_EVENTS.ROOM_UPDATE_EVENT,
      "room_kick_failed",
      context.message.request_id
    );

    logEnd(logName);
  }
};
function makeRoomModerationMessage(input: {
  roomId: string;

  actorId: string;
  actorUsername: string;

  targetUserId: string;
  targetUsername: string;

  action: "kick" | "ban";
}) {
  const now = Date.now();

  const actorUsername = text(input.actorUsername) || "User";
  const targetUsername = text(input.targetUsername) || "User";

  const isBan = input.action === "ban";

  const textValue = isBan
    ? `${actorUsername} حظر ${targetUsername}`
    : `${actorUsername} طرد ${targetUsername}`;

  return {
    messageId: `${input.action}_${input.actorId}_${input.targetUserId}_${now}`,
    roomId: input.roomId,

    messageKind: "system",
    type: "none",

    fromUserId: input.actorId,
    fromUsername: actorUsername,
    fromPhotoUrl: "",
    fromRole: "none",

    text: textValue,

    media: null,
    mention: null,
    gift: null,
    entryVideo: null,
    replyTo: null,
    reactions: [],

    accountColor: "",
    badgeKey: "",
    badgeName: "",
    badgeValue: "",
    verificationType: "none",

    system: {
      action: isBan ? "user_banned" : "user_kicked",

      actorId: input.actorId,
      actorUsername,

      targetUserId: input.targetUserId,
      targetUsername,

      message: textValue,
    },

    createdAt: new Date().toISOString(),
  };
}
const handleRoomBan: WsHandler = async (context) => {
  const logName = "ROOM_BAN_HANDLER";

  try {
    logStart(logName, context);

    if (!requireLogin(context, WS_EVENTS.ROOM_UPDATE_EVENT)) {
      console.log(`[${logName}] requireLogin failed`);
      logEnd(logName);
      return;
    }

    const actorId = context.client!.userId!;
    const actorUsername = text(context.client?.username);

    const roomId = text(context.message.roomId || context.message.room_id);

    const targetUserId = text(
      context.message.targetUserId || context.message.target_user_id
    );

    const targetUsername = text(
      context.message.targetUsername || context.message.target_username
    );

    const targetIp = text(context.message.targetIp || context.message.target_ip);
    const banIp = boolValue(context.message.banIp || context.message.ban_ip);

    if (!roomId) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_UPDATE_EVENT,
        "room_id_required",
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    if (!targetUserId) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_UPDATE_EVENT,
        "target_user_id_required",
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    const targetLiveUser = getRoomLiveUser(roomId, targetUserId);

    const finalTargetUsername =
      targetUsername || text((targetLiveUser as any)?.username) || targetUserId;

    const result = await banUserFromRoomService({
      actorId,
      actorUsername,
      targetUserId,
      targetUsername: finalTargetUsername,
      roomId,
      targetIp,
      banIp,
    });

    console.log(`[${logName}] service result:`, result);

    if (!result.ok) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_UPDATE_EVENT,
        result.reason,
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    forceUserLeaveLiveRoom({
      context,
      roomId,
      targetUserId,
      eventName: "room:banned",
      message: "أنت محظور من هذه الغرفة",
    });

    const activeUsers = getActiveUsers(roomId);
    const activeCount = activeUsers.length;

    sendSuccess(context.socket, {
      handler: WS_EVENTS.ROOM_UPDATE_EVENT,
      type: "ban",
      request_id: context.message.request_id,
      roomId,
      targetUserId,
      targetUsername: finalTargetUsername,
      activeCount,
      activeUsers,
      banIp: result.banIp,
      bannedIp: result.bannedIp,
    });

    broadcastToRoomUsers(roomId, {
      handler: ROOM_ACTIVE_COUNT_EVENT,
      type: "active_count",
      roomId,
      activeCount,
      activeUsers,
      users: activeUsers,
    });

    broadcastToRoomUsers(roomId, {
      handler: ROOM_USERS_EVENT,
      type: "users",
      roomId,
      users: activeUsers,
      activeUsers,
      activeCount,
    });

    broadcastToRoomUsers(roomId, {
      handler: ROOM_MESSAGE_EVENT,
      type: "message",
      roomId,
      message: makeRoomModerationMessage({
        roomId,
        actorId,
        actorUsername,
        targetUserId,
        targetUsername: finalTargetUsername,
        action: "ban",
      }),
    });

    logEnd(logName);
  } catch (error) {
    console.error(`[${logName}] unexpected error:`, error);

    sendError(
      context.socket,
      WS_EVENTS.ROOM_UPDATE_EVENT,
      "room_ban_failed",
      context.message.request_id
    );

    logEnd(logName);
  }
};
const handleRoomRoleSet: WsHandler = async (context) => {
  const logName = "ROOM_ROLE_SET_HANDLER";

  try {
    logStart(logName, context);

    if (!requireLogin(context, WS_EVENTS.ROOM_UPDATE_EVENT)) {
      console.log(`[${logName}] requireLogin failed`);
      logEnd(logName);
      return;
    }

    const actorId = context.client!.userId!;
    const actorUsername = text(context.client?.username);

    const roomId = text(context.message.roomId || context.message.room_id);

    const targetUserId = text(
      context.message.targetUserId || context.message.target_user_id
    );

    const targetUsername = text(
      context.message.targetUsername || context.message.target_username
    );

    const newRole = text(
      context.message.newRole || context.message.new_role
    ) as any;

    if (!roomId) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_UPDATE_EVENT,
        "room_id_required",
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    if (!targetUserId) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_UPDATE_EVENT,
        "target_user_id_required",
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    const result = await setRoomRoleService({
      actorId,
      actorUsername,

      targetUserId,
      targetUsername,

      roomId,
      newRole,
    });

    console.log(`[${logName}] service result:`, result);

    if (!result.ok) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_UPDATE_EVENT,
        result.reason,
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    /*
      تحديث الرتبة داخل اللايف memory
      حتى تظهر النجمة فورًا بدون خروج ودخول.
    */
    updateRoomUserRole({
      roomId,
      userId: targetUserId,
      role: result.newRole,
    });

    const targetLiveUser = getRoomLiveUser(roomId, targetUserId);

    const finalTargetUsername =
      targetUsername || text((targetLiveUser as any)?.username) || targetUserId;

    const activeUsers = getActiveUsers(roomId);
    const activeCount = activeUsers.length;

    /*
      هذا ACK للمرسل فقط.
      لا تستخدمه في الفرونت كرسالة شات.
      يستخدم لتحديث الحالة فقط لو احتجت.
    */
    sendSuccess(context.socket, {
      handler: WS_EVENTS.ROOM_UPDATE_EVENT,
      type: "role",
      request_id: context.message.request_id,

      roomId,
      targetUserId,
      targetUsername: finalTargetUsername,
      oldRole: result.oldRole,
      newRole: result.newRole,
    });

    /*
      تحديث قائمة المستخدمين والنجمة لكل الموجودين.
    */
    broadcastToRoomUsers(roomId, {
      handler: ROOM_USERS_EVENT,
      type: "users",
      roomId,
      users: activeUsers,
      activeUsers,
      activeCount,
    });

    /*
      الرسالة الوحيدة التي تظهر في الشات.
      تصل للجميع بنفس الشكل مثل رسائل الدخول والخروج.
    */
    broadcastToRoomUsers(roomId, {
      handler: ROOM_MESSAGE_EVENT,
      type: "message",
      roomId,
      message: makeRoomRoleMessage({
        roomId,

        actorId,
        actorUsername,

        targetUserId,
        targetUsername: finalTargetUsername,

        oldRole: result.oldRole,
        newRole: result.newRole,
      }),
    });

    logEnd(logName);
  } catch (error) {
    console.error(`[${logName}] unexpected error:`, error);

    sendError(
      context.socket,
      WS_EVENTS.ROOM_UPDATE_EVENT,
      "room_role_set_failed",
      context.message.request_id
    );

    logEnd(logName);
  }
};

const handleRoomCreate: WsHandler = async (context) => {
  const logName = "ROOM_CREATE_HANDLER";

  try {
    logStart(logName, context);

    if (!requireLogin(context, WS_EVENTS.ROOM_CREATE_EVENT)) {
      console.log(`[${logName}] requireLogin failed`);
      logEnd(logName);
      return;
    }

    const creatorId = context.client!.userId!;
    const name = text(context.message.name);
    const description = text(context.message.description);
    const password = text(context.message.password);
    const voiceEnabled = boolValue(context.message.voiceEnabled);

    const result = await createRoomService({
      creatorId,
      name,
      password,
      description,
      voiceEnabled,
    });

    console.log(`[${logName}] service result:`, result);

    if (!result.ok) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_CREATE_EVENT,
        result.reason,
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    sendSuccess(context.socket, {
      handler: WS_EVENTS.ROOM_CREATE_EVENT,
      type: "success",
      request_id: context.message.request_id,
      room: result.room,
    });

    logEnd(logName);
  } catch (error) {
    console.error(`[${logName}] unexpected error:`, error);

    sendError(
      context.socket,
      WS_EVENTS.ROOM_CREATE_EVENT,
      "room_create_failed",
      context.message.request_id
    );

    logEnd(logName);
  }
};

const handleRoomJoin: WsHandler = async (context) => {
  const logName = "ROOM_JOIN_HANDLER";

  try {
    logStart(logName, context);

    if (!requireLogin(context, WS_EVENTS.ROOM_JOIN_EVENT)) {
      console.log(`[${logName}] requireLogin failed`);
      logEnd(logName);
      return;
    }

    const userId = context.client!.userId!;
    const username = text(context.client?.username);
    const photoUrl = text((context.client as any)?.photoUrl);
    const roomId = text(context.message.roomId || context.message.room_id);
    const password = text(context.message.password);
    const ip = getClientIp(context);
    const socketId = text(context.client?.connectionId);

    if (!roomId) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_JOIN_EVENT,
        "room_id_required",
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    if (!socketId) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_JOIN_EVENT,
        "socket_id_missing",
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    const usersBeforeJoin = getRoomUsers(roomId);
    const wasAlreadyInRoom = usersBeforeJoin.some(
      (user: any) => text(user.userId) === userId
    );

    const result = await joinRoomService({
      userId,
      username,
      photoUrl,
      roomId,
      password,
      ip,
      socketId,
    });

    console.log(`[${logName}] service result:`, result);

if (!result.ok) {
  const reason = text(result.reason);

  const errorMessage =
    reason === "room_banned" ||
    reason === "ROOM_BANNED" ||
    reason === "banned" ||
    reason === "BANNED"
      ? "أنت محظور من هذه الغرفة"
      : result.reason;

  sendError(
    context.socket,
    WS_EVENTS.ROOM_JOIN_EVENT,
    errorMessage,
    context.message.request_id
  );

  logEnd(logName);
  return;
}

    const activeUsers = getActiveUsers(roomId);
    const activeCount = activeUsers.length;
    const currentLiveUser = getRoomLiveUser(roomId, userId);

    const currentUser = currentLiveUser
      ? normalizeActiveUser(currentLiveUser)
      : {
          userId,
          username,
          photoUrl,
          socketId,
          joinedAt: "",
          dc: false,
          role: result.role || "none",
          accountColor: "",
          badgeKey: "",
          badgeName: "",
          badgeValue: "",
          verificationType: "none",
        };

    sendSuccess(context.socket, {
      handler: WS_EVENTS.ROOM_JOIN_EVENT,
      type: "success",
      request_id: context.message.request_id,
      room: result.room,
      role: result.role,
      activeCount,
      activeUsers,
      pinnedMessage: (result as any).pinnedMessage,

      currentUserId: userId,
      currentUsername: currentUser.username,
    });

    broadcastToRoomUsers(roomId, {
      handler: ROOM_ACTIVE_COUNT_EVENT,
      type: "active_count",
      roomId,
      activeCount,
      activeUsers,
      users: activeUsers,
    });

    broadcastToRoomUsers(roomId, {
      handler: ROOM_USERS_EVENT,
      type: "users",
      roomId,
      users: activeUsers,
      activeUsers,
      activeCount,
    });

    if (!wasAlreadyInRoom) {
      broadcastToRoomUsers(roomId, {
        handler: ROOM_MESSAGE_EVENT,
        type: "message",
        roomId,
        message: makeRoomEventMessage({
          roomId,
          userId,
          username: currentUser.username,
          photoUrl: currentUser.photoUrl,
          role: result.role,

          accountColor: currentUser.accountColor,
          badgeKey: currentUser.badgeKey,
          badgeName: currentUser.badgeName,
          badgeValue: currentUser.badgeValue,
          verificationType: currentUser.verificationType,

          type: "join",
        }),
      });
    } else {
      console.log(`[${logName}] skip duplicate join message`);
    }

    logEnd(logName);
  } catch (error) {
    console.error(`[${logName}] unexpected error:`, error);

    sendError(
      context.socket,
      WS_EVENTS.ROOM_JOIN_EVENT,
      "room_join_failed",
      context.message.request_id
    );

    logEnd(logName);
  }
};

const handleRoomLeave: WsHandler = async (context) => {
  const logName = "ROOM_LEAVE_HANDLER";

  try {
    logStart(logName, context);

    if (!requireLogin(context, WS_EVENTS.ROOM_LEAVE_EVENT)) {
      console.log(`[${logName}] requireLogin failed`);
      logEnd(logName);
      return;
    }

    const userId = context.client!.userId!;
    const username = text(context.client?.username);
    const photoUrl = text((context.client as any)?.photoUrl);
    const roomId = text(context.message.roomId || context.message.room_id);

    if (!roomId) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_LEAVE_EVENT,
        "room_id_required",
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    const usersBeforeLeave = getRoomUsers(roomId);
    const liveUserBeforeLeave = getRoomLiveUser(roomId, userId);
    const wasInRoom = usersBeforeLeave.some(
      (user: any) => text(user.userId) === userId
    );

    const userBeforeLeave = liveUserBeforeLeave
      ? normalizeActiveUser(liveUserBeforeLeave)
      : {
          userId,
          username,
          photoUrl,
          socketId: "",
          joinedAt: "",
          dc: false,
          role: "none",
          accountColor: "",
          badgeKey: "",
          badgeName: "",
          badgeValue: "",
          verificationType: "none",
        };

    const result = await leaveRoomService({
      userId,
      roomId,
    });

    console.log(`[${logName}] service result:`, result);

    if (!result.ok) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_LEAVE_EVENT,
        result.reason,
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    const activeUsers = getActiveUsers(roomId);
    const activeCount = activeUsers.length;

    sendSuccess(context.socket, {
      handler: WS_EVENTS.ROOM_LEAVE_EVENT,
      type: "success",
      request_id: context.message.request_id,
      room: result.room,
      roomId,
      activeCount,
      activeUsers,
      currentUserId: userId,
      currentUsername: userBeforeLeave.username,
    });

    broadcastToRoomUsers(roomId, {
      handler: ROOM_ACTIVE_COUNT_EVENT,
      type: "active_count",
      roomId,
      activeCount,
      activeUsers,
      users: activeUsers,
    });

    broadcastToRoomUsers(roomId, {
      handler: ROOM_USERS_EVENT,
      type: "users",
      roomId,
      users: activeUsers,
      activeUsers,
      activeCount,
    });

    if (wasInRoom) {
      broadcastToRoomUsers(roomId, {
        handler: ROOM_MESSAGE_EVENT,
        type: "message",
        roomId,
        message: makeRoomEventMessage({
          roomId,
          userId,
          username: userBeforeLeave.username,
          photoUrl: userBeforeLeave.photoUrl,
          role: userBeforeLeave.role,

          accountColor: userBeforeLeave.accountColor,
          badgeKey: userBeforeLeave.badgeKey,
          badgeName: userBeforeLeave.badgeName,
          badgeValue: userBeforeLeave.badgeValue,
          verificationType: userBeforeLeave.verificationType,

          type: "leave",
        }),
      });
    }

    logEnd(logName);
  } catch (error) {
    console.error(`[${logName}] unexpected error:`, error);

    sendError(
      context.socket,
      WS_EVENTS.ROOM_LEAVE_EVENT,
      "room_leave_failed",
      context.message.request_id
    );

    logEnd(logName);
  }
};

const handleRoomList: WsHandler = async (context) => {
  const logName = "ROOM_LIST_HANDLER";

  try {
    logStart(logName, context);

    if (!requireLogin(context, WS_EVENTS.ROOM_LIST_EVENT)) {
      console.log(`[${logName}] requireLogin failed`);
      logEnd(logName);
      return;
    }

    const userId = context.client!.userId!;
    const tab = text(context.message.tab || "public") as any;

    const rooms = await listRoomsService({
      userId,
      tab,
    });

    sendSuccess(context.socket, {
      handler: WS_EVENTS.ROOM_LIST_EVENT,
      type: "success",
      request_id: context.message.request_id,
      tab,
      rooms,
    });

    logEnd(logName);
  } catch (error) {
    console.error(`[${logName}] unexpected error:`, error);

    sendError(
      context.socket,
      WS_EVENTS.ROOM_LIST_EVENT,
      "room_list_failed",
      context.message.request_id
    );

    logEnd(logName);
  }
};

const handleRoomMessageSend: WsHandler = async (context) => {
  const logName = "ROOM_MESSAGE_SEND_HANDLER";

  try {
    logStart(logName, context);

    if (!requireLogin(context, WS_EVENTS.ROOM_MESSAGE_SEND_EVENT)) {
      console.log(`[${logName}] requireLogin failed`);
      logEnd(logName);
      return;
    }

    const userId = context.client!.userId!;
    const username = text(context.client?.username);
    const photoUrl = text((context.client as any)?.photoUrl);
    const roomId = text(context.message.roomId || context.message.room_id);
    const type = text(context.message.type || "text") as any;
    const messageText = text(context.message.text);

    if (!roomId) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_MESSAGE_SEND_EVENT,
        "room_id_required",
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    if (type === "text" && !messageText) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_MESSAGE_SEND_EVENT,
        "message_text_required",
        context.message.request_id
      );

      logEnd(logName);
      return;
    }
const userStillInRoom = isUserInRoom({
  roomId,
  userId,
});

if (!userStillInRoom) {
  sendError(
    context.socket,
    WS_EVENTS.ROOM_MESSAGE_SEND_EVENT,
    "room_not_joined",
    context.message.request_id
  );

  logEnd(logName);
  return;
}
    const result = await sendRoomLiveMessageService({
      userId,
      username,
      photoUrl,
      roomId,
      type,
      text: context.message.text,
      media: context.message.media,
      replyTo: context.message.replyTo || context.message.reply_to,
    });

    console.log(`[${logName}] service result:`, result);

    if (!result.ok) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_MESSAGE_SEND_EVENT,
        result.reason,
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    const rawMessage = getResultMessage(result);

    if (!rawMessage) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_MESSAGE_SEND_EVENT,
        "message_result_missing",
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    const message = enrichLiveMessage(roomId, rawMessage);

    sendSuccess(context.socket, {
      handler: WS_EVENTS.ROOM_MESSAGE_SEND_EVENT,
      type: "success",
      request_id: context.message.request_id,
      message,
    });

    broadcastToRoomUsers(roomId, {
      handler: ROOM_MESSAGE_EVENT,
      type: "message",
      roomId,
      message,
    });

    logEnd(logName);
  } catch (error) {
    console.error(`[${logName}] unexpected error:`, error);

    sendError(
      context.socket,
      WS_EVENTS.ROOM_MESSAGE_SEND_EVENT,
      "room_message_send_failed",
      context.message.request_id
    );

    logEnd(logName);
  }
};

const handleRoomFavoriteToggle: WsHandler = async (context) => {
  const logName = "ROOM_FAVORITE_TOGGLE_HANDLER";

  try {
    logStart(logName, context);

    if (!requireLogin(context, WS_EVENTS.ROOM_UPDATE_EVENT)) {
      console.log(`[${logName}] requireLogin failed`);
      logEnd(logName);
      return;
    }

    const userId = context.client!.userId!;
    const roomId = text(context.message.roomId || context.message.room_id);

    const result = await toggleFavoriteRoomService({
      userId,
      roomId,
    });

    if (!result.ok) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_UPDATE_EVENT,
        result.reason,
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    sendSuccess(context.socket, {
      handler: WS_EVENTS.ROOM_UPDATE_EVENT,
      type: "favorite",
      request_id: context.message.request_id,
      roomId,
      isFavorite: result.isFavorite,
      favoriteCount: result.favoriteCount,
    });

    logEnd(logName);
  } catch (error) {
    console.error(`[${logName}] unexpected error:`, error);

    sendError(
      context.socket,
      WS_EVENTS.ROOM_UPDATE_EVENT,
      "room_favorite_failed",
      context.message.request_id
    );

    logEnd(logName);
  }
};

const handleRoomBoost: WsHandler = async (context) => {
  const logName = "ROOM_BOOST_HANDLER";

  try {
    logStart(logName, context);

    if (!requireLogin(context, WS_EVENTS.ROOM_UPDATE_EVENT)) {
      console.log(`[${logName}] requireLogin failed`);
      logEnd(logName);
      return;
    }

    const userId = context.client!.userId!;
    const roomId = text(context.message.roomId || context.message.room_id);
    const value = Number(context.message.value || 1);

    const result = await boostRoomService({
      userId,
      roomId,
      value,
    });

    if (!result.ok) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_UPDATE_EVENT,
        result.reason,
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    sendSuccess(context.socket, {
      handler: WS_EVENTS.ROOM_UPDATE_EVENT,
      type: "boost",
      request_id: context.message.request_id,
      roomId,
      boost: result.boost,
    });

    logEnd(logName);
  } catch (error) {
    console.error(`[${logName}] unexpected error:`, error);

    sendError(
      context.socket,
      WS_EVENTS.ROOM_UPDATE_EVENT,
      "room_boost_failed",
      context.message.request_id
    );

    logEnd(logName);
  }
};
const handleRoomLockSet: WsHandler = async (context) => {
  const logName = "ROOM_LOCK_SET_HANDLER";

  try {
    logStart(logName, context);

    if (!requireLogin(context, WS_EVENTS.ROOM_UPDATE_EVENT)) {
      console.log(`[${logName}] requireLogin failed`);
      logEnd(logName);
      return;
    }

    const actorId = context.client!.userId!;
    const roomId = text(context.message.roomId || context.message.room_id);
    const locked = boolValue(context.message.locked);

    if (!roomId) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_UPDATE_EVENT,
        "room_id_required",
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    const room = await RoomModel.findOne({ roomId });

    if (!room) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_UPDATE_EVENT,
        "room_not_found",
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    const actorRole =
      String(room.creatorId) === actorId
        ? "creator"
        : room.owners.includes(actorId)
        ? "owner"
        : room.admins.includes(actorId)
        ? "admin"
        : room.members.includes(actorId)
        ? "member"
        : "none";

    if (
      actorRole !== "creator" &&
      actorRole !== "owner" &&
      actorRole !== "admin"
    ) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_UPDATE_EVENT,
        "permission_denied",
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    room.isLockedForNone = locked;
    await room.save();

    const activeUsers = getActiveUsers(roomId);
    const activeCount = activeUsers.length;

    sendSuccess(context.socket, {
      handler: WS_EVENTS.ROOM_UPDATE_EVENT,
      type: "lock",
      request_id: context.message.request_id,
      roomId,
      locked,
      isLockedForNone: locked,
      activeCount,
      activeUsers,
      room: {
        roomId: room.roomId,
        isLockedForNone: room.isLockedForNone,
      },
    });

    broadcastToRoomUsers(roomId, {
      handler: WS_EVENTS.ROOM_UPDATE_EVENT,
      type: "lock",
      roomId,
      locked,
      isLockedForNone: locked,
      activeCount,
      activeUsers,
      room: {
        roomId: room.roomId,
        isLockedForNone: room.isLockedForNone,
      },
    });

    logEnd(logName);
  } catch (error) {
    console.error(`[${logName}] unexpected error:`, error);

    sendError(
      context.socket,
      WS_EVENTS.ROOM_UPDATE_EVENT,
      "room_lock_set_failed",
      context.message.request_id
    );

    logEnd(logName);
  }
};

const handleRoomPasswordSet: WsHandler = async (context) => {
  const logName = "ROOM_PASSWORD_SET_HANDLER";

  try {
    logStart(logName, context);

    if (!requireLogin(context, WS_EVENTS.ROOM_UPDATE_EVENT)) {
      console.log(`[${logName}] requireLogin failed`);
      logEnd(logName);
      return;
    }

    const actorId = context.client!.userId!;
    const roomId = text(context.message.roomId || context.message.room_id);
    const password = text(context.message.password);

    if (!roomId) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_UPDATE_EVENT,
        "room_id_required",
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    const room = await RoomModel.findOne({ roomId });

    if (!room) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_UPDATE_EVENT,
        "room_not_found",
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    const actorRole =
      String(room.creatorId) === actorId
        ? "creator"
        : room.owners.includes(actorId)
        ? "owner"
        : room.admins.includes(actorId)
        ? "admin"
        : room.members.includes(actorId)
        ? "member"
        : "none";

    if (
      actorRole !== "creator" &&
      actorRole !== "owner" &&
      actorRole !== "admin"
    ) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_UPDATE_EVENT,
        "permission_denied",
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    room.passwordHash = password;
    room.hasPassword = password.length > 0;

    await room.save();

    sendSuccess(context.socket, {
      handler: WS_EVENTS.ROOM_UPDATE_EVENT,
      type: "password",
      request_id: context.message.request_id,
      roomId,
      hasPassword: room.hasPassword,
      room: {
        roomId: room.roomId,
        hasPassword: room.hasPassword,
      },
    });

    broadcastToRoomUsers(roomId, {
      handler: WS_EVENTS.ROOM_UPDATE_EVENT,
      type: "password",
      roomId,
      hasPassword: room.hasPassword,
      room: {
        roomId: room.roomId,
        hasPassword: room.hasPassword,
      },
    });

    logEnd(logName);
  } catch (error) {
    console.error(`[${logName}] unexpected error:`, error);

    sendError(
      context.socket,
      WS_EVENTS.ROOM_UPDATE_EVENT,
      "room_password_set_failed",
      context.message.request_id
    );

    logEnd(logName);
  }
};

const handleRoomPinSet: WsHandler = async (context) => {
  const logName = "ROOM_PIN_SET_HANDLER";

  try {
    logStart(logName, context);

    if (!requireLogin(context, WS_EVENTS.ROOM_UPDATE_EVENT)) {
      console.log(`[${logName}] requireLogin failed`);
      logEnd(logName);
      return;
    }

    const actorId = context.client!.userId!;
    const roomId = text(context.message.roomId || context.message.room_id);
    const pinText = text(context.message.text);

    if (!roomId) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_UPDATE_EVENT,
        "room_id_required",
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    const room = await RoomModel.findOne({ roomId });

    if (!room) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_UPDATE_EVENT,
        "room_not_found",
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    const actorRole =
      String(room.creatorId) === actorId
        ? "creator"
        : room.owners.includes(actorId)
        ? "owner"
        : room.admins.includes(actorId)
        ? "admin"
        : room.members.includes(actorId)
        ? "member"
        : "none";

    if (
      actorRole !== "creator" &&
      actorRole !== "owner" &&
      actorRole !== "admin"
    ) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_UPDATE_EVENT,
        "permission_denied",
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    room.pinnedMessage = {
      text: pinText,
      updatedBy: actorId,
      updatedAt: new Date(),
    };

    await room.save();

    sendSuccess(context.socket, {
      handler: WS_EVENTS.ROOM_UPDATE_EVENT,
      type: "pin",
      request_id: context.message.request_id,
      roomId,
      pinnedMessage: room.pinnedMessage,
      room: {
        roomId: room.roomId,
        pinnedMessage: room.pinnedMessage,
      },
    });

    broadcastToRoomUsers(roomId, {
      handler: WS_EVENTS.ROOM_UPDATE_EVENT,
      type: "pin",
      roomId,
      pinnedMessage: room.pinnedMessage,
      room: {
        roomId: room.roomId,
        pinnedMessage: room.pinnedMessage,
      },
    });

    logEnd(logName);
  } catch (error) {
    console.error(`[${logName}] unexpected error:`, error);

    sendError(
      context.socket,
      WS_EVENTS.ROOM_UPDATE_EVENT,
      "room_pin_set_failed",
      context.message.request_id
    );

    logEnd(logName);
  }
};
const handleRoomRolesList: WsHandler = async (context) => {
  const logName = "ROOM_ROLES_LIST_HANDLER";

  try {
    logStart(logName, context);

    if (!requireLogin(context, WS_EVENTS.ROOM_UPDATE_EVENT)) {
      logEnd(logName);
      return;
    }

    const actorId = context.client!.userId!;
    const roomId = text(context.message.roomId || context.message.room_id);
    const role = text(context.message.role);

    const result = await listRoomUsersByRoleService({
      actorId,
      roomId,
      role,
    });

    if (!result.ok) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_UPDATE_EVENT,
        result.reason,
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    sendSuccess(context.socket, {
      handler: WS_EVENTS.ROOM_UPDATE_EVENT,
      type: "roles_list",
      request_id: context.message.request_id,
      roomId: result.roomId,
      role: result.role,
      users: result.users,
      count: result.count,
    });

    logEnd(logName);
  } catch (error) {
    console.error(`[${logName}] unexpected error:`, error);

    sendError(
      context.socket,
      WS_EVENTS.ROOM_UPDATE_EVENT,
      "room_roles_list_failed",
      context.message.request_id
    );

    logEnd(logName);
  }
};
const handleRoomLogsList: WsHandler = async (context) => {
  const logName = "ROOM_LOGS_LIST_HANDLER";

  try {
    logStart(logName, context);

    if (!requireLogin(context, WS_EVENTS.ROOM_UPDATE_EVENT)) {
      logEnd(logName);
      return;
    }

    const actorId = context.client!.userId!;
    const roomId = text(context.message.roomId || context.message.room_id);
    const limit = Number(context.message.limit || 50);

    const result = await listRoomLogsService({
      actorId,
      roomId,
      limit,
    });

    if (!result.ok) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_UPDATE_EVENT,
        result.reason,
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    sendSuccess(context.socket, {
      handler: WS_EVENTS.ROOM_UPDATE_EVENT,
      type: "logs",
      request_id: context.message.request_id,
      roomId: result.roomId,
      logs: result.logs,
    });

    logEnd(logName);
  } catch (error) {
    console.error(`[${logName}] unexpected error:`, error);

    sendError(
      context.socket,
      WS_EVENTS.ROOM_UPDATE_EVENT,
      "room_logs_list_failed",
      context.message.request_id
    );

    logEnd(logName);
  }
};
const handleRoomBannedList: WsHandler = async (context) => {
  const logName = "ROOM_BANNED_LIST_HANDLER";

  try {
    logStart(logName, context);

    if (!requireLogin(context, WS_EVENTS.ROOM_UPDATE_EVENT)) {
      logEnd(logName);
      return;
    }

    const actorId = context.client!.userId!;
    const roomId = text(context.message.roomId || context.message.room_id);

    const result = await listRoomBannedService({
      actorId,
      roomId,
    });

    if (!result.ok) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_UPDATE_EVENT,
        result.reason,
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    sendSuccess(context.socket, {
      handler: WS_EVENTS.ROOM_UPDATE_EVENT,
      type: "banned_list",
      request_id: context.message.request_id,
      roomId: result.roomId,
      bannedUsers: result.bannedUsers,
      bannedIps: result.bannedIps,
    });

    logEnd(logName);
  } catch (error) {
    console.error(`[${logName}] unexpected error:`, error);

    sendError(
      context.socket,
      WS_EVENTS.ROOM_UPDATE_EVENT,
      "room_banned_list_failed",
      context.message.request_id
    );

    logEnd(logName);
  }
};
const handleRoomRoleRemove: WsHandler = async (context) => {
  const logName = "ROOM_ROLE_REMOVE_HANDLER";

  try {
    logStart(logName, context);

    if (!requireLogin(context, WS_EVENTS.ROOM_UPDATE_EVENT)) {
      logEnd(logName);
      return;
    }

    const actorId = context.client!.userId!;
    const actorUsername = text(context.client?.username);

    const roomId = text(context.message.roomId || context.message.room_id);

    const targetUserId = text(
      context.message.targetUserId || context.message.target_user_id
    );

    const targetUsername = text(
      context.message.targetUsername || context.message.target_username
    );

    if (!roomId) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_UPDATE_EVENT,
        "room_id_required",
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    if (!targetUserId) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_UPDATE_EVENT,
        "target_user_id_required",
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    const result = await setRoomRoleService({
      actorId,
      actorUsername,
      targetUserId,
      targetUsername,
      roomId,
      newRole: "none" as any,
    });

    if (!result.ok) {
      sendError(
        context.socket,
        WS_EVENTS.ROOM_UPDATE_EVENT,
        result.reason,
        context.message.request_id
      );

      logEnd(logName);
      return;
    }

    updateRoomUserRole({
      roomId,
      userId: targetUserId,
      role: "none",
    });

    const targetLiveUser = getRoomLiveUser(roomId, targetUserId);

    const finalTargetUsername =
      targetUsername || text((targetLiveUser as any)?.username) || targetUserId;

    const activeUsers = getActiveUsers(roomId);
    const activeCount = activeUsers.length;

    sendSuccess(context.socket, {
      handler: WS_EVENTS.ROOM_UPDATE_EVENT,
      type: "role_remove",
      request_id: context.message.request_id,
      roomId,
      targetUserId,
      targetUsername: finalTargetUsername,
      oldRole: result.oldRole,
      newRole: "none",
    });

    broadcastToRoomUsers(roomId, {
      handler: ROOM_USERS_EVENT,
      type: "users",
      roomId,
      users: activeUsers,
      activeUsers,
      activeCount,
    });

    broadcastToRoomUsers(roomId, {
      handler: ROOM_MESSAGE_EVENT,
      type: "message",
      roomId,
      message: makeRoomRoleMessage({
        roomId,
        actorId,
        actorUsername,
        targetUserId,
        targetUsername: finalTargetUsername,
        oldRole: result.oldRole,
        newRole: "none",
      }),
    });

    logEnd(logName);
  } catch (error) {
    console.error(`[${logName}] unexpected error:`, error);

    sendError(
      context.socket,
      WS_EVENTS.ROOM_UPDATE_EVENT,
      "room_role_remove_failed",
      context.message.request_id
    );

    logEnd(logName);
  }
};
export const roomHandlers = {
  [WS_HANDLERS.ROOM_CREATE]: handleRoomCreate,
  [WS_HANDLERS.ROOM_JOIN]: handleRoomJoin,
  [WS_HANDLERS.ROOM_LEAVE]: handleRoomLeave,
  [WS_HANDLERS.ROOM_LIST]: handleRoomList,
  [WS_HANDLERS.ROOM_MESSAGE_SEND]: handleRoomMessageSend,
  [WS_HANDLERS.ROOM_FAVORITE_TOGGLE]: handleRoomFavoriteToggle,
  [WS_HANDLERS.ROOM_BOOST]: handleRoomBoost,
  [WS_HANDLERS.ROOM_ROLE_SET]: handleRoomRoleSet,

  [WS_HANDLERS.ROOM_KICK]: handleRoomKick,
  [WS_HANDLERS.ROOM_BAN]: handleRoomBan,
    [WS_HANDLERS.ROOM_SET_PASSWORD]: handleRoomPasswordSet,
  [WS_HANDLERS.ROOM_LOCK_SET]: handleRoomLockSet,
  [WS_HANDLERS.ROOM_PIN_SET]: handleRoomPinSet,
  [WS_HANDLERS.ROOM_ROLES_LIST]: handleRoomRolesList,
[WS_HANDLERS.ROOM_ROLE_REMOVE]: handleRoomRoleRemove,
[WS_HANDLERS.ROOM_LOGS_LIST]: handleRoomLogsList,
[WS_HANDLERS.ROOM_BANNED_LIST]: handleRoomBannedList,
};