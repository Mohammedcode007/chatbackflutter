import { randomUUID } from "crypto";
import { v2 as cloudinary } from "cloudinary";
import { UserModel } from "../../models/User.model";
import { isUserOnline } from "../../websocket/stores/clients.store";
import { sendPushToUser } from "../../services/pushNotification.service";
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

  /*
    لو أنا حاظره:
    لا أرسل له أي رسالة.
  */
  if (fromBlocked) {
    return {
      ok: false as const,
      reason: "you_blocked_this_user",
    };
  }

  /*
    لو هو حاظرني:
    لا تصله أي رسالة.
  */
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

  /*
    الحالة المخفية:
    لو المستقبل مفعل hideActivityStatus أو عامل manual offline
    يعامل كأنه Offline في الواجهة ولا يظهر delivered/seen.
  */
  const targetHidden =
    (toUser as any).hideActivityStatus === true ||
    (toUser as any).isManualOffline === true;

  /*
    Online الحقيقي من sockets.
    هذا يستخدم فقط لتوصيل الرسالة فعليًا لو المستخدم متصل.
    لا تستخدمه وحده لإظهار الحالة للمرسل.
  */
  const targetOnlineReal = isUserOnline(toUserId);

  /*
    هل مسموح للمرسل يشوف نشاط المستقبل؟
    لازم يكونوا أصدقاء + المستقبل ليس مخفي الحالة.
  */
  const canShowTargetActivity = isFriend && !targetHidden;

  return {
    ok: true as const,
    fromUser,
    toUser,

    isFriend,

    targetHidden,
    targetOnlineReal,

    /*
      تستخدمها في:
      - إظهار Online/Offline
      - إرسال delivered
      - إرسال seen
      - typing
    */
    canShowTargetActivity,
  };
}
async function uploadDmBase64Media(input: {
  type: DmMessageType;
  mediaBase64: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
}): Promise<DmMediaPayload> {
  const { type, mediaBase64 } = input;

  if (type === "text") {
    throw new Error("invalid_media_type");
  }

  const base64 = readText(mediaBase64);

  if (!base64) {
    throw new Error("missing_media_base64");
  }

  const sizeBytes = Number(input.sizeBytes || 0);
  const maxSize = getMaxSizeBytes(type);

  if (maxSize > 0 && sizeBytes > maxSize) {
    throw new Error("file_too_large");
  }

  const resourceType =
    type === "audio" || type === "video" ? "video" : "image";

  const folder =
    type === "audio"
      ? "bimo/dm/audio"
      : type === "image"
      ? "bimo/dm/images"
      : type === "video"
      ? "bimo/dm/videos"
      : "bimo/dm/files";

  const uploaded = await cloudinary.uploader.upload(base64, {
    folder,
    resource_type: resourceType,
  });

  return {
    url: uploaded.secure_url,
    fileName: readText(input.fileName),
    mimeType: readText(input.mimeType),
    sizeBytes,
    durationMs: 0,
    thumbnailUrl: "",
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
  const mediaBase64 = readText(
    input.payload.mediaBase64 || input.payload.media_base64
  );

  /*
    الطريقة الجديدة:
    Flutter يرسل mediaBase64
    والباك يرفعها Cloudinary.
  */
  if (type !== "text" && mediaBase64) {
    const payloadMedia =
      input.payload.media && typeof input.payload.media === "object"
        ? input.payload.media
        : {};

    media = await uploadDmBase64Media({
      type,
      mediaBase64,
      fileName: readText(payloadMedia.fileName || payloadMedia.file_name),
      mimeType: readText(payloadMedia.mimeType || payloadMedia.mime_type),
      sizeBytes: Number(payloadMedia.sizeBytes || payloadMedia.size_bytes || 0),
    });
  } else {
    /*
      الطريقة القديمة:
      لو Flutter أرسل media.url جاهز.
    */
    media = normalizeMedia(type, input.payload.media);
  }
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

    fromUsername: readText((permission.fromUser as any).username),
    fromPhotoUrl: readText((permission.fromUser as any).photoUrl),

    toUsername: readText((permission.toUser as any).username),
    toPhotoUrl: readText((permission.toUser as any).photoUrl),

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
void sendPushToUser({
  userId: toUserId,
  title: readText((permission.fromUser as any).username) || "Talkin Plus",
  body:
    type === "text"
      ? text
      : type === "image"
      ? "Sent you a photo"
      : type === "video"
      ? "Sent you a video"
      : type === "audio"
      ? "Sent you a voice message"
      : "Sent you a file",
  data: {
    type: "dm",
    chatId: message.chatId,
    messageId: message.messageId,
    fromUserId,
    toUserId,
  },
}).catch((error) => {
  console.error("[DM_PUSH_SEND_ERROR]", error);
});
  /*
    Online الحقيقي من sockets.
    هذا فقط لتحديد هل نرسل الرسالة فورًا أم نخزنها في Redis.
  */
  const targetOnlineReal = isUserOnline(toUserId);

  /*
    هل المرسل مسموح له يعرف أن الرسالة وصلت؟
    لازم يكون:
    - صديق
    - والمستقبل ليس مخفي الحالة
  */
  const canShowTargetActivity =
    permission.isFriend === true && permission.targetHidden !== true;

  /*
    لو المستقبل Offline حقيقي:
    نخزن الرسالة في Redis.
    في كل الأحوال تظهر للمرسل علامة واحدة فقط.
  */
  if (!targetOnlineReal) {
    await savePendingDmMessage({
      toUserId,
      message,
    });

    return {
      ok: true,
      message,

      delivered: false,
      targetOnlineReal: false,
      storedInRedis: true,

      targetHidden: permission.targetHidden,
      isFriend: permission.isFriend,
      canShowTargetActivity,
    };
  }

  /*
    لو المستقبل Online حقيقي:
    الرسالة ستصل له فورًا.
    لكن علامتين صح تظهر فقط لو canShowTargetActivity = true.
  */
  return {
    ok: true,
    message,

    delivered: canShowTargetActivity,
    targetOnlineReal: true,
    storedInRedis: false,

    targetHidden: permission.targetHidden,
    isFriend: permission.isFriend,
    canShowTargetActivity,
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
    ممنوع إرسال typing / seen لو المستقبل Offline حقيقي.
  */
  if (!permission.targetOnlineReal) {
    return {
      ok: false as const,
      reason: "target_offline",
    };
  }

  /*
    لو ليسوا أصدقاء:
    لا typing
    لا seen
    لا delivered ظاهر
  */
  if (!permission.isFriend) {
    return {
      ok: false as const,
      reason: "not_friend",
    };
  }

  /*
    لو المرسل نفسه مخفي حالته:
    لا نرسل typing ولا seen للطرف الآخر.
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

  /*
    لو المستقبل مخفي حالته:
    لا نرسل typing/seen له أيضًا حسب منطق الخصوصية الصارم.
  */
  if (permission.targetHidden) {
    return {
      ok: false as const,
      reason: "target_hidden_activity",
    };
  }

  return {
    ok: true as const,
  };
}