"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleFavoriteRoomService = toggleFavoriteRoomService;
exports.setFavoriteRoomService = setFavoriteRoomService;
exports.isRoomFavoriteForUserService = isRoomFavoriteForUserService;
exports.listFavoriteRoomIdsService = listFavoriteRoomIdsService;
exports.listFavoriteRoomsService = listFavoriteRoomsService;
exports.setRoomMutedService = setRoomMutedService;
exports.updateRoomLastJoinedAtService = updateRoomLastJoinedAtService;
const Room_model_1 = require("../models/Room.model");
const RoomUserState_model_1 = require("../models/RoomUserState.model");
const room_sanitize_1 = require("../utils/room.sanitize");
async function toggleFavoriteRoomService(input) {
    const userId = (0, room_sanitize_1.sanitizeUserId)(input.userId);
    const roomId = (0, room_sanitize_1.sanitizeRoomId)(input.roomId);
    if (!userId || !roomId) {
        return {
            ok: false,
            reason: "invalid_favorite_payload",
        };
    }
    const room = await Room_model_1.RoomModel.findOne({ roomId });
    if (!room) {
        return {
            ok: false,
            reason: "room_not_found",
        };
    }
    const state = await RoomUserState_model_1.RoomUserStateModel.findOneAndUpdate({
        userId,
        roomId,
    }, {
        $set: {
            userId,
            roomId,
        },
        $setOnInsert: {
            isFavorite: false,
            isMuted: false,
            lastJoinedAt: null,
        },
    }, {
        upsert: true,
        returnDocument: "after",
    });
    state.isFavorite = !state.isFavorite;
    await state.save();
    const favoriteCount = await RoomUserState_model_1.RoomUserStateModel.countDocuments({
        roomId,
        isFavorite: true,
    });
    room.favoriteCount = favoriteCount;
    await room.save();
    return {
        ok: true,
        roomId,
        isFavorite: state.isFavorite,
        favoriteCount,
    };
}
async function setFavoriteRoomService(input) {
    const userId = (0, room_sanitize_1.sanitizeUserId)(input.userId);
    const roomId = (0, room_sanitize_1.sanitizeRoomId)(input.roomId);
    if (!userId || !roomId) {
        return {
            ok: false,
            reason: "invalid_favorite_payload",
        };
    }
    const room = await Room_model_1.RoomModel.findOne({ roomId });
    if (!room) {
        return {
            ok: false,
            reason: "room_not_found",
        };
    }
    const state = await RoomUserState_model_1.RoomUserStateModel.findOneAndUpdate({
        userId,
        roomId,
    }, {
        $set: {
            userId,
            roomId,
            isFavorite: input.isFavorite === true,
        },
        $setOnInsert: {
            isMuted: false,
            lastJoinedAt: null,
        },
    }, {
        upsert: true,
        returnDocument: "after",
    });
    const favoriteCount = await RoomUserState_model_1.RoomUserStateModel.countDocuments({
        roomId,
        isFavorite: true,
    });
    room.favoriteCount = favoriteCount;
    await room.save();
    return {
        ok: true,
        roomId,
        isFavorite: state.isFavorite,
        favoriteCount,
    };
}
async function isRoomFavoriteForUserService(input) {
    const userId = (0, room_sanitize_1.sanitizeUserId)(input.userId);
    const roomId = (0, room_sanitize_1.sanitizeRoomId)(input.roomId);
    if (!userId || !roomId) {
        return false;
    }
    const state = await RoomUserState_model_1.RoomUserStateModel.findOne({
        userId,
        roomId,
    }).lean();
    return state?.isFavorite === true;
}
async function listFavoriteRoomIdsService(userIdValue) {
    const userId = (0, room_sanitize_1.sanitizeUserId)(userIdValue);
    if (!userId)
        return [];
    const states = await RoomUserState_model_1.RoomUserStateModel.find({
        userId,
        isFavorite: true,
    })
        .select("roomId")
        .lean();
    return states
        .map((state) => String(state.roomId || ""))
        .filter(Boolean);
}
async function listFavoriteRoomsService(userIdValue) {
    const userId = (0, room_sanitize_1.sanitizeUserId)(userIdValue);
    if (!userId)
        return [];
    const roomIds = await listFavoriteRoomIdsService(userId);
    if (roomIds.length === 0)
        return [];
    return Room_model_1.RoomModel.find({
        roomId: {
            $in: roomIds,
        },
    })
        .sort({
        updatedAt: -1,
    })
        .lean();
}
async function setRoomMutedService(input) {
    const userId = (0, room_sanitize_1.sanitizeUserId)(input.userId);
    const roomId = (0, room_sanitize_1.sanitizeRoomId)(input.roomId);
    if (!userId || !roomId) {
        return {
            ok: false,
            reason: "invalid_mute_payload",
        };
    }
    const room = await Room_model_1.RoomModel.findOne({ roomId }).lean();
    if (!room) {
        return {
            ok: false,
            reason: "room_not_found",
        };
    }
    const state = await RoomUserState_model_1.RoomUserStateModel.findOneAndUpdate({
        userId,
        roomId,
    }, {
        $set: {
            userId,
            roomId,
            isMuted: input.isMuted === true,
        },
        $setOnInsert: {
            isFavorite: false,
            lastJoinedAt: null,
        },
    }, {
        upsert: true,
        returnDocument: "after",
    });
    return {
        ok: true,
        roomId,
        isMuted: state.isMuted,
    };
}
async function updateRoomLastJoinedAtService(input) {
    const userId = (0, room_sanitize_1.sanitizeUserId)(input.userId);
    const roomId = (0, room_sanitize_1.sanitizeRoomId)(input.roomId);
    console.log("[updateRoomLastJoinedAtService] input:", {
        rawUserId: input.userId,
        rawRoomId: input.roomId,
        userId,
        roomId,
    });
    if (!userId || !roomId) {
        console.log("[updateRoomLastJoinedAtService] failed: invalid payload");
        return {
            ok: false,
            reason: "invalid_join_state_payload",
        };
    }
    const state = await RoomUserState_model_1.RoomUserStateModel.findOneAndUpdate({
        userId,
        roomId,
    }, {
        $set: {
            userId,
            roomId,
            lastJoinedAt: new Date(),
        },
        $setOnInsert: {
            isFavorite: false,
            isMuted: false,
        },
    }, {
        upsert: true,
        returnDocument: "after",
    });
    console.log("[updateRoomLastJoinedAtService] updated:", {
        _id: state?._id,
        userId: state?.userId,
        roomId: state?.roomId,
        isFavorite: state?.isFavorite,
        isMuted: state?.isMuted,
        lastJoinedAt: state?.lastJoinedAt,
    });
    return {
        ok: true,
        roomId,
        state,
    };
}
//# sourceMappingURL=room-favorite.service.js.map