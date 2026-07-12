"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanText = cleanText;
exports.limitText = limitText;
exports.sanitizeRoomName = sanitizeRoomName;
exports.sanitizeRoomDescription = sanitizeRoomDescription;
exports.sanitizeRoomPassword = sanitizeRoomPassword;
exports.isValidRoomPassword = isValidRoomPassword;
exports.sanitizeRoomMessageText = sanitizeRoomMessageText;
exports.sanitizePinnedMessage = sanitizePinnedMessage;
exports.sanitizeMentionUsername = sanitizeMentionUsername;
exports.parseRoomMention = parseRoomMention;
exports.sanitizeRoomListType = sanitizeRoomListType;
exports.sanitizeRoomUserMessageType = sanitizeRoomUserMessageType;
exports.sanitizeRoomLiveMessageType = sanitizeRoomLiveMessageType;
exports.sanitizeId = sanitizeId;
exports.sanitizeRoomId = sanitizeRoomId;
exports.sanitizeUserId = sanitizeUserId;
exports.sanitizeReactionEmoji = sanitizeReactionEmoji;
exports.sanitizePositiveNumber = sanitizePositiveNumber;
exports.sanitizeSizeBytes = sanitizeSizeBytes;
exports.sanitizeRoomMedia = sanitizeRoomMedia;
exports.sanitizeRoomReply = sanitizeRoomReply;
exports.sanitizeRoomGift = sanitizeRoomGift;
exports.sanitizeRoomEntryVideo = sanitizeRoomEntryVideo;
exports.readBool = readBool;
function cleanText(value) {
    return String(value || "").trim();
}
function limitText(value, max) {
    const text = cleanText(value);
    if (text.length <= max)
        return text;
    return text.slice(0, max);
}
/*
  تنظيف اسم الغرفة.
  أقصى اسم 50 حرف.
*/
function sanitizeRoomName(value) {
    return limitText(value, 50);
}
/*
  وصف الغرفة اختياري.
*/
function sanitizeRoomDescription(value) {
    return limitText(value, 300);
}
/*
  باسورد الغرفة.
  لا نعمل trim فقط.
  الأفضل لا تسمح بباسورد أقل من 4 لو مستخدم كتبه.
*/
function sanitizeRoomPassword(value) {
    return cleanText(value);
}
function isValidRoomPassword(password) {
    if (!password)
        return true;
    return password.length >= 4 && password.length <= 50;
}
/*
  نص الرسالة اللايف.
  الرسائل لا تُحفظ.
*/
function sanitizeRoomMessageText(value) {
    return limitText(value, 1000);
}
/*
  نص الرسالة المثبتة محفوظ داخل RoomModel.
*/
function sanitizePinnedMessage(value) {
    return limitText(value, 500);
}
/*
  username للمنشن.
  يقبل:
  mohammed
  mohammed_1
  mohammed.1
*/
function sanitizeMentionUsername(value) {
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
function parseRoomMention(textValue) {
    const text = sanitizeRoomMessageText(textValue);
    const match = text.match(/^@([a-zA-Z0-9_.]{1,32})\s+(.+)$/);
    if (!match)
        return null;
    const username = sanitizeMentionUsername(match[1]);
    const message = sanitizeRoomMessageText(match[2]);
    if (!username || !message)
        return null;
    return {
        username,
        text: message,
    };
}
/*
  تاب الغرف.
*/
function sanitizeRoomListType(value) {
    const tab = cleanText(value).toLowerCase();
    if (tab === "active" ||
        tab === "favorite" ||
        tab === "public" ||
        tab === "voice") {
        return tab;
    }
    return "public";
}
/*
  نوع رسالة المستخدم.
*/
function sanitizeRoomUserMessageType(value) {
    const type = cleanText(value).toLowerCase();
    if (type === "text" || type === "image" || type === "gif" || type === "video" ||
        type === "audio" ||
        type === "voice") {
        return type;
    }
    return "text";
}
/*
  نوع الرسالة اللايف العام.
*/
function sanitizeRoomLiveMessageType(value) {
    const type = cleanText(value).toLowerCase();
    if (type === "text" ||
        type === "image" ||
        type === "gif" ||
        type === "video" ||
        type === "audio" ||
        type === "voice" ||
        type === "gift" ||
        type === "none") {
        return type;
    }
    return "none";
}
/*
  تنظيف ID عام.
*/
function sanitizeId(value) {
    return cleanText(value);
}
function sanitizeRoomId(value) {
    return cleanText(value);
}
function sanitizeUserId(value) {
    return cleanText(value);
}
/*
  الإيموجي للرياكشن.
  نخليه قصير حتى لا يدخل نص كبير.
*/
function sanitizeReactionEmoji(value) {
    return cleanText(value).slice(0, 12);
}
/*
  قراءة رقم آمن.
*/
function sanitizePositiveNumber(value, fallback = 0) {
    const num = Number(value);
    if (!Number.isFinite(num))
        return fallback;
    if (num < 0)
        return fallback;
    return num;
}
/*
  حجم ملف الميديا.
*/
function sanitizeSizeBytes(value) {
    return sanitizePositiveNumber(value, 0);
}
/*
  تنظيف media object القادم من Flutter.
*/
function sanitizeRoomMedia(value) {
    if (!value || typeof value !== "object")
        return null;
    const url = cleanText(value.url);
    if (!url)
        return null;
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
function sanitizeRoomReply(value) {
    if (!value || typeof value !== "object")
        return null;
    const messageId = cleanText(value.messageId || value.message_id);
    const fromUserId = cleanText(value.fromUserId || value.from_user_id);
    if (!messageId || !fromUserId)
        return null;
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
function sanitizeRoomGift(value) {
    if (!value || typeof value !== "object")
        return null;
    const key = limitText(value.key, 80);
    const name = limitText(value.name, 80);
    const rawAnimationType = cleanText(value.animationType || value.animation_type);
    let animationType = "gif";
    if (rawAnimationType === "video" ||
        rawAnimationType === "gif" ||
        rawAnimationType === "lottie") {
        animationType = rawAnimationType;
    }
    const animationUrl = cleanText(value.animationUrl || value.animation_url);
    if (!key || !name || !animationUrl)
        return null;
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
function sanitizeRoomEntryVideo(value) {
    if (!value || typeof value !== "object")
        return null;
    const videoUrl = cleanText(value.videoUrl || value.video_url);
    if (!videoUrl)
        return null;
    return {
        videoUrl,
        thumbnailUrl: cleanText(value.thumbnailUrl || value.thumbnail_url),
        durationMs: sanitizePositiveNumber(value.durationMs || value.duration_ms, 0),
    };
}
/*
  تحويل أي قيمة Boolean بأمان.
*/
function readBool(value) {
    if (value === true)
        return true;
    if (value === false)
        return false;
    const text = cleanText(value).toLowerCase();
    return text === "true" || text === "1" || text === "yes";
}
//# sourceMappingURL=room.sanitize.js.map