/*
  room.sanitize.ts

  هذا الملف مسؤول عن تنظيف المدخلات الخاصة بالغرف:
  - اسم الغرفة
  - الوصف
  - الباسورد
  - النصوص
  - اليوزرنيم في المنشن
  - نوع الرسالة
  - نوع التاب
  - الإيموجي للرياكشن

  مهم:
  هذا لا يحفظ رسائل.
*/

import type {
  RoomListType,
  RoomUserMessageType,
  RoomLiveMessageType,
} from "../types/room.types";
import type { RoomGiftPayload } from "../types/room.types";
export function cleanText(value: any) {
  return String(value || "").trim();
}

export function limitText(value: any, max: number) {
  const text = cleanText(value);

  if (text.length <= max) return text;

  return text.slice(0, max);
}

/*
  تنظيف اسم الغرفة.
  أقصى اسم 50 حرف.
*/
export function sanitizeRoomName(value: any) {
  return limitText(value, 50);
}

/*
  وصف الغرفة اختياري.
*/
export function sanitizeRoomDescription(value: any) {
  return limitText(value, 300);
}

/*
  باسورد الغرفة.
  لا نعمل trim فقط.
  الأفضل لا تسمح بباسورد أقل من 4 لو مستخدم كتبه.
*/
export function sanitizeRoomPassword(value: any) {
  return cleanText(value);
}

export function isValidRoomPassword(password: string) {
  if (!password) return true;

  return password.length >= 4 && password.length <= 50;
}

/*
  نص الرسالة اللايف.
  الرسائل لا تُحفظ.
*/
export function sanitizeRoomMessageText(value: any) {
  return limitText(value, 1000);
}

/*
  نص الرسالة المثبتة محفوظ داخل RoomModel.
*/
export function sanitizePinnedMessage(value: any) {
  return limitText(value, 500);
}

/*
  username للمنشن.
  يقبل:
  mohammed
  mohammed_1
  mohammed.1
*/
export function sanitizeMentionUsername(value: any) {
  let username = cleanText(value);

  if (username.startsWith("@")) {
    username = username.slice(1);
  }

  username = username.toLowerCase();

  username = username.replace(/[^a-z0-9_.]/g, "");

  return username.slice(0, 32);
}

/*
  استخراج أول منشن من النص:
  @username message
*/
export function parseRoomMention(textValue: any) {
  const text = sanitizeRoomMessageText(textValue);

  const match = text.match(/^@([a-zA-Z0-9_.]{1,32})\s+(.+)$/);

  if (!match) return null;

  const username = sanitizeMentionUsername(match[1]);
  const message = sanitizeRoomMessageText(match[2]);

  if (!username || !message) return null;

  return {
    username,
    text: message,
  };
}

/*
  تاب الغرف.
*/
export function sanitizeRoomListType(value: any): RoomListType {
  const tab = cleanText(value).toLowerCase();

  if (
    tab === "active" ||
    tab === "favorite" ||
    tab === "public" ||
    tab === "voice"
  ) {
    return tab;
  }

  return "public";
}

/*
  نوع رسالة المستخدم.
*/
export function sanitizeRoomUserMessageType(value: any): RoomUserMessageType {
  const type = cleanText(value).toLowerCase();

  if (type === "text" || type === "image" || type === "gif" || type === "video"||
    type === "audio" ||
    type === "voice") {
    return type;
  }

  return "text";
}

/*
  نوع الرسالة اللايف العام.
*/
export function sanitizeRoomLiveMessageType(value: any): RoomLiveMessageType {
  const type = cleanText(value).toLowerCase();

  if (
    type === "text" ||
    type === "image" ||
    type === "gif" ||
    type === "video" ||
    type === "audio" ||
    type === "voice" ||
    type === "gift" ||
    type === "none"
  ) {
    return type;
  }

  return "none";
}
/*
  تنظيف ID عام.
*/
export function sanitizeId(value: any) {
  return cleanText(value);
}

export function sanitizeRoomId(value: any) {
  return cleanText(value);
}

export function sanitizeUserId(value: any) {
  return cleanText(value);
}

/*
  الإيموجي للرياكشن.
  نخليه قصير حتى لا يدخل نص كبير.
*/
export function sanitizeReactionEmoji(value: any) {
  return cleanText(value).slice(0, 12);
}

/*
  قراءة رقم آمن.
*/
export function sanitizePositiveNumber(value: any, fallback = 0) {
  const num = Number(value);

  if (!Number.isFinite(num)) return fallback;

  if (num < 0) return fallback;

  return num;
}

/*
  حجم ملف الميديا.
*/
export function sanitizeSizeBytes(value: any) {
  return sanitizePositiveNumber(value, 0);
}

/*
  تنظيف media object القادم من Flutter.
*/
export function sanitizeRoomMedia(value: any) {
  if (!value || typeof value !== "object") return null;

  const url = cleanText(value.url);

  if (!url) return null;

  return {
    url,
    publicId: cleanText(value.publicId || value.public_id),
    fileName: limitText(value.fileName || value.file_name, 160),
    mimeType: limitText(value.mimeType || value.mime_type, 80),
    sizeBytes: sanitizeSizeBytes(value.sizeBytes || value.size_bytes),
    duration: cleanText(value.duration),
  };
}
/*
  تنظيف replyTo القادم من Flutter.
*/
export function sanitizeRoomReply(value: any) {
  if (!value || typeof value !== "object") return null;

  const messageId = cleanText(value.messageId || value.message_id);
  const fromUserId = cleanText(value.fromUserId || value.from_user_id);

  if (!messageId || !fromUserId) return null;

  return {
    messageId,
    fromUserId,
    text: sanitizeRoomMessageText(value.text),
    type: cleanText(value.type),
    mediaUrl: cleanText(value.mediaUrl || value.media_url),
  };
}

/*
  تنظيف بيانات هدية.
*/
export function sanitizeRoomGift(value: any): RoomGiftPayload | null {
  if (!value || typeof value !== "object") return null;

  const key = limitText(value.key, 80);
  const name = limitText(value.name, 80);

  const rawAnimationType = cleanText(
    value.animationType || value.animation_type
  );

  let animationType: RoomGiftPayload["animationType"] = "gif";

  if (
    rawAnimationType === "video" ||
    rawAnimationType === "gif" ||
    rawAnimationType === "lottie"
  ) {
    animationType = rawAnimationType;
  }

  const animationUrl = cleanText(value.animationUrl || value.animation_url);

  if (!key || !name || !animationUrl) return null;

  return {
    key,
    name,
    animationType,
    animationUrl,
    thumbnailUrl: cleanText(value.thumbnailUrl || value.thumbnail_url),
    value: sanitizePositiveNumber(value.value, 0),
    durationMs: sanitizePositiveNumber(value.durationMs || value.duration_ms, 0),
  };
}

/*
  تنظيف فيديو دخول المستخدم.
*/
export function sanitizeRoomEntryVideo(value: any) {
  if (!value || typeof value !== "object") return null;

  const videoUrl = cleanText(value.videoUrl || value.video_url);

  if (!videoUrl) return null;

  return {
    videoUrl,
    thumbnailUrl: cleanText(value.thumbnailUrl || value.thumbnail_url),
    durationMs: sanitizePositiveNumber(value.durationMs || value.duration_ms, 0),
  };
}

/*
  تحويل أي قيمة Boolean بأمان.
*/
export function readBool(value: any) {
  if (value === true) return true;
  if (value === false) return false;

  const text = cleanText(value).toLowerCase();

  return text === "true" || text === "1" || text === "yes";
}