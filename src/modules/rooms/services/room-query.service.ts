import { RoomModel } from "../models/Room.model";
import { RoomBoostModel } from "../models/RoomBoost.model";
import { RoomUserStateModel } from "../models/RoomUserState.model";

import {
  getRoomActiveCount,
  getRoomUsers,
  getUserRooms,
} from "../../../websocket/stores/roomClients.store";

import { getRoomRole } from "./room-role.service";

import {
  sanitizeRoomId,
  sanitizeRoomListType,
  sanitizeUserId,
  cleanText,
} from "../utils/room.sanitize";

import type { RoomListType } from "../types/room.types";

/*
  هذا الملف لا يجلب رسائل قديمة.
  هو يجلب قائمة الغرف فقط:
  - public
  - active
  - favorite
  - voice
*/

function roomToClient(room: any, userId: string, extra?: any) {
  const roomId = String(room.roomId || "");

  return {
    roomId,

    name: String(room.name || ""),
    description: String(room.description || ""),

    creatorId: String(room.creatorId || ""),

    role: getRoomRole(room, userId),

    owners: Array.isArray(room.owners) ? room.owners : [],
    admins: Array.isArray(room.admins) ? room.admins : [],
    members: Array.isArray(room.members) ? room.members : [],

    hasPassword: room.hasPassword === true,
    isLockedForNone: room.isLockedForNone === true,

    maxUsers: Number(room.maxUsers || 50),

    /*
      activeCount من الذاكرة live فقط.
      الغرفة ممكن تكون موجودة ولكن activeCount = 0.
    */
    activeCount: getRoomActiveCount(roomId),

    favoriteCount: Number(room.favoriteCount || 0),

    pinnedMessage: room.pinnedMessage || {
      text: "",
      updatedBy: "",
      updatedAt: null,
    },

    voiceEnabled: room.voiceEnabled === true,

    room_image: String(room.roomImage || room.room_image || ""),
    country: String(room.country || ""),

    boostScore: Number(extra?.boostScore || 0),
    boostCount: Number(extra?.boostCount || 0),

    isFavorite: extra?.isFavorite === true,

    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}

/*
  مهم:
  هذه الدالة الآن ترجع Array مباشرة.
  لأنها مستخدمة في room.handlers.ts هكذا:
  const rooms = await listRoomsService(...)
*/
export async function listRoomsService(input: {
  userId: string;
  tab: RoomListType | string;
}) {
  const userId = sanitizeUserId(input.userId);
  const tab = sanitizeRoomListType(input.tab);

  console.log("===== listRoomsService START =====");
  console.log("[listRoomsService] input:", {
    rawUserId: input.userId,
    userId,
    rawTab: input.tab,
    tab,
  });

  if (!userId) {
    console.log("[listRoomsService] failed: not_logged_in");
    console.log("===== listRoomsService END =====");
    return [];
  }

  if (tab === "active") {
    const result = await listActiveRoomsService(userId);
    console.log("[listRoomsService] active result count:", result.rooms.length);
    console.log("===== listRoomsService END =====");
    return result.rooms;
  }

  if (tab === "favorite") {
    const result = await listFavoriteRoomsForQueryService(userId);
    console.log("[listRoomsService] favorite result count:", result.rooms.length);
    console.log("===== listRoomsService END =====");
    return result.rooms;
  }

  if (tab === "voice") {
    const result = await listVoiceRoomsService(userId);
    console.log("[listRoomsService] voice result count:", result.rooms.length);
    console.log("===== listRoomsService END =====");
    return result.rooms;
  }

  const result = await listPublicRoomsService(userId);

  console.log("[listRoomsService] public result count:", result.rooms.length);
  console.log(
    "[listRoomsService] public rooms:",
    result.rooms.map((room: any) => ({
      roomId: room.roomId,
      name: room.name,
      activeCount: room.activeCount,
      boostScore: room.boostScore,
      role: room.role,
    }))
  );

  console.log("===== listRoomsService END =====");

  return result.rooms;
}

/*
  active:
  الغرف التي المستخدم موجود فيها الآن live.
*/
export async function listActiveRoomsService(userIdValue: string) {
  const userId = sanitizeUserId(userIdValue);

  if (!userId) {
    return {
      ok: false as const,
      reason: "not_logged_in",
      tab: "active" as const,
      rooms: [],
    };
  }

  const roomIds = getUserRooms(userId);

  console.log("[listActiveRoomsService] roomIds:", roomIds);

  if (roomIds.length === 0) {
    return {
      ok: true as const,
      tab: "active" as const,
      rooms: [],
    };
  }

  const rooms = await RoomModel.find({
    roomId: {
      $in: roomIds,
    },
  })
    .sort({
      updatedAt: -1,
    })
    .lean();

  return {
    ok: true as const,
    tab: "active" as const,
    rooms: rooms.map((room) => roomToClient(room, userId)),
  };
}

/*
  favorite:
  الغرف التي المستخدم أضافها للمفضلة.
*/
export async function listFavoriteRoomsForQueryService(userIdValue: string) {
  const userId = sanitizeUserId(userIdValue);

  if (!userId) {
    return {
      ok: false as const,
      reason: "not_logged_in",
      tab: "favorite" as const,
      rooms: [],
    };
  }

  const states = await RoomUserStateModel.find({
    userId,
    isFavorite: true,
  })
    .select("roomId")
    .lean();

  const roomIds = states
    .map((state) => String(state.roomId || ""))
    .filter(Boolean);

  console.log("[listFavoriteRoomsForQueryService] roomIds:", roomIds);

  if (roomIds.length === 0) {
    return {
      ok: true as const,
      tab: "favorite" as const,
      rooms: [],
    };
  }

  const rooms = await RoomModel.find({
    roomId: {
      $in: roomIds,
    },
  })
    .sort({
      updatedAt: -1,
    })
    .lean();

  return {
    ok: true as const,
    tab: "favorite" as const,
    rooms: rooms.map((room) =>
      roomToClient(room, userId, {
        isFavorite: true,
      })
    ),
  };
}

/*
  voice:
  غرف الصوت فقط.
*/
export async function listVoiceRoomsService(userIdValue: string) {
  const userId = sanitizeUserId(userIdValue);

  if (!userId) {
    return {
      ok: false as const,
      reason: "not_logged_in",
      tab: "voice" as const,
      rooms: [],
    };
  }

  const rooms = await RoomModel.find({
    voiceEnabled: true,
  })
    .sort({
      updatedAt: -1,
    })
    .limit(100)
    .lean();

  console.log("[listVoiceRoomsService] found:", rooms.length);

  const favoriteRoomIds = await getFavoriteRoomIdSet(userId);
  const boostMap = await getRoomBoostStatsMap(
    rooms.map((room: any) => String(room.roomId || ""))
  );

  return {
    ok: true as const,
    tab: "voice" as const,
    rooms: rooms.map((room) => {
      const roomId = String(room.roomId || "");
      const boostStats = boostMap.get(roomId) || {
        boostScore: 0,
        boostCount: 0,
      };

      return roomToClient(room, userId, {
        isFavorite: favoriteRoomIds.has(roomId),
        boostScore: boostStats.boostScore,
        boostCount: boostStats.boostCount,
      });
    }),
  };
}

/*
  public:
  كل الغرف تظهر.
  الغرف boosted تظهر فوق.
  باقي الغرف تظهر بعدها حتى لو activeCount = 0.
*/
export async function listPublicRoomsService(userIdValue: string) {
  const userId = sanitizeUserId(userIdValue);

  if (!userId) {
    return {
      ok: false as const,
      reason: "not_logged_in",
      tab: "public" as const,
      rooms: [],
    };
  }

  const now = new Date();

  const boosted = await RoomBoostModel.aggregate([
    {
      $match: {
        expiresAt: {
          $gt: now,
        },
      },
    },
    {
      $group: {
        _id: "$roomId",
        boostScore: {
          $sum: "$value",
        },
        boostCount: {
          $sum: 1,
        },
      },
    },
    {
      $sort: {
        boostScore: -1,
        boostCount: -1,
      },
    },
  ]);

  const boostedRoomIds = boosted.map((item) => String(item._id || ""));

  console.log("[listPublicRoomsService] boostedRoomIds:", boostedRoomIds);

  const boostedRooms = boostedRoomIds.length
    ? await RoomModel.find({
        roomId: {
          $in: boostedRoomIds,
        },
      }).lean()
    : [];

  const roomMap = new Map(
    boostedRooms.map((room: any) => [String(room.roomId || ""), room])
  );

  const favoriteRoomIds = await getFavoriteRoomIdSet(userId);

  const sortedBoostedRooms = boosted
    .map((item) => {
      const roomId = String(item._id || "");
      const room = roomMap.get(roomId);

      if (!room) return null;

      return roomToClient(room, userId, {
        boostScore: Number(item.boostScore || 0),
        boostCount: Number(item.boostCount || 0),
        isFavorite: favoriteRoomIds.has(roomId),
      });
    })
    .filter(Boolean);

  /*
    باقي الغرف التي ليس عليها boost تظهر بعد الغرف boosted.
    مهم: لا نعمل فلتر على members ولا activeUsers.
  */
  const otherRooms = await RoomModel.find({
    roomId: {
      $nin: boostedRoomIds,
    },
  })
    .sort({
      createdAt: -1,
    })
    .limit(100)
    .lean();

  console.log("[listPublicRoomsService] otherRooms found:", otherRooms.length);

  const otherRoomsClient = otherRooms.map((room) => {
    const roomId = String(room.roomId || "");

    return roomToClient(room, userId, {
      boostScore: 0,
      boostCount: 0,
      isFavorite: favoriteRoomIds.has(roomId),
    });
  });

  return {
    ok: true as const,
    tab: "public" as const,
    rooms: [...sortedBoostedRooms, ...otherRoomsClient],
  };
}

/*
  البحث عن غرف بالاسم.
*/
export async function searchRoomsService(input: {
  userId: string;
  query: string;
}) {
  const userId = sanitizeUserId(input.userId);
  const query = cleanText(input.query).slice(0, 50);

  if (!userId) {
    return {
      ok: false as const,
      reason: "not_logged_in",
      rooms: [],
    };
  }

  if (!query) {
    return {
      ok: true as const,
      rooms: [],
    };
  }

  const rooms = await RoomModel.find({
    name: {
      $regex: query,
      $options: "i",
    },
  })
    .limit(30)
    .sort({
      updatedAt: -1,
    })
    .lean();

  const favoriteRoomIds = await getFavoriteRoomIdSet(userId);
  const boostMap = await getRoomBoostStatsMap(
    rooms.map((room: any) => String(room.roomId || ""))
  );

  return {
    ok: true as const,
    rooms: rooms.map((room) => {
      const roomId = String(room.roomId || "");
      const boostStats = boostMap.get(roomId) || {
        boostScore: 0,
        boostCount: 0,
      };

      return roomToClient(room, userId, {
        isFavorite: favoriteRoomIds.has(roomId),
        boostScore: boostStats.boostScore,
        boostCount: boostStats.boostCount,
      });
    }),
  };
}

/*
  تفاصيل غرفة واحدة.
  لا يرجع رسائل قديمة.
*/
export async function getRoomDetailsService(input: {
  userId: string;
  roomId: string;
}) {
  const userId = sanitizeUserId(input.userId);
  const roomId = sanitizeRoomId(input.roomId);

  if (!userId || !roomId) {
    return {
      ok: false as const,
      reason: "invalid_room_details_payload",
    };
  }

  const room = await RoomModel.findOne({
    roomId,
  }).lean();

  if (!room) {
    return {
      ok: false as const,
      reason: "room_not_found",
    };
  }

  const state = await RoomUserStateModel.findOne({
    userId,
    roomId,
  }).lean();

  const boostStats = await getRoomBoostStatsForQuery(roomId);

  return {
    ok: true as const,
    room: roomToClient(room, userId, {
      isFavorite: state?.isFavorite === true,
      boostScore: boostStats.boostScore,
      boostCount: boostStats.boostCount,
    }),

    activeUsers: getRoomUsers(roomId),

    pinnedMessage: room.pinnedMessage || {
      text: "",
      updatedBy: "",
      updatedAt: null,
    },
  };
}

async function getFavoriteRoomIdSet(userId: string) {
  const states = await RoomUserStateModel.find({
    userId,
    isFavorite: true,
  })
    .select("roomId")
    .lean();

  return new Set(states.map((state) => String(state.roomId || "")));
}

async function getRoomBoostStatsForQuery(roomId: string) {
  const now = new Date();

  const result = await RoomBoostModel.aggregate([
    {
      $match: {
        roomId,
        expiresAt: {
          $gt: now,
        },
      },
    },
    {
      $group: {
        _id: "$roomId",
        boostScore: {
          $sum: "$value",
        },
        boostCount: {
          $sum: 1,
        },
      },
    },
  ]);

  return {
    boostScore: Number(result[0]?.boostScore || 0),
    boostCount: Number(result[0]?.boostCount || 0),
  };
}

async function getRoomBoostStatsMap(roomIds: string[]) {
  const cleanRoomIds = roomIds.filter(Boolean);

  const map = new Map<
    string,
    {
      boostScore: number;
      boostCount: number;
    }
  >();

  if (cleanRoomIds.length === 0) {
    return map;
  }

  const now = new Date();

  const result = await RoomBoostModel.aggregate([
    {
      $match: {
        roomId: {
          $in: cleanRoomIds,
        },
        expiresAt: {
          $gt: now,
        },
      },
    },
    {
      $group: {
        _id: "$roomId",
        boostScore: {
          $sum: "$value",
        },
        boostCount: {
          $sum: 1,
        },
      },
    },
  ]);

  for (const item of result) {
    map.set(String(item._id || ""), {
      boostScore: Number(item.boostScore || 0),
      boostCount: Number(item.boostCount || 0),
    });
  }

  return map;
}