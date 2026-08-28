import bcrypt from "bcryptjs";

import { RoomModel } from "../models/Room.model";
import { makeRoomId } from "../utils/room.ids";
import {
  sanitizeRoomName,
  sanitizeRoomDescription,
  sanitizeRoomPassword,
  isValidRoomPassword,
  sanitizeUserId,
} from "../utils/room.sanitize";

const MAX_ROOM_USERS = 50;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function createRoomService(input: {
  creatorId: string;
  name: string;
  description?: string;
  password?: string;
  voiceEnabled?: boolean;
  roomImage?: string;
  countryCode?: string;
}) {
  console.log("\n===== CREATE_ROOM_SERVICE_START =====");
  console.log("[createRoomService] raw input:", input);

  try {
    const creatorId = sanitizeUserId(input.creatorId);
    const name = sanitizeRoomName(input.name);
    const description = sanitizeRoomDescription(input.description);
    const password = sanitizeRoomPassword(input.password);
    const voiceEnabled = input.voiceEnabled === true;
    const roomImage = String(input.roomImage || "").trim();
    const countryCode = String(input.countryCode || "").trim();

    console.log("[createRoomService] sanitized values:", {
      creatorId,
      name,
      description,
      hasPassword: password.length > 0,
      passwordLength: password.length,
      voiceEnabled,
      hasRoomImage: roomImage.length > 0,
      countryCode,
    });

    if (!creatorId) {
      console.log("[createRoomService] failed: not_logged_in");
      console.log("===== CREATE_ROOM_SERVICE_END =====\n");

      return {
        ok: false as const,
        reason: "not_logged_in",
      };
    }

    if (!name) {
      console.log("[createRoomService] failed: room_name_required");
      console.log("===== CREATE_ROOM_SERVICE_END =====\n");

      return {
        ok: false as const,
        reason: "room_name_required",
      };
    }

    if (name.length > 50) {
      console.log("[createRoomService] failed: room_name_too_long", {
        nameLength: name.length,
      });
      console.log("===== CREATE_ROOM_SERVICE_END =====\n");

      return {
        ok: false as const,
        reason: "room_name_too_long",
      };
    }

    if (!isValidRoomPassword(password)) {
      console.log("[createRoomService] failed: invalid_room_password", {
        passwordLength: password.length,
      });
      console.log("===== CREATE_ROOM_SERVICE_END =====\n");

      return {
        ok: false as const,
        reason: "invalid_room_password",
      };
    }

    console.log("[createRoomService] checking duplicate room name...");

    const existingRoom = await RoomModel.findOne({
      name: {
        $regex: `^${escapeRegExp(name)}$`,
        $options: "i",
      },
    })
      .select("roomId name creatorId")
      .lean();

    if (existingRoom) {
      console.log("[createRoomService] failed: duplicate room name", {
        requestedName: name,
        existingRoomId: existingRoom.roomId,
        existingName: existingRoom.name,
        existingCreatorId: existingRoom.creatorId,
      });
      console.log("===== CREATE_ROOM_SERVICE_END =====\n");

      return {
        ok: false as const,
        reason: "room_name_already_exists",
      };
    }

    console.log("[createRoomService] password validation passed");

    const passwordHash = password ? await bcrypt.hash(password, 10) : "";

    console.log("[createRoomService] password hash created:", {
      hasPasswordHash: passwordHash.length > 0,
    });

    const roomId = makeRoomId();

    console.log("[createRoomService] generated roomId:", roomId);

    const payload = {
      roomId,

      name,
      description,

      creatorId,

      owners: [],
      admins: [],
      members: [creatorId],

      roleLogs: [],

      bannedUsers: [],
      bannedIps: [],

      passwordHash,
      hasPassword: Boolean(passwordHash),

      isLockedForNone: false,

      maxUsers: MAX_ROOM_USERS,

      activeUsers: [],

      favoriteCount: 0,

      pinnedMessage: {
        text: "",
        updatedBy: "",
        updatedAt: null,
      },

      voiceEnabled,

      roomImage,
      country: countryCode,
    };

    console.log("[createRoomService] creating room with payload:", {
      ...payload,
      passwordHash: passwordHash ? "[HASHED]" : "",
    });

    const room = await RoomModel.create(payload);

    console.log("[createRoomService] room saved successfully:", {
      _id: room._id,
      roomId: room.roomId,
      name: room.name,
      creatorId: room.creatorId,
      members: room.members,
      voiceEnabled: room.voiceEnabled,
      hasPassword: room.hasPassword,
      createdAt: room.createdAt,
    });

    console.log("===== CREATE_ROOM_SERVICE_END =====\n");

    return {
      ok: true as const,
      room,
    };
  } catch (error: any) {
    console.error("[createRoomService] unexpected error:", {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });

    console.log("===== CREATE_ROOM_SERVICE_END =====\n");

    return {
      ok: false as const,
      reason: "room_create_failed",
    };
  }
}