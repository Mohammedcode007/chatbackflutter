"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const RoomUserState_model_1 = require("../modules/rooms/models/RoomUserState.model");
dotenv_1.default.config();
async function dropIndexIfExists(indexName) {
    const collection = RoomUserState_model_1.RoomUserStateModel.collection;
    const indexes = await collection.indexes();
    const exists = indexes.some((index) => index.name === indexName);
    if (!exists) {
        console.log(`ℹ️ Index not found, skip: ${indexName}`);
        return;
    }
    console.log(`🗑️ Dropping old index: ${indexName}`);
    await collection.dropIndex(indexName);
    console.log(`✅ Dropped index: ${indexName}`);
}
async function deleteBadDocs() {
    const collection = RoomUserState_model_1.RoomUserStateModel.collection;
    console.log("🧹 Deleting bad roomuserstates docs...");
    const result = await collection.deleteMany({
        $or: [
            { room: null },
            { user: null },
            { room: { $exists: true } },
            { user: { $exists: true } },
            { roomId: null },
            { userId: null },
            { roomId: "" },
            { userId: "" },
            { roomId: { $exists: false } },
            { userId: { $exists: false } },
        ],
    });
    console.log("✅ Deleted bad docs:", result.deletedCount);
}
async function removeDuplicateRoomUserStates() {
    const collection = RoomUserState_model_1.RoomUserStateModel.collection;
    console.log("🔎 Checking duplicated roomId + userId docs...");
    const duplicates = await collection
        .aggregate([
        {
            $match: {
                roomId: { $exists: true, $ne: "" },
                userId: { $exists: true, $ne: "" },
            },
        },
        {
            $group: {
                _id: {
                    roomId: "$roomId",
                    userId: "$userId",
                },
                ids: { $push: "$_id" },
                count: { $sum: 1 },
            },
        },
        {
            $match: {
                count: { $gt: 1 },
            },
        },
    ])
        .toArray();
    console.log("🔁 Duplicate groups found:", duplicates.length);
    let deletedCount = 0;
    for (const item of duplicates) {
        const ids = item.ids || [];
        // نترك أول سجل ونحذف الباقي
        const idsToDelete = ids.slice(1);
        if (idsToDelete.length === 0)
            continue;
        const result = await collection.deleteMany({
            _id: { $in: idsToDelete },
        });
        deletedCount += result.deletedCount || 0;
        console.log("🗑️ Removed duplicates:", {
            roomId: item._id.roomId,
            userId: item._id.userId,
            deleted: result.deletedCount,
        });
    }
    console.log("✅ Total duplicate docs deleted:", deletedCount);
}
async function createCorrectIndex() {
    const collection = RoomUserState_model_1.RoomUserStateModel.collection;
    console.log("🔧 Creating correct unique index: roomId_1_userId_1");
    await collection.createIndex({
        roomId: 1,
        userId: 1,
    }, {
        unique: true,
        name: "roomId_1_userId_1",
    });
    console.log("✅ Correct index created");
}
async function printIndexes() {
    const collection = RoomUserState_model_1.RoomUserStateModel.collection;
    const indexes = await collection.indexes();
    console.log("📌 Current indexes:");
    for (const index of indexes) {
        console.log(index);
    }
}
async function main() {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error("❌ MONGO_URI or MONGODB_URI is missing in .env");
        process.exit(1);
    }
    console.log("🔌 Connecting to MongoDB...");
    await mongoose_1.default.connect(mongoUri);
    console.log("✅ Connected");
    console.log("\n===== BEFORE =====");
    await printIndexes();
    console.log("\n===== FIX START =====");
    // index القديم الذي يسبب:
    // dup key: { room: null, user: null }
    await dropIndexIfExists("room_1_user_1");
    // لو كان عندك اسم آخر للـ index القديم
    await dropIndexIfExists("user_1_room_1");
    await deleteBadDocs();
    await removeDuplicateRoomUserStates();
    await createCorrectIndex();
    console.log("\n===== AFTER =====");
    await printIndexes();
    await mongoose_1.default.disconnect();
    console.log("\n✅ FIX DONE");
    process.exit(0);
}
main().catch(async (error) => {
    console.error("❌ FIX FAILED:", error);
    try {
        await mongoose_1.default.disconnect();
    }
    catch { }
    process.exit(1);
});
//# sourceMappingURL=fix-room-user-state-indexes.js.map