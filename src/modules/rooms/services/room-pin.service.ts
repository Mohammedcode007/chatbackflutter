import { RoomModel } from "../models/Room.model";

import { getRoomRole, canRoomAction } from "./room-role.service";

import {
  sanitizePinnedMessage,
  sanitizeRoomId,
  sanitizeUserId,
} from "../utils/room.sanitize";

export async function setRoomPinnedMessageService(input: {
  actorId: string;
  actorUsername?: string;
  roomId: string;
  text: string;
}) {
  const actorId = sanitizeUserId(input.actorId);
  const roomId = sanitizeRoomId(input.roomId);
  const text = sanitizePinnedMessage(input.text);

  if (!actorId || !roomId) {
    return {
      ok: false as const,
      reason: "invalid_pin_payload",
    };
  }

  const room = await RoomModel.findOne({ roomId });

  if (!room) {
    return {
      ok: false as const,
      reason: "room_not_found",
    };
  }

  const actorRole = getRoomRole(room, actorId);

  /*
    creator و owner فقط يغيروا الرسالة المثبتة.
  */
  if (!canRoomAction(actorRole, "set_pinned_message")) {
    return {
      ok: false as const,
      reason: "no_permission",
    };
  }

  room.pinnedMessage = {
    text,
    updatedBy: actorId,
    updatedAt: new Date(),
  };

  await room.save();

  return {
    ok: true as const,
    room,
    pinnedMessage: room.pinnedMessage,
    actorRole,
  };
}

export async function clearRoomPinnedMessageService(input: {
  actorId: string;
  actorUsername?: string;
  roomId: string;
}) {
  const actorId = sanitizeUserId(input.actorId);
  const roomId = sanitizeRoomId(input.roomId);

  if (!actorId || !roomId) {
    return {
      ok: false as const,
      reason: "invalid_pin_payload",
    };
  }

  const room = await RoomModel.findOne({ roomId });

  if (!room) {
    return {
      ok: false as const,
      reason: "room_not_found",
    };
  }

  const actorRole = getRoomRole(room, actorId);

  /*
    creator و owner فقط يحذفوا الرسالة المثبتة.
  */
  if (!canRoomAction(actorRole, "set_pinned_message")) {
    return {
      ok: false as const,
      reason: "no_permission",
    };
  }

  room.pinnedMessage = {
    text: "",
    updatedBy: actorId,
    updatedAt: new Date(),
  };

  await room.save();

  return {
    ok: true as const,
    room,
    pinnedMessage: room.pinnedMessage,
    actorRole,
  };
}

export async function getRoomPinnedMessageService(input: {
  roomId: string;
}) {
  const roomId = sanitizeRoomId(input.roomId);

  if (!roomId) {
    return {
      ok: false as const,
      reason: "invalid_room_id",
    };
  }

  const room = await RoomModel.findOne({ roomId })
    .select("roomId pinnedMessage")
    .lean();

  if (!room) {
    return {
      ok: false as const,
      reason: "room_not_found",
    };
  }

  return {
    ok: true as const,
    roomId,
    pinnedMessage: room.pinnedMessage,
  };
}