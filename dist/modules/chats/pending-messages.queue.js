"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPendingPrivateMessage = addPendingPrivateMessage;
exports.getPendingPrivateMessages = getPendingPrivateMessages;
exports.clearPendingPrivateMessages = clearPendingPrivateMessages;
exports.popAllPendingPrivateMessages = popAllPendingPrivateMessages;
const redis_1 = require("../../database/redis");
const PENDING_KEY_PREFIX = "pending_private_messages:";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
function getPendingKey(userId) {
    return `${PENDING_KEY_PREFIX}${userId}`;
}
async function addPendingPrivateMessage(receiverId, message) {
    const key = getPendingKey(receiverId);
    await redis_1.redis.rpush(key, JSON.stringify(message));
    await redis_1.redis.expire(key, DEFAULT_TTL_SECONDS);
}
async function getPendingPrivateMessages(receiverId) {
    const key = getPendingKey(receiverId);
    const items = await redis_1.redis.lrange(key, 0, -1);
    return items
        .map((item) => {
        try {
            return JSON.parse(item);
        }
        catch {
            return null;
        }
    })
        .filter(Boolean);
}
async function clearPendingPrivateMessages(receiverId) {
    const key = getPendingKey(receiverId);
    await redis_1.redis.del(key);
}
async function popAllPendingPrivateMessages(receiverId) {
    const messages = await getPendingPrivateMessages(receiverId);
    if (messages.length > 0) {
        await clearPendingPrivateMessages(receiverId);
    }
    return messages;
}
//# sourceMappingURL=pending-messages.queue.js.map