"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.savePendingDmMessage = savePendingDmMessage;
exports.getPendingDmMessages = getPendingDmMessages;
exports.clearPendingDmMessages = clearPendingDmMessages;
const redis_1 = require("../../database/redis");
const PENDING_DM_TTL_SECONDS = 60 * 60 * 24 * 7;
function pendingKey(userId) {
    return `dm:pending:${userId}`;
}
async function savePendingDmMessage(input) {
    const { toUserId, message } = input;
    const key = pendingKey(toUserId);
    await redis_1.redis.rpush(key, JSON.stringify(message));
    await redis_1.redis.expire(key, PENDING_DM_TTL_SECONDS);
    return {
        ok: true,
    };
}
async function getPendingDmMessages(userId) {
    const key = pendingKey(userId);
    const items = await redis_1.redis.lrange(key, 0, -1);
    const messages = [];
    for (const item of items) {
        try {
            const parsed = JSON.parse(item);
            messages.push(parsed);
        }
        catch (_) { }
    }
    return messages;
}
async function clearPendingDmMessages(userId) {
    const key = pendingKey(userId);
    await redis_1.redis.del(key);
}
//# sourceMappingURL=dm.redis.js.map