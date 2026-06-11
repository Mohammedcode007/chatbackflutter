import { redis } from "../../database/redis";
import { DmMessagePayload } from "./dm.types";

const PENDING_DM_TTL_SECONDS = 60 * 60 * 24 * 7;

function pendingKey(userId: string) {
  return `dm:pending:${userId}`;
}

export async function savePendingDmMessage(input: {
  toUserId: string;
  message: DmMessagePayload;
}) {
  const { toUserId, message } = input;

  const key = pendingKey(toUserId);

  await redis.rpush(key, JSON.stringify(message));
  await redis.expire(key, PENDING_DM_TTL_SECONDS);

  return {
    ok: true as const,
  };
}

export async function getPendingDmMessages(userId: string) {
  const key = pendingKey(userId);

  const items = await redis.lrange(key, 0, -1);

  const messages: DmMessagePayload[] = [];

  for (const item of items) {
    try {
      const parsed = JSON.parse(item) as DmMessagePayload;
      messages.push(parsed);
    } catch (_) {}
  }

  return messages;
}

export async function clearPendingDmMessages(userId: string) {
  const key = pendingKey(userId);

  await redis.del(key);
}