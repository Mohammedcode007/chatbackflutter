"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRoomsService = listRoomsService;
exports.listActiveRoomsService = listActiveRoomsService;
exports.listFavoriteRoomsForQueryService = listFavoriteRoomsForQueryService;
exports.listVoiceRoomsService = listVoiceRoomsService;
exports.listPublicRoomsService = listPublicRoomsService;
exports.searchRoomsService = searchRoomsService;
exports.getRoomDetailsService = getRoomDetailsService;
const Room_model_1 = require("../models/Room.model");
const RoomBoost_model_1 = require("../models/RoomBoost.model");
const RoomUserState_model_1 = require("../models/RoomUserState.model");
const roomClients_store_1 = require("../../../websocket/stores/roomClients.store");
const room_role_service_1 = require("./room-role.service");
const room_sanitize_1 = require("../utils/room.sanitize");
/*
  هذا الملف لا يجلب رسائل قديمة.
  هو يجلب قائمة الغرف فقط:
  - public
  - active
  - favorite
  - voice
*/
function roomToClient(room, userId, extra) {
    const roomId = String(room.roomId || "");
    return {
        roomId,
        name: String(room.name || ""),
        description: String(room.description || ""),
        creatorId: String(room.creatorId || ""),
        role: (0, room_role_service_1.getRoomRole)(room, userId),
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
        activeCount: (0, roomClients_store_1.getRoomActiveCount)(roomId),
        favoriteCount: Number(room.favoriteCount || 0),
        pinnedMessage: room.pinnedMessage || {
            text: "",
            updatedBy: "",
            updatedAt: null,
        },
        voiceEnabled: room.voiceEnabled === true,
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
async function listRoomsService(input) {
    const userId = (0, room_sanitize_1.sanitizeUserId)(input.userId);
    const tab = (0, room_sanitize_1.sanitizeRoomListType)(input.tab);
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
    console.log("[listRoomsService] public rooms:", result.rooms.map((room) => ({
        roomId: room.roomId,
        name: room.name,
        activeCount: room.activeCount,
        boostScore: room.boostScore,
        role: room.role,
    })));
    console.log("===== listRoomsService END =====");
    return result.rooms;
}
/*
  active:
  الغرف التي المستخدم موجود فيها الآن live.
*/
async function listActiveRoomsService(userIdValue) {
    const userId = (0, room_sanitize_1.sanitizeUserId)(userIdValue);
    if (!userId) {
        return {
            ok: false,
            reason: "not_logged_in",
            tab: "active",
            rooms: [],
        };
    }
    const roomIds = (0, roomClients_store_1.getUserRooms)(userId);
    console.log("[listActiveRoomsService] roomIds:", roomIds);
    if (roomIds.length === 0) {
        return {
            ok: true,
            tab: "active",
            rooms: [],
        };
    }
    const rooms = await Room_model_1.RoomModel.find({
        roomId: {
            $in: roomIds,
        },
    })
        .sort({
        updatedAt: -1,
    })
        .lean();
    return {
        ok: true,
        tab: "active",
        rooms: rooms.map((room) => roomToClient(room, userId)),
    };
}
/*
  favorite:
  الغرف التي المستخدم أضافها للمفضلة.
*/
async function listFavoriteRoomsForQueryService(userIdValue) {
    const userId = (0, room_sanitize_1.sanitizeUserId)(userIdValue);
    if (!userId) {
        return {
            ok: false,
            reason: "not_logged_in",
            tab: "favorite",
            rooms: [],
        };
    }
    const states = await RoomUserState_model_1.RoomUserStateModel.find({
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
            ok: true,
            tab: "favorite",
            rooms: [],
        };
    }
    const rooms = await Room_model_1.RoomModel.find({
        roomId: {
            $in: roomIds,
        },
    })
        .sort({
        updatedAt: -1,
    })
        .lean();
    return {
        ok: true,
        tab: "favorite",
        rooms: rooms.map((room) => roomToClient(room, userId, {
            isFavorite: true,
        })),
    };
}
/*
  voice:
  غرف الصوت فقط.
*/
async function listVoiceRoomsService(userIdValue) {
    const userId = (0, room_sanitize_1.sanitizeUserId)(userIdValue);
    if (!userId) {
        return {
            ok: false,
            reason: "not_logged_in",
            tab: "voice",
            rooms: [],
        };
    }
    const rooms = await Room_model_1.RoomModel.find({
        voiceEnabled: true,
    })
        .sort({
        updatedAt: -1,
    })
        .limit(100)
        .lean();
    console.log("[listVoiceRoomsService] found:", rooms.length);
    const favoriteRoomIds = await getFavoriteRoomIdSet(userId);
    const boostMap = await getRoomBoostStatsMap(rooms.map((room) => String(room.roomId || "")));
    return {
        ok: true,
        tab: "voice",
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
async function listPublicRoomsService(userIdValue) {
    const userId = (0, room_sanitize_1.sanitizeUserId)(userIdValue);
    if (!userId) {
        return {
            ok: false,
            reason: "not_logged_in",
            tab: "public",
            rooms: [],
        };
    }
    const now = new Date();
    const boosted = await RoomBoost_model_1.RoomBoostModel.aggregate([
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
        ? await Room_model_1.RoomModel.find({
            roomId: {
                $in: boostedRoomIds,
            },
        }).lean()
        : [];
    const roomMap = new Map(boostedRooms.map((room) => [String(room.roomId || ""), room]));
    const favoriteRoomIds = await getFavoriteRoomIdSet(userId);
    const sortedBoostedRooms = boosted
        .map((item) => {
        const roomId = String(item._id || "");
        const room = roomMap.get(roomId);
        if (!room)
            return null;
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
    const otherRooms = await Room_model_1.RoomModel.find({
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
        ok: true,
        tab: "public",
        rooms: [...sortedBoostedRooms, ...otherRoomsClient],
    };
}
/*
  البحث عن غرف بالاسم.
*/
async function searchRoomsService(input) {
    const userId = (0, room_sanitize_1.sanitizeUserId)(input.userId);
    const query = (0, room_sanitize_1.cleanText)(input.query).slice(0, 50);
    if (!userId) {
        return {
            ok: false,
            reason: "not_logged_in",
            rooms: [],
        };
    }
    if (!query) {
        return {
            ok: true,
            rooms: [],
        };
    }
    const rooms = await Room_model_1.RoomModel.find({
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
    const boostMap = await getRoomBoostStatsMap(rooms.map((room) => String(room.roomId || "")));
    return {
        ok: true,
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
async function getRoomDetailsService(input) {
    const userId = (0, room_sanitize_1.sanitizeUserId)(input.userId);
    const roomId = (0, room_sanitize_1.sanitizeRoomId)(input.roomId);
    if (!userId || !roomId) {
        return {
            ok: false,
            reason: "invalid_room_details_payload",
        };
    }
    const room = await Room_model_1.RoomModel.findOne({
        roomId,
    }).lean();
    if (!room) {
        return {
            ok: false,
            reason: "room_not_found",
        };
    }
    const state = await RoomUserState_model_1.RoomUserStateModel.findOne({
        userId,
        roomId,
    }).lean();
    const boostStats = await getRoomBoostStatsForQuery(roomId);
    return {
        ok: true,
        room: roomToClient(room, userId, {
            isFavorite: state?.isFavorite === true,
            boostScore: boostStats.boostScore,
            boostCount: boostStats.boostCount,
        }),
        activeUsers: (0, roomClients_store_1.getRoomUsers)(roomId),
        pinnedMessage: room.pinnedMessage || {
            text: "",
            updatedBy: "",
            updatedAt: null,
        },
    };
}
async function getFavoriteRoomIdSet(userId) {
    const states = await RoomUserState_model_1.RoomUserStateModel.find({
        userId,
        isFavorite: true,
    })
        .select("roomId")
        .lean();
    return new Set(states.map((state) => String(state.roomId || "")));
}
async function getRoomBoostStatsForQuery(roomId) {
    const now = new Date();
    const result = await RoomBoost_model_1.RoomBoostModel.aggregate([
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
async function getRoomBoostStatsMap(roomIds) {
    const cleanRoomIds = roomIds.filter(Boolean);
    const map = new Map();
    if (cleanRoomIds.length === 0) {
        return map;
    }
    const now = new Date();
    const result = await RoomBoost_model_1.RoomBoostModel.aggregate([
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
//# sourceMappingURL=room-query.service.js.map