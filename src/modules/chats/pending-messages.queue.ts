import { redis } from "../../database/redis";

export type PendingPrivateMessage = {
  message_id: string;
  local_message_id?: string | null;

  sender_id: string;
  sender_username: string;
  sender_photo_url: string;

  receiver_id: string;

  body: string;
  message_type: string;

  created_at: string;
};

const PENDING_KEY_PREFIX = "pending_private_messages:";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getPendingKey(userId: string) {
  return `${PENDING_KEY_PREFIX}${userId}`;
}

export async function addPendingPrivateMessage(
  receiverId: string,
  message: PendingPrivateMessage
) {
  const key = getPendingKey(receiverId);

  await redis.rpush(key, JSON.stringify(message));
  await redis.expire(key, DEFAULT_TTL_SECONDS);
}

export async function getPendingPrivateMessages(receiverId: string) {
  const key = getPendingKey(receiverId);

  const items = await redis.lrange(key, 0, -1);

  return items
    .map((item) => {
      try {
        return JSON.parse(item) as PendingPrivateMessage;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as PendingPrivateMessage[];
}

export async function clearPendingPrivateMessages(receiverId: string) {
  const key = getPendingKey(receiverId);

  await redis.del(key);
}

export async function popAllPendingPrivateMessages(receiverId: string) {
  const messages = await getPendingPrivateMessages(receiverId);

  if (messages.length > 0) {
    await clearPendingPrivateMessages(receiverId);
  }

  return messages;
}