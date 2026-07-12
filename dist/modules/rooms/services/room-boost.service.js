"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.boostRoomService = boostRoomService;
exports.getRoomBoostScore = getRoomBoostScore;
exports.getRoomActiveBoostCount = getRoomActiveBoostCount;
exports.hasUserActiveBoost = hasUserActiveBoost;
exports.getRoomBoostStats = getRoomBoostStats;
exports.listPublicRoomsByBoostService = listPublicRoomsByBoostService;
exports.deleteExpiredRoomBoostsService = deleteExpiredRoomBoostsService;
const Room_model_1 = require("../models/Room.model");
const RoomBoost_model_1 = require("../models/RoomBoost.model");
const room_ids_1 = require("../utils/room.ids");
const room_sanitize_1 = require("../utils/room.sanitize");
const BOOST_DAYS = 30;
async function boostRoomService(input) {
    const userId = (0, room_sanitize_1.sanitizeUserId)(input.userId);
    const roomId = (0, room_sanitize_1.sanitizeRoomId)(input.roomId);
    const value = (0, room_sanitize_1.sanitizePositiveNumber)(input.value, 1) || 1;
    if (!userId || !roomId) {
        return { ok: false, reason: "invalid_boost_payload" };
    }
    const room = await Room_model_1.RoomModel.findOne({ roomId });
    if (!room) {
        return { ok: false, reason: "room_not_found" };
    }
    /*
      أي مستخدم يستطيع يعمل boost
      حتى لو none وليس داخل الغرفة.
    */
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + BOOST_DAYS);
    const boost = await RoomBoost_model_1.RoomBoostModel.create({
        boostId: (0, room_ids_1.makeRoomBoostId)(),
        roomId,
        userId,
        value,
        expiresAt,
    });
    const boostScore = await getRoomBoostScore(roomId);
    return {
        ok: true,
        boost,
        roomId,
        boostScore,
    };
}
/*
  مجموع البوستات الفعالة فقط.
  المنتهي لا يُحسب.
*/
async function getRoomBoostScore(roomIdValue) {
    const roomId = (0, room_sanitize_1.sanitizeRoomId)(roomIdValue);
    if (!roomId)
        return 0;
    const now = new Date();
    const result = await RoomBoost_model_1.RoomBoostModel.aggregate([
        {
            $match: {
                roomId,
                expiresAt: { $gt: now },
            },
        },
        {
            $group: {
                _id: "$roomId",
                boostScore: { $sum: "$value" },
            },
        },
    ]);
    return Number(result[0]?.boostScore || 0);
}
/*
  عدد البوستات الفعالة كعدد عمليات،
  وليس مجموع value.
*/
async function getRoomActiveBoostCount(roomIdValue) {
    const roomId = (0, room_sanitize_1.sanitizeRoomId)(roomIdValue);
    if (!roomId)
        return 0;
    return RoomBoost_model_1.RoomBoostModel.countDocuments({
        roomId,
        expiresAt: { $gt: new Date() },
    });
}
/*
  هل المستخدم عمل boost فعال لهذه الغرفة.
*/
async function hasUserActiveBoost(input) {
    const userId = (0, room_sanitize_1.sanitizeUserId)(input.userId);
    const roomId = (0, room_sanitize_1.sanitizeRoomId)(input.roomId);
    if (!userId || !roomId)
        return false;
    const boost = await RoomBoost_model_1.RoomBoostModel.findOne({
        userId,
        roomId,
        expiresAt: { $gt: new Date() },
    }).lean();
    return Boolean(boost);
}
/*
  إحصائيات boost لغرفة واحدة.
*/
async function getRoomBoostStats(roomIdValue) {
    const roomId = (0, room_sanitize_1.sanitizeRoomId)(roomIdValue);
    if (!roomId) {
        return {
            boostScore: 0,
            boostCount: 0,
            boostersCount: 0,
        };
    }
    const now = new Date();
    const result = await RoomBoost_model_1.RoomBoostModel.aggregate([
        {
            $match: {
                roomId,
                expiresAt: { $gt: now },
            },
        },
        {
            $group: {
                _id: "$roomId",
                boostScore: { $sum: "$value" },
                boostCount: { $sum: 1 },
                boosters: { $addToSet: "$userId" },
            },
        },
        {
            $project: {
                _id: 0,
                boostScore: 1,
                boostCount: 1,
                boostersCount: { $size: "$boosters" },
            },
        },
    ]);
    return {
        boostScore: Number(result[0]?.boostScore || 0),
        boostCount: Number(result[0]?.boostCount || 0),
        boostersCount: Number(result[0]?.boostersCount || 0),
    };
}
/*
  ترتيب غرف public حسب أكبر boost.
  أي غرفة boostScore أعلى تظهر فوق بغض النظر عن أي شيء.
*/
async function listPublicRoomsByBoostService() {
    const now = new Date();
    const boosted = await RoomBoost_model_1.RoomBoostModel.aggregate([
        {
            $match: {
                expiresAt: { $gt: now },
            },
        },
        {
            $group: {
                _id: "$roomId",
                boostScore: { $sum: "$value" },
                boostCount: { $sum: 1 },
            },
        },
        {
            $sort: {
                boostScore: -1,
                boostCount: -1,
            },
        },
    ]);
    const boostedRoomIds = boosted.map((item) => String(item._id));
    const boostedRooms = boostedRoomIds.length
        ? await Room_model_1.RoomModel.find({
            roomId: { $in: boostedRoomIds },
        }).lean()
        : [];
    const roomMap = new Map(boostedRooms.map((room) => [String(room.roomId), room]));
    const sortedBoostedRooms = boosted
        .map((item) => {
        const room = roomMap.get(String(item._id));
        if (!room)
            return null;
        return {
            ...room,
            boostScore: Number(item.boostScore || 0),
            boostCount: Number(item.boostCount || 0),
        };
    })
        .filter(Boolean);
    /*
      باقي الغرف التي ليس عليها boost تظهر بعدهم.
    */
    const otherRooms = await Room_model_1.RoomModel.find({
        roomId: { $nin: boostedRoomIds },
    })
        .sort({ createdAt: -1 })
        .lean();
    const otherRoomsWithBoost = otherRooms.map((room) => ({
        ...room,
        boostScore: 0,
        boostCount: 0,
    }));
    return [...sortedBoostedRooms, ...otherRoomsWithBoost];
}
/*
  تنظيف يدوي للبوستات المنتهية.
  مع أن TTL index يحذف تلقائيًا، هذه مفيدة لو أردت تشغيلها يدويًا.
*/
async function deleteExpiredRoomBoostsService() {
    const result = await RoomBoost_model_1.RoomBoostModel.deleteMany({
        expiresAt: { $lte: new Date() },
    });
    return {
        ok: true,
        deletedCount: result.deletedCount || 0,
    };
}
//# sourceMappingURL=room-boost.service.js.map