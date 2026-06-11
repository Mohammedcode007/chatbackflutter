import { randomUUID } from "crypto";

import { UserModel } from "../../models/User.model";
import { isUserOnline } from "../../websocket/stores/clients.store";

import {
  DmMediaPayload,
  DmMessagePayload,
  DmMessageType,
  DmReplyPayload,
  DmSendResult,
  DmSharedPayload,
} from "./dm.types";

import {
  clearPendingDmMessages,
  getPendingDmMessages,
  savePendingDmMessage,
} from "./dm.redis";

function makeChatId(a: string, b: string) {
  return [a, b].sort().join("_");
}

function readText(value: any) {
  return String(value || "").trim();
}

function readMessageType(value: any): DmMessageType | null {
  const type = String(value || "").trim();

  if (
    type === "text" ||
    type === "image" ||
    type === "video" ||
    type === "audio" ||
    type === "file"
  ) {
    return type;
  }

  return null;
}

function getMaxSizeBytes(type: DmMessageType) {
  if (type === "image") return 5 * 1024 * 1024;
  if (type === "audio") return 10 * 1024 * 1024;
  if (type === "video") return 50 * 1024 * 1024;
  if (type === "file") return 25 * 1024 * 1024;

  return 0;
}

function normalizeMedia(type: DmMessageType, media: any): DmMediaPayload | null {
  if (type === "text") return null;

  if (!media || typeof media !== "object") return null;

  const url = readText(media.url);

  if (!url) return null;

  const sizeBytes = Number(media.sizeBytes || media.size_bytes || 0);
  const maxSize = getMaxSizeBytes(type);

  if (maxSize > 0 && sizeBytes > maxSize) {
    throw new Error("file_too_large");
  }

  return {
    url,
    fileName: readText(media.fileName || media.file_name),
    mimeType: readText(media.mimeType || media.mime_type),
    sizeBytes,
    durationMs: Number(media.durationMs || media.duration_ms || 0),
    thumbnailUrl: readText(media.thumbnailUrl || media.thumbnail_url),
  };
}

function normalizeReply(reply: any): DmReplyPayload | null {
  if (!reply || typeof reply !== "object") return null;

  const messageId = readText(reply.messageId || reply.message_id);
  const fromUserId = readText(reply.fromUserId || reply.from_user_id);
  const type = readMessageType(reply.type);

  if (!messageId || !fromUserId || !type) return null;

  return {
    messageId,
    fromUserId,
    type,
    text: readText(reply.text),
    mediaUrl: readText(reply.mediaUrl || reply.media_url),
  };
}

function normalizeShared(shared: any): DmSharedPayload | null {
  if (!shared || typeof shared !== "object") return null;

  const fromChatUserId = readText(
    shared.fromChatUserId || shared.from_chat_user_id
  );

  const fromChatUsername = readText(
    shared.fromChatUsername || shared.from_chat_username
  );

  const originalMessageId = readText(
    shared.originalMessageId || shared.original_message_id
  );

  const originalType = readMessageType(
    shared.originalType || shared.original_type
  );

  if (!fromChatUserId || !fromChatUsername || !originalMessageId || !originalType) {
    return null;
  }

  return {
    fromChatUserId,
    fromChatUsername,
    originalMessageId,
    originalType,
    originalText: readText(shared.originalText || shared.original_text),
    originalMediaUrl: readText(
      shared.originalMediaUrl || shared.original_media_url
    ),
  };
}

