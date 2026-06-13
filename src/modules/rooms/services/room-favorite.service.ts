import { RoomModel } from "../models/Room.model";
import { RoomUserStateModel } from "../models/RoomUserState.model";
import {
  sanitizeRoomId,
  sanitizeUserId,
} from "../utils/room.sanitize";

export async function toggleFavoriteRoomService(input: {
  userId: string;
  roomId: string;
}) {
  const userId = sanitizeUserId(input.userId);
  const roomId = sanitizeRoomId(input.roomId);

  if (!userId || !roomId) {
    return {
      ok: false as const,
      reason: "invalid_favorite_payload",
    };
  }

  const room = await RoomModel.findOne({ roomId });

  if (!room) {
    return {
      ok: false as const,
      reason: "room_not_found",
    };
  }

  const state = await RoomUserStateModel.findOneAndUpdate(
    {
      userId,
      roomId,
    },
    {
      $set: {
        userId,
        roomId,
      },
      $setOnInsert: {
        isFavorite: false,
        isMuted: false,
        lastJoinedAt: null,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
    }
  );

  state.isFavorite = !state.isFavorite;

  await state.save();

  const favoriteCount = await RoomUserStateModel.countDocuments({
    roomId,
    isFavorite: true,
  });

  room.favoriteCount = favoriteCount;
  await room.save();

  return {
    ok: true as const,
    roomId,
    isFavorite: state.isFavorite,
    favoriteCount,
  };
}

export async function setFavoriteRoomService(input: {
  userId: string;
  roomId: string;
  isFavorite: boolean;
}) {
  const userId = sanitizeUserId(input.userId);
  const roomId = sanitizeRoomId(input.roomId);

  if (!userId || !roomId) {
    return {
      ok: false as const,
      reason: "invalid_favorite_payload",
    };
  }

  const room = await RoomModel.findOne({ roomId });

  if (!room) {
    return {
      ok: false as const,
      reason: "room_not_found",
    };
  }

  const state = await RoomUserStateModel.findOneAndUpdate(
    {
      userId,
      roomId,
    },
    {
      $set: {
        userId,
        roomId,
        isFavorite: input.isFavorite === true,
      },
      $setOnInsert: {
        isMuted: false,
        lastJoinedAt: null,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
    }
  );

  const favoriteCount = await RoomUserStateModel.countDocuments({
    roomId,
    isFavorite: true,
  });

  room.favoriteCount = favoriteCount;
  await room.save();

  return {
    ok: true as const,
    roomId,
    isFavorite: state.isFavorite,
    favoriteCount,
  };
}

export async function isRoomFavoriteForUserService(input: {
  userId: string;
  roomId: string;
}) {
  const userId = sanitizeUserId(input.userId);
  const roomId = sanitizeRoomId(input.roomId);

  if (!userId || !roomId) {
    return false;
  }

  const state = await RoomUserStateModel.findOne({
    userId,
    roomId,
  }).lean();

  return state?.isFavorite === true;
}

export async function listFavoriteRoomIdsService(userIdValue: string) {
  const userId = sanitizeUserId(userIdValue);

  if (!userId) return [];

  const states = await RoomUserStateModel.find({
    userId,
    isFavorite: true,
  })
    .select("roomId")
    .lean();

  return states
    .map((state) => String(state.roomId || ""))
    .filter(Boolean);
}

export async function listFavoriteRoomsService(userIdValue: string) {
  const userId = sanitizeUserId(userIdValue);

  if (!userId) return [];

  const roomIds = await listFavoriteRoomIdsService(userId);

  if (roomIds.length === 0) return [];

  return RoomModel.find({
    roomId: {
      $in: roomIds,
    },
  })
    .sort({
      updatedAt: -1,
    })
    .lean();
}

export async function setRoomMutedService(input: {
  userId: string;
  roomId: string;
  isMuted: boolean;
}) {
  const userId = sanitizeUserId(input.userId);
  const roomId = sanitizeRoomId(input.roomId);

  if (!userId || !roomId) {
    return {
      ok: false as const,
      reason: "invalid_mute_payload",
    };
  }

  const room = await RoomModel.findOne({ roomId }).lean();

  if (!room) {
    return {
      ok: false as const,
      reason: "room_not_found",
    };
  }

  const state = await RoomUserStateModel.findOneAndUpdate(
    {
      userId,
      roomId,
    },
    {
      $set: {
        userId,
        roomId,
        isMuted: input.isMuted === true,
      },
      $setOnInsert: {
        isFavorite: false,
        lastJoinedAt: null,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
    }
  );

  return {
    ok: true as const,
    roomId,
    isMuted: state.isMuted,
  };
}

export async function updateRoomLastJoinedAtService(input: {
  userId: string;
  roomId: string;
}) {
  const userId = sanitizeUserId(input.userId);
  const roomId = sanitizeRoomId(input.roomId);

  console.log("[updateRoomLastJoinedAtService] input:", {
    rawUserId: input.userId,
    rawRoomId: input.roomId,
    userId,
    roomId,
  });

  if (!userId || !roomId) {
    console.log("[updateRoomLastJoinedAtService] failed: invalid payload");

    return {
      ok: false as const,
      reason: "invalid_join_state_payload",
    };
  }

  const state = await RoomUserStateModel.findOneAndUpdate(
    {
      userId,
      roomId,
    },
    {
      $set: {
        userId,
        roomId,
        lastJoinedAt: new Date(),
      },
      $setOnInsert: {
        isFavorite: false,
        isMuted: false,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
    }
  );

  console.log("[updateRoomLastJoinedAtService] updated:", {
    _id: state?._id,
    userId: state?.userId,
    roomId: state?.roomId,
    isFavorite: state?.isFavorite,
    isMuted: state?.isMuted,
    lastJoinedAt: state?.lastJoinedAt,
  });

  return {
    ok: true as const,
    roomId,
    state,
  };
}