import { WsHandler } from "../../websocket/ws.types";
import { sendError, sendSuccess } from "../../websocket/ws.utils";
import { requireLogin } from "../../websocket/ws.auth";
import {
  getRoomOnlineCount,
  joinSocketRoom,
  leaveSocketRoom,
  sendToRoom,
} from "../../websocket/stores/rooms.store";
import { WS_EVENTS, WS_HANDLERS } from "../../websocket/ws.events";
import { createId } from "../../utils/id";

const handleRoomsList: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.ROOMS_LIST_EVENT)) return;

  sendSuccess(context.socket, {
    handler: WS_EVENTS.ROOMS_LIST_EVENT,
    request_id: context.message.request_id,
    rooms: [],
  });
};

const handleRoomJoin: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.ROOM_JOIN_EVENT)) return;

  const roomId = String(context.message.room_id || "").trim();

  if (!roomId) {
    sendError(
      context.socket,
      WS_EVENTS.ROOM_JOIN_EVENT,
      "missing_room_id",
      context.message.request_id
    );

    return;
  }

  joinSocketRoom(context.socket, roomId);

  sendSuccess(context.socket, {
    handler: WS_EVENTS.ROOM_JOIN_EVENT,
    request_id: context.message.request_id,
    room_id: roomId,
    online_count: getRoomOnlineCount(roomId),
  });

  sendToRoom(
    roomId,
    {
      handler: "room_user_joined",
      type: "success",
      reason: "null",
      room_id: roomId,
      user_id: context.client!.userId,
      username: context.client!.username,
      online_count: getRoomOnlineCount(roomId),
    },
    context.socket
  );
};

const handleRoomLeave: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.ROOM_LEAVE_EVENT)) return;

  const roomId = String(context.message.room_id || "").trim();

  if (!roomId) return;

  leaveSocketRoom(context.socket, roomId);

  sendSuccess(context.socket, {
    handler: WS_EVENTS.ROOM_LEAVE_EVENT,
    request_id: context.message.request_id,
    room_id: roomId,
  });

  sendToRoom(roomId, {
    handler: "room_user_left",
    type: "success",
    reason: "null",
    room_id: roomId,
    user_id: context.client!.userId,
    username: context.client!.username,
    online_count: getRoomOnlineCount(roomId),
  });
};

const handleRoomMessageSend: WsHandler = async (context) => {
  if (!requireLogin(context, WS_EVENTS.ROOM_MESSAGE_EVENT)) return;

  const roomId = String(context.message.room_id || "").trim();
  const body = String(context.message.body || "").trim();

  if (!roomId || !body) {
    sendError(
      context.socket,
      WS_EVENTS.ROOM_MESSAGE_EVENT,
      "missing_room_or_body",
      context.message.request_id
    );

    return;
  }

  const message = {
    handler: WS_EVENTS.ROOM_MESSAGE_EVENT,
    type: "success",
    reason: "null",
    message_id: createId(),
    room_id: roomId,
    user_id: context.client!.userId,
    username: context.client!.username,
    body,
    created_at: new Date().toISOString(),
  };

  sendToRoom(roomId, message);
};

export const roomsHandlers = {
  [WS_HANDLERS.ROOMS_LIST]: handleRoomsList,
  [WS_HANDLERS.ROOMS_JOIN]: handleRoomJoin,
  [WS_HANDLERS.ROOMS_LEAVE]: handleRoomLeave,
  [WS_HANDLERS.ROOMS_MESSAGE_SEND]: handleRoomMessageSend,
};