export async function checkDmPermissionOnly(input: {
  fromUserId: string;
  toUserId: string;
}) {
  const { fromUserId, toUserId } = input;

  if (!fromUserId || !toUserId || fromUserId === toUserId) {
    return {
      ok: false as const,
      reason: "invalid_target_user",
    };
  }

  const fromUser = await UserModel.findOne({ userId: fromUserId }).lean();
  const toUser = await UserModel.findOne({ userId: toUserId }).lean();

  if (!fromUser || !toUser) {
    return {
      ok: false as const,
      reason: "user_not_found",
    };
  }

  const fromBlocked = Array.isArray((fromUser as any).blockedUsers)
    ? (fromUser as any).blockedUsers.includes(toUserId)
    : false;

  const toBlocked = Array.isArray((toUser as any).blockedUsers)
    ? (toUser as any).blockedUsers.includes(fromUserId)
    : false;

  if (fromBlocked) {
    return {
      ok: false as const,
      reason: "you_blocked_this_user",
    };
  }

  if (toBlocked) {
    return {
      ok: false as const,
      reason: "user_blocked_you",
    };
  }

  const dmPrivacy = String((toUser as any).privacy?.dmPrivacy || "open");

  if (dmPrivacy === "closed") {
    return {
      ok: false as const,
      reason: "dm_closed",
    };
  }

  const isFriend = Array.isArray((fromUser as any).friends)
    ? (fromUser as any).friends.includes(toUserId)
    : false;

  if (dmPrivacy === "friends_only" && !isFriend) {
    return {
      ok: false as const,
      reason: "dm_friends_only",
    };
  }

  return {
    ok: true as const,
    fromUser,
    toUser,
    targetHidden: (toUser as any).hideActivityStatus === true,
    targetOnlineReal: isUserOnline(toUserId),
  };
}
export async function sendDmMessageService(input: {
  fromUserId: string;
  payload: any;
}): Promise<DmSendResult> {
  const fromUserId = input.fromUserId;

  const toUserId = readText(
    input.payload.to_user_id ||
      input.payload.toUserId ||
      input.payload.target_user_id ||
      input.payload.targetUserId
  );

  const type = readMessageType(input.payload.message_type || input.payload.type);

  if (!type) {
    return {
      ok: false,
      reason: "invalid_message_type",
    };
  }

  const text = readText(input.payload.text || input.payload.body);

  if (type === "text" && !text) {
    return {
      ok: false,
      reason: "empty_message",
    };
  }

  let media: DmMediaPayload | null = null;

  try {
    media = normalizeMedia(type, input.payload.media);
  } catch (error: any) {
    return {
      ok: false,
      reason: error?.message || "invalid_media",
    };
  }

  if (type !== "text" && !media) {
    return {
      ok: false,
      reason: "missing_media",
    };
  }

const permission = await checkDmPermissionOnly({
  fromUserId,
  toUserId,
});

  if (!permission.ok) {
    return permission;
  }

  const now = new Date().toISOString();

  const message: DmMessagePayload = {
    messageId: randomUUID(),
    tempId: readText(input.payload.temp_id || input.payload.tempId),
    chatId: makeChatId(fromUserId, toUserId),

    fromUserId,
    toUserId,

    type,
    text: type === "text" ? text : readText(input.payload.text),
    media,

    replyTo: normalizeReply(input.payload.replyTo || input.payload.reply_to),
    shared: normalizeShared(input.payload.shared),

    isEdited: false,
    isDeleted: false,

    createdAt: now,
    updatedAt: now,
  };

  /*
    مهم:
    هنا نستخدم isUserOnline الحقيقي من sockets.
    لا نستخدم hideActivityStatus.
  */
  const targetOnlineReal = isUserOnline(toUserId);

  if (!targetOnlineReal) {
    await savePendingDmMessage({
      toUserId,
      message,
    });

    return {
      ok: true,
      message,
      delivered: false,
      storedInRedis: true,
      targetHidden: permission.targetHidden,
    };
  }

  return {
    ok: true,
    message,
    delivered: true,
    storedInRedis: false,
    targetHidden: permission.targetHidden,
  };
}

export async function getAndClearPendingDmMessages(userId: string) {
  const messages = await getPendingDmMessages(userId);

  if (messages.length > 0) {
    await clearPendingDmMessages(userId);
  }

  return messages;
}

export async function canSendDmSignal(input: {
  fromUserId: string;
  toUserId: string;
}) {
  const permission = await checkDmPermissionOnly(input);

  if (!permission.ok) return permission;

  /*
    ممنوع إرسال typing / seen لو المستقبل Offline حقيقي
  */
  if (!permission.targetOnlineReal) {
    return {
      ok: false as const,
      reason: "target_offline",
    };
  }

  /*
    مهم:
    لو المرسل نفسه مخفي حالته، لا نرسل typing ولا seen
    حتى لو المستقبل Online.
  */
  const fromHidden =
    (permission.fromUser as any).hideActivityStatus === true ||
    (permission.fromUser as any).isManualOffline === true;

  if (fromHidden) {
    return {
      ok: false as const,
      reason: "sender_hidden_activity",
    };
  }

  return {
    ok: true as const,
  };
}