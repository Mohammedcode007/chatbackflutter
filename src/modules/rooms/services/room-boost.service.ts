import { RoomModel } from "../models/Room.model";
import { RoomBoostModel } from "../models/RoomBoost.model";
import { makeRoomBoostId } from "../utils/room.ids";
import { sanitizeRoomId, sanitizeUserId, sanitizePositiveNumber } from "../utils/room.sanitize";

const BOOST_DAYS = 30;

export async function boostRoomService(input: {
  userId: string;
  roomId: string;
  value?: number;
}) {
  const userId = sanitizeUserId(input.userId);
  const roomId = sanitizeRoomId(input.roomId);
  const value = sanitizePositiveNumber(input.value, 1) || 1;

  if (!userId || !roomId) {
    return { ok: false as const, reason: "invalid_boost_payload" };
  }

  const room = await RoomModel.findOne({ roomId });

  if (!room) {
    return { ok: false as const, reason: "room_not_found" };
  }

  /*
    أي مستخدم يستطيع يعمل boost
    حتى لو none وليس داخل الغرفة.
  */
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + BOOST_DAYS);

  const boost = await RoomBoostModel.create({
    boostId: makeRoomBoostId(),
    roomId,
    userId,
    value,
    expiresAt,
  });

  const boostScore = await getRoomBoostScore(roomId);

  return {
    ok: true as const,
    boost,
    roomId,
    boostScore,
  };
}

/*
  مجموع البوستات الفعالة فقط.
  المنتهي لا يُحسب.
*/
export async function getRoomBoostScore(roomIdValue: string) {
  const roomId = sanitizeRoomId(roomIdValue);

  if (!roomId) return 0;

  const now = new Date();

  const result = await RoomBoostModel.aggregate([
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
export async function getRoomActiveBoostCount(roomIdValue: string) {
  const roomId = sanitizeRoomId(roomIdValue);

  if (!roomId) return 0;

  return RoomBoostModel.countDocuments({
    roomId,
    expiresAt: { $gt: new Date() },
  });
}

/*
  هل المستخدم عمل boost فعال لهذه الغرفة.
*/
export async function hasUserActiveBoost(input: {
  userId: string;
  roomId: string;
}) {
  const userId = sanitizeUserId(input.userId);
  const roomId = sanitizeRoomId(input.roomId);

  if (!userId || !roomId) return false;

  const boost = await RoomBoostModel.findOne({
    userId,
    roomId,
    expiresAt: { $gt: new Date() },
  }).lean();

  return Boolean(boost);
}

/*
  إحصائيات boost لغرفة واحدة.
*/
export async function getRoomBoostStats(roomIdValue: string) {
  const roomId = sanitizeRoomId(roomIdValue);

  if (!roomId) {
    return {
      boostScore: 0,
      boostCount: 0,
      boostersCount: 0,
    };
  }

  const now = new Date();

  const result = await RoomBoostModel.aggregate([
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
export async function listPublicRoomsByBoostService() {
  const now = new Date();

  const boosted = await RoomBoostModel.aggregate([
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
    ? await RoomModel.find({
        roomId: { $in: boostedRoomIds },
      }).lean()
    : [];

  const roomMap = new Map(
    boostedRooms.map((room: any) => [String(room.roomId), room])
  );

  const sortedBoostedRooms = boosted
    .map((item) => {
      const room = roomMap.get(String(item._id));

      if (!room) return null;

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
  const otherRooms = await RoomModel.find({
    roomId: { $nin: boostedRoomIds },
  })
    .sort({ createdAt: -1 })
    .lean();

  const otherRoomsWithBoost = otherRooms.map((room: any) => ({
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
export async function deleteExpiredRoomBoostsService() {
  const result = await RoomBoostModel.deleteMany({
    expiresAt: { $lte: new Date() },
  });

  return {
    ok: true as const,
    deletedCount: result.deletedCount || 0,
  };
}