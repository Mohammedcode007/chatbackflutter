"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendRoomLiveMessageService = sendRoomLiveMessageService;
exports.makeRoomSystemMessage = makeRoomSystemMessage;
exports.incrementRoomGiftStats = incrementRoomGiftStats;
exports.makeRoomGiftMessage = makeRoomGiftMessage;
exports.makeRoomEntryVideoMessage = makeRoomEntryVideoMessage;
exports.makeRoomReactionEvent = makeRoomReactionEvent;
const Room_model_1 = require("../models/Room.model");
const User_model_1 = require("../../../models/User.model");
const cloudinary_1 = require("cloudinary");
const room_role_service_1 = require("./room-role.service");
const room_ids_1 = require("../utils/room.ids");
const room_sanitize_1 = require("../utils/room.sanitize");
function clean(value) {
    return String(value || "").trim();
}
function nowIso() {
    return new Date().toISOString();
}
function isBase64Media(value) {
    const text = clean(value);
    return text.startsWith("data:") && text.includes(";base64,");
}
function cloudinaryResourceType(type) {
    const cleanType = clean(type).toLowerCase();
    if (cleanType === "audio" || cleanType === "voice" || cleanType === "video") {
        return "video";
    }
    return "image";
}
async function uploadRoomMediaBase64ToCloudinary(input) {
    const roomId = (0, room_sanitize_1.sanitizeRoomId)(input.roomId);
    const type = clean(input.type).toLowerCase();
    const mediaBase64 = clean(input.mediaBase64);
    if (!roomId || !type || !isBase64Media(mediaBase64)) {
        return null;
    }
    const result = await cloudinary_1.v2.uploader.upload(mediaBase64, {
        folder: `bimo/rooms/${roomId}`,
        resource_type: cloudinaryResourceType(type),
    });
    return {
        url: result.secure_url,
        publicId: result.public_id,
        fileName: clean(input.fileName),
        mimeType: clean(input.mimeType),
        sizeBytes: Number(input.sizeBytes || 0),
        duration: clean(input.duration),
    };
}
/*
  هذا الملف لا يحفظ رسائل الغرفة.
  كل الرسائل Live فقط وترسل من الـ handler عن طريق socket broadcast.
*/
/*
  إرسال رسالة مستخدم داخل الغرفة.
  يدعم:
  - text
  - image
  - gif
  - video
  - reply
  - mention: @username msg
*/
async function incrementGiftStatsFromRoomMessage(input) {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🎁 [ROOM_GIFT_STATS_FROM_MESSAGE_START]");
    console.log("📥 raw input:", JSON.stringify(input, null, 2));
    const fromUserId = (0, room_sanitize_1.sanitizeUserId)(input.fromUserId);
    let targetUserId = (0, room_sanitize_1.sanitizeUserId)(input.targetUserId);
    const targetUsername = clean(input.targetUsername);
    const text = clean(input.text);
    console.log("👤 fromUserId:", fromUserId);
    console.log("🎯 targetUserId before username lookup:", targetUserId);
    console.log("🎯 targetUsername:", targetUsername);
    console.log("💬 text:", text);
    if (!fromUserId) {
        console.log("❌ [ROOM_GIFT_STATS_ERROR] missing fromUserId");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        return {
            ok: false,
            reason: "missing_from_user_id",
        };
    }
    /*
      لو targetUserId غير موجود، نحاول نجيبه من username
    */
    if (!targetUserId && targetUsername) {
        const targetUser = await User_model_1.UserModel.findOne({
            username: targetUsername.toLowerCase(),
        })
            .select("userId username stats")
            .lean();
        console.log("🔎 target user by username:", JSON.stringify(targetUser, null, 2));
        if (targetUser) {
            targetUserId = String(targetUser.userId || "");
        }
    }
    const userIds = [fromUserId, targetUserId].filter(Boolean);
    const beforeUsers = await User_model_1.UserModel.find({
        userId: {
            $in: userIds,
        },
    })
        .select("userId username stats")
        .lean();
    console.log("👀 users before gift stats:", JSON.stringify(beforeUsers, null, 2));
    const operations = [
        {
            updateOne: {
                filter: {
                    userId: fromUserId,
                },
                update: {
                    $inc: {
                        "stats.giftsSentCount": 1,
                    },
                },
            },
        },
    ];
    if (targetUserId) {
        operations.push({
            updateOne: {
                filter: {
                    userId: targetUserId,
                },
                update: {
                    $inc: {
                        "stats.giftsReceivedCount": 1,
                    },
                },
            },
        });
    }
    else {
        console.log("⚠️ [ROOM_GIFT_STATS_WARNING] no targetUserId, received count will not increase");
    }
    console.log("🧾 gift stats operations:", JSON.stringify(operations, null, 2));
    try {
        const result = await User_model_1.UserModel.bulkWrite(operations, {
            ordered: false,
        });
        console.log("✅ [ROOM_GIFT_STATS_RESULT]");
        console.log("matchedCount:", result.matchedCount);
        console.log("modifiedCount:", result.modifiedCount);
        const afterUsers = await User_model_1.UserModel.find({
            userId: {
                $in: userIds,
            },
        })
            .select("userId username stats")
            .lean();
        console.log("👀 users after gift stats:", JSON.stringify(afterUsers, null, 2));
        console.log("✅ [ROOM_GIFT_STATS_FROM_MESSAGE_DONE]");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        return {
            ok: true,
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
            fromUserId,
            targetUserId,
        };
    }
    catch (error) {
        console.log("❌ [ROOM_GIFT_STATS_EXCEPTION]");
        console.log("message:", error?.message);
        console.log("stack:", error?.stack);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        return {
            ok: false,
            reason: "gift_stats_update_failed",
            error: error?.message,
        };
    }
}
async function sendRoomLiveMessageService(input) {
    const userId = (0, room_sanitize_1.sanitizeUserId)(input.userId);
    const roomId = (0, room_sanitize_1.sanitizeRoomId)(input.roomId);
    const type = (0, room_sanitize_1.sanitizeRoomUserMessageType)(input.type);
    const text = (0, room_sanitize_1.sanitizeRoomMessageText)(input.text);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("===== SEND_ROOM_LIVE_MESSAGE_SERVICE_START =====");
    console.log("[SEND_ROOM_LIVE_MESSAGE_SERVICE] raw input:", JSON.stringify(input, null, 2));
    console.log("[SEND_ROOM_LIVE_MESSAGE_SERVICE] sanitized:", {
        userId,
        roomId,
        type,
        text,
    });
    if (!userId || !roomId) {
        console.log("❌ [SEND_ROOM_LIVE_MESSAGE_SERVICE] invalid_message_payload");
        console.log("===== SEND_ROOM_LIVE_MESSAGE_SERVICE_END =====");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        return {
            ok: false,
            reason: "invalid_message_payload",
        };
    }
    const room = await Room_model_1.RoomModel.findOne({ roomId }).lean();
    if (!room) {
        console.log("❌ [SEND_ROOM_LIVE_MESSAGE_SERVICE] room_not_found:", roomId);
        console.log("===== SEND_ROOM_LIVE_MESSAGE_SERVICE_END =====");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        return {
            ok: false,
            reason: "room_not_found",
        };
    }
    if (Array.isArray(room.bannedUsers) && room.bannedUsers.includes(userId)) {
        console.log("❌ [SEND_ROOM_LIVE_MESSAGE_SERVICE] user_banned_from_room:", {
            roomId,
            userId,
        });
        console.log("===== SEND_ROOM_LIVE_MESSAGE_SERVICE_END =====");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        return {
            ok: false,
            reason: "user_banned_from_room",
        };
    }
    const role = (0, room_role_service_1.getRoomRole)(room, userId);
    console.log("[SEND_ROOM_LIVE_MESSAGE_SERVICE] user role:", role);
    if (room.isLockedForNone && role === "none") {
        console.log("❌ [SEND_ROOM_LIVE_MESSAGE_SERVICE] room_locked_for_members_only:", {
            roomId,
            userId,
            role,
        });
        console.log("===== SEND_ROOM_LIVE_MESSAGE_SERVICE_END =====");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        return {
            ok: false,
            reason: "room_locked_for_members_only",
        };
    }
    let media = (0, room_sanitize_1.sanitizeRoomMedia)(input.media);
    const hasBase64Media = isBase64Media(input.mediaBase64);
    console.log("[SEND_ROOM_LIVE_MESSAGE_SERVICE] media before upload:", JSON.stringify(media, null, 2));
    console.log("[SEND_ROOM_LIVE_MESSAGE_SERVICE] hasBase64Media:", hasBase64Media);
    if (!media && hasBase64Media) {
        media = await uploadRoomMediaBase64ToCloudinary({
            roomId,
            type,
            mediaBase64: clean(input.mediaBase64),
            fileName: input.fileName,
            mimeType: input.mimeType,
            sizeBytes: input.sizeBytes,
            duration: input.duration,
        });
        console.log("[SEND_ROOM_LIVE_MESSAGE_SERVICE] media after upload:", JSON.stringify(media, null, 2));
    }
    const replyTo = (0, room_sanitize_1.sanitizeRoomReply)(input.replyTo);
    if (type === "text" && !text) {
        console.log("❌ [SEND_ROOM_LIVE_MESSAGE_SERVICE] empty_message");
        console.log("===== SEND_ROOM_LIVE_MESSAGE_SERVICE_END =====");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        return {
            ok: false,
            reason: "empty_message",
        };
    }
    if ((type === "image" ||
        type === "gif" ||
        type === "video" ||
        type === "audio" ||
        type === "voice") &&
        !media) {
        console.log("❌ [SEND_ROOM_LIVE_MESSAGE_SERVICE] missing_media:", {
            type,
            media,
        });
        console.log("===== SEND_ROOM_LIVE_MESSAGE_SERVICE_END =====");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        return {
            ok: false,
            reason: "missing_media",
        };
    }
    /*
      @username msg
      لو النص يبدأ بمنشن، نرجع mentionDm للـ handler.
      الـ handler هو الذي يرسل DM باستخدام dm.service.
    */
    const parsedMention = type === "text" ? (0, room_sanitize_1.parseRoomMention)(text) : null;
    let mention = null;
    let mentionDm = null;
    if (parsedMention) {
        const targetUser = await User_model_1.UserModel.findOne({
            username: parsedMention.username,
        })
            .select("userId username")
            .lean();
        if (targetUser) {
            mention = {
                username: parsedMention.username,
                userId: String(targetUser.userId || ""),
                text: parsedMention.text,
            };
            mentionDm = {
                toUserId: String(targetUser.userId || ""),
                username: parsedMention.username,
                text: parsedMention.text,
            };
        }
        else {
            mention = {
                username: parsedMention.username,
                userId: "",
                text: parsedMention.text,
            };
        }
    }
    /*
      بيانات البادج الخاصة بمرسل الرسالة.
      هذه البيانات ستصل للفرونت داخل الرسالة حتى تظهر بجانب الاسم.
    */
    const senderUser = await User_model_1.UserModel.findOne({ userId })
        .select([
        "accountColor",
        "badgeKey",
        "badgeName",
        "badgeValue",
        "badgeImageKey",
        "badgeImageName",
        "badgeImageUrl",
        "badgeLottieKey",
        "badgeLottieName",
        "badgeLottieUrl",
        "verificationType",
    ].join(" "))
        .lean();
    const accountColor = clean(senderUser?.accountColor);
    const badgeKey = clean(senderUser?.badgeKey);
    const badgeName = clean(senderUser?.badgeName);
    const badgeValue = clean(senderUser?.badgeValue);
    const badgeImageKey = clean(senderUser?.badgeImageKey);
    const badgeImageName = clean(senderUser?.badgeImageName);
    const badgeImageUrl = clean(senderUser?.badgeImageUrl);
    const badgeLottieKey = clean(senderUser?.badgeLottieKey);
    const badgeLottieName = clean(senderUser?.badgeLottieName);
    const badgeLottieUrl = clean(senderUser?.badgeLottieUrl);
    const verificationType = clean(senderUser?.verificationType);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🏷️ [ROOM_MESSAGE_SENDER_BADGES]");
    console.log("userId:", userId);
    console.log("accountColor:", accountColor);
    console.log("badgeKey:", badgeKey);
    console.log("badgeName:", badgeName);
    console.log("badgeValue:", badgeValue);
    console.log("badgeImageKey:", badgeImageKey);
    console.log("badgeImageName:", badgeImageName);
    console.log("badgeImageUrl:", badgeImageUrl);
    console.log("badgeLottieKey:", badgeLottieKey);
    console.log("badgeLottieName:", badgeLottieName);
    console.log("badgeLottieUrl:", badgeLottieUrl);
    console.log("verificationType:", verificationType);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const message = {
        messageId: (0, room_ids_1.makeRoomMessageId)(),
        roomId,
        messageKind: "user",
        type,
        fromUserId: userId,
        fromUsername: clean(input.username),
        fromPhotoUrl: clean(input.photoUrl),
        fromRole: role,
        /*
          أسماء fromBadge* للفرونت الجديد
        */
        fromBadgeValue: badgeValue,
        fromBadgeImageUrl: badgeImageUrl,
        fromBadgeLottieUrl: badgeLottieUrl,
        /*
          أسماء badge* للتوافق مع أي موديل قديم أو قراءة مباشرة
        */
        accountColor,
        badgeKey,
        badgeName,
        badgeValue,
        badgeImageKey,
        badgeImageName,
        badgeImageUrl,
        badgeLottieKey,
        badgeLottieName,
        badgeLottieUrl,
        verificationType,
        text,
        media: media,
        mention,
        gift: null,
        entryVideo: null,
        replyTo: replyTo,
        reactions: [],
        system: null,
        createdAt: nowIso(),
    };
    /*
      كشف الهدية:
      الهدية عندك حاليًا تصل كرسالة فيديو عادية:
      type: "video"
      text: "lina sent Blue Car to lina"
      media.fileName: "blue_car.mp4"
  
      لذلك نعتبرها هدية إذا:
      - input.isGift === true
      - أو giftKey موجود
      - أو اسم الملف blue_car
      - أو النص يحتوي sent / gift / to
    */
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🎁 [ROOM_MESSAGE_GIFT_CHECK]");
    console.log("type:", type);
    console.log("text:", text);
    console.log("input.isGift:", input.isGift);
    console.log("input.giftKey:", input.giftKey);
    console.log("input.targetUserId:", input.targetUserId);
    console.log("input.targetUsername:", input.targetUsername);
    console.log("media:", JSON.stringify(media || null, null, 2));
    const mediaFileName = clean(media?.fileName).toLowerCase();
    const giftKey = clean(input.giftKey).toLowerCase();
    const lowerText = text.toLowerCase();
    const isGiftVideoMessage = input.isGift === true ||
        !!giftKey ||
        (type === "video" &&
            !!media &&
            (mediaFileName.includes("blue_car") ||
                lowerText.includes(" sent ") ||
                lowerText.includes(" gift ") ||
                lowerText.includes(" to ")));
    console.log("🎁 [ROOM_MESSAGE_IS_GIFT_VIDEO]:", isGiftVideoMessage);
    let giftStatsResult = null;
    if (isGiftVideoMessage) {
        let targetUserId = (0, room_sanitize_1.sanitizeUserId)(input.targetUserId);
        let targetUsername = clean(input.targetUsername);
        /*
          لو الفرونت لم يرسل targetUsername
          نحاول استخراجه من النص:
          lina sent Blue Car to lina
        */
        if (!targetUsername && text.includes(" to ")) {
            const parts = text.split(" to ");
            targetUsername = clean(parts[parts.length - 1]);
        }
        console.log("🎁 [ROOM_MESSAGE_GIFT_TARGET]");
        console.log("targetUserId:", targetUserId);
        console.log("targetUsername:", targetUsername);
        giftStatsResult = await incrementGiftStatsFromRoomMessage({
            fromUserId: userId,
            targetUserId,
            targetUsername,
            text,
        });
        console.log("📊 [ROOM_MESSAGE_GIFT_STATS_RESULT]:", JSON.stringify(giftStatsResult, null, 2));
    }
    console.log("[SEND_ROOM_LIVE_MESSAGE_SERVICE] final message:", JSON.stringify(message, null, 2));
    console.log("===== SEND_ROOM_LIVE_MESSAGE_SERVICE_DONE =====");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    return {
        ok: true,
        room,
        role,
        message,
        mention,
        mentionDm,
        giftStatsResult,
    };
}
// export async function sendRoomLiveMessageService(input: {
//   userId: string;
//   username?: string;
//   photoUrl?: string;
//   roomId: string;
//   type: RoomUserMessageType;
//   text?: string;
//   media?: any;
//   mediaBase64?: string;
//   fileName?: string;
//   mimeType?: string;
//   sizeBytes?: number;
//   duration?: string;
//   replyTo?: any;
//   /*
//     بيانات الهدية لو جاية من الفرونت
//   */
//   isGift?: boolean;
//   giftKey?: string;
//   targetUserId?: string;
//   targetUsername?: string;
// }) {
//   const userId = sanitizeUserId(input.userId);
//   const roomId = sanitizeRoomId(input.roomId);
//   const type = sanitizeRoomUserMessageType(input.type);
//   const text = sanitizeRoomMessageText(input.text);
//   console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
//   console.log("===== SEND_ROOM_LIVE_MESSAGE_SERVICE_START =====");
//   console.log("[SEND_ROOM_LIVE_MESSAGE_SERVICE] raw input:", JSON.stringify(input, null, 2));
//   console.log("[SEND_ROOM_LIVE_MESSAGE_SERVICE] sanitized:", {
//     userId,
//     roomId,
//     type,
//     text,
//   });
//   if (!userId || !roomId) {
//     console.log("❌ [SEND_ROOM_LIVE_MESSAGE_SERVICE] invalid_message_payload");
//     console.log("===== SEND_ROOM_LIVE_MESSAGE_SERVICE_END =====");
//     console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
//     return {
//       ok: false as const,
//       reason: "invalid_message_payload",
//     };
//   }
//   const room = await RoomModel.findOne({ roomId }).lean();
//   if (!room) {
//     console.log("❌ [SEND_ROOM_LIVE_MESSAGE_SERVICE] room_not_found:", roomId);
//     console.log("===== SEND_ROOM_LIVE_MESSAGE_SERVICE_END =====");
//     console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
//     return {
//       ok: false as const,
//       reason: "room_not_found",
//     };
//   }
//   if (Array.isArray(room.bannedUsers) && room.bannedUsers.includes(userId)) {
//     console.log("❌ [SEND_ROOM_LIVE_MESSAGE_SERVICE] user_banned_from_room:", {
//       roomId,
//       userId,
//     });
//     console.log("===== SEND_ROOM_LIVE_MESSAGE_SERVICE_END =====");
//     console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
//     return {
//       ok: false as const,
//       reason: "user_banned_from_room",
//     };
//   }
//   const role = getRoomRole(room, userId);
//   console.log("[SEND_ROOM_LIVE_MESSAGE_SERVICE] user role:", role);
//   if (room.isLockedForNone && role === "none") {
//     console.log("❌ [SEND_ROOM_LIVE_MESSAGE_SERVICE] room_locked_for_members_only:", {
//       roomId,
//       userId,
//       role,
//     });
//     console.log("===== SEND_ROOM_LIVE_MESSAGE_SERVICE_END =====");
//     console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
//     return {
//       ok: false as const,
//       reason: "room_locked_for_members_only",
//     };
//   }
//   let media = sanitizeRoomMedia(input.media);
//   const hasBase64Media = isBase64Media(input.mediaBase64);
//   console.log("[SEND_ROOM_LIVE_MESSAGE_SERVICE] media before upload:", JSON.stringify(media, null, 2));
//   console.log("[SEND_ROOM_LIVE_MESSAGE_SERVICE] hasBase64Media:", hasBase64Media);
//   if (!media && hasBase64Media) {
//     media = await uploadRoomMediaBase64ToCloudinary({
//       roomId,
//       type,
//       mediaBase64: clean(input.mediaBase64),
//       fileName: input.fileName,
//       mimeType: input.mimeType,
//       sizeBytes: input.sizeBytes,
//       duration: input.duration,
//     });
//     console.log("[SEND_ROOM_LIVE_MESSAGE_SERVICE] media after upload:", JSON.stringify(media, null, 2));
//   }
//   const replyTo = sanitizeRoomReply(input.replyTo);
//   if (type === "text" && !text) {
//     console.log("❌ [SEND_ROOM_LIVE_MESSAGE_SERVICE] empty_message");
//     console.log("===== SEND_ROOM_LIVE_MESSAGE_SERVICE_END =====");
//     console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
//     return {
//       ok: false as const,
//       reason: "empty_message",
//     };
//   }
//   if (
//     (type === "image" ||
//       type === "gif" ||
//       type === "video" ||
//       type === "audio" ||
//       type === "voice") &&
//     !media
//   ) {
//     console.log("❌ [SEND_ROOM_LIVE_MESSAGE_SERVICE] missing_media:", {
//       type,
//       media,
//     });
//     console.log("===== SEND_ROOM_LIVE_MESSAGE_SERVICE_END =====");
//     console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
//     return {
//       ok: false as const,
//       reason: "missing_media",
//     };
//   }
//   /*
//     @username msg
//     لو النص يبدأ بمنشن، نرجع mentionDm للـ handler.
//     الـ handler هو الذي يرسل DM باستخدام dm.service.
//   */
//   const parsedMention = type === "text" ? parseRoomMention(text) : null;
//   let mention:
//     | {
//         username: string;
//         userId: string;
//         text: string;
//       }
//     | null = null;
//   let mentionDm:
//     | {
//         toUserId: string;
//         username: string;
//         text: string;
//       }
//     | null = null;
//   if (parsedMention) {
//     const targetUser = await UserModel.findOne({
//       username: parsedMention.username,
//     })
//       .select("userId username")
//       .lean();
//     if (targetUser) {
//       mention = {
//         username: parsedMention.username,
//         userId: String((targetUser as any).userId || ""),
//         text: parsedMention.text,
//       };
//       mentionDm = {
//         toUserId: String((targetUser as any).userId || ""),
//         username: parsedMention.username,
//         text: parsedMention.text,
//       };
//     } else {
//       mention = {
//         username: parsedMention.username,
//         userId: "",
//         text: parsedMention.text,
//       };
//     }
//   }
//   const message: RoomLiveMessage = {
//     messageId: makeRoomMessageId(),
//     roomId,
//     messageKind: "user",
//     type,
//     fromUserId: userId,
//     fromUsername: clean(input.username),
//     fromPhotoUrl: clean(input.photoUrl),
//     fromRole: role,
//     text,
//     media: media as RoomLiveMedia | null,
//     mention,
//     gift: null,
//     entryVideo: null,
//     replyTo: replyTo as RoomReplyPayload | null,
//     reactions: [],
//     system: null,
//     createdAt: nowIso(),
//   };
//   /*
//     كشف الهدية:
//     الهدية عندك حاليًا تصل كرسالة فيديو عادية:
//     type: "video"
//     text: "lina sent Blue Car to lina"
//     media.fileName: "blue_car.mp4"
//     لذلك نعتبرها هدية إذا:
//     - input.isGift === true
//     - أو giftKey موجود
//     - أو اسم الملف blue_car
//     - أو النص يحتوي sent / gift / to
//   */
//   console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
//   console.log("🎁 [ROOM_MESSAGE_GIFT_CHECK]");
//   console.log("type:", type);
//   console.log("text:", text);
//   console.log("input.isGift:", input.isGift);
//   console.log("input.giftKey:", input.giftKey);
//   console.log("input.targetUserId:", input.targetUserId);
//   console.log("input.targetUsername:", input.targetUsername);
//   console.log("media:", JSON.stringify(media || null, null, 2));
//   const mediaFileName = clean((media as any)?.fileName).toLowerCase();
//   const giftKey = clean(input.giftKey).toLowerCase();
//   const lowerText = text.toLowerCase();
//   const isGiftVideoMessage =
//     input.isGift === true ||
//     !!giftKey ||
//     (
//       type === "video" &&
//       !!media &&
//       (
//         mediaFileName.includes("blue_car") ||
//         lowerText.includes(" sent ") ||
//         lowerText.includes(" gift ") ||
//         lowerText.includes(" to ")
//       )
//     );
//   console.log("🎁 [ROOM_MESSAGE_IS_GIFT_VIDEO]:", isGiftVideoMessage);
//   let giftStatsResult: any = null;
//   if (isGiftVideoMessage) {
//     let targetUserId = sanitizeUserId(input.targetUserId);
//     let targetUsername = clean(input.targetUsername);
//     /*
//       لو الفرونت لم يرسل targetUsername
//       نحاول استخراجه من النص:
//       lina sent Blue Car to lina
//     */
//     if (!targetUsername && text.includes(" to ")) {
//       const parts = text.split(" to ");
//       targetUsername = clean(parts[parts.length - 1]);
//     }
//     console.log("🎁 [ROOM_MESSAGE_GIFT_TARGET]");
//     console.log("targetUserId:", targetUserId);
//     console.log("targetUsername:", targetUsername);
//     giftStatsResult = await incrementGiftStatsFromRoomMessage({
//       fromUserId: userId,
//       targetUserId,
//       targetUsername,
//       text,
//     });
//     console.log(
//       "📊 [ROOM_MESSAGE_GIFT_STATS_RESULT]:",
//       JSON.stringify(giftStatsResult, null, 2)
//     );
//   }
//   console.log("[SEND_ROOM_LIVE_MESSAGE_SERVICE] final message:", JSON.stringify(message, null, 2));
//   console.log("===== SEND_ROOM_LIVE_MESSAGE_SERVICE_DONE =====");
//   console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
//   return {
//     ok: true as const,
//     room,
//     role,
//     message,
//     mention,
//     mentionDm,
//     giftStatsResult,
//   };
// }
/*
  رسالة نظام Live فقط.
  تستخدمها في:
  - تغيير دور
  - حظر
  - قفل غرفة
  - تغيير باسورد
  - تغيير الرسالة المثبتة
  - دخول / خروج
  - رجوع بعد disconnect
*/
function makeRoomSystemMessage(input) {
    const text = clean(input.text) ||
        buildRoomSystemText({
            action: input.action,
            actorUsername: input.actorUsername,
            targetUsername: input.targetUsername,
            oldRole: input.oldRole,
            newRole: input.newRole,
            dc: input.dc,
        });
    return {
        messageId: (0, room_ids_1.makeRoomSystemMessageId)(),
        roomId: (0, room_sanitize_1.sanitizeRoomId)(input.roomId),
        messageKind: "system",
        type: "none",
        fromUserId: "",
        fromUsername: "",
        fromPhotoUrl: "",
        fromRole: "none",
        text,
        media: null,
        mention: null,
        gift: null,
        entryVideo: null,
        replyTo: null,
        reactions: [],
        system: {
            action: input.action,
            actorId: clean(input.actorId),
            actorUsername: clean(input.actorUsername),
            targetUserId: clean(input.targetUserId),
            targetUsername: clean(input.targetUsername),
            oldRole: input.oldRole,
            newRole: input.newRole,
            dc: input.dc === true,
        },
        createdAt: nowIso(),
    };
}
function buildRoomSystemText(input) {
    const actor = clean(input.actorUsername) || "Someone";
    const target = clean(input.targetUsername) || "Someone";
    if (input.action === "role_changed") {
        return `${actor} gave ${target} the ${input.newRole || ""} role`;
    }
    if (input.action === "role_removed") {
        return `${actor} removed ${target}'s role`;
    }
    if (input.action === "user_banned") {
        return `${actor} banned ${target}`;
    }
    if (input.action === "ip_banned") {
        return `${actor} banned ${target}'s IP`;
    }
    if (input.action === "room_locked") {
        return `${actor} locked the room for members only`;
    }
    if (input.action === "room_unlocked") {
        return `${actor} opened the room for everyone`;
    }
    if (input.action === "password_changed") {
        return `${actor} changed the room password`;
    }
    if (input.action === "password_removed") {
        return `${actor} removed the room password`;
    }
    if (input.action === "pinned_changed") {
        return `${actor} changed the pinned message`;
    }
    if (input.action === "join") {
        return `${target} joined the room`;
    }
    if (input.action === "leave") {
        return `${target} left the room`;
    }
    if (input.action === "reconnect_join") {
        return `${target} rejoined the room after disconnecting`;
    }
    if (input.action === "gift_sent") {
        return `${actor} sent a gift to ${target}`;
    }
    if (input.action === "boost_added") {
        return `${actor} boosted the room`;
    }
    return "Room update";
}
// function buildRoomSystemText(input: {
//   action: string;
//   actorUsername?: string;
//   targetUsername?: string;
//   oldRole?: string;
//   newRole?: string;
//   dc?: boolean;
// }) {
//   const actor = clean(input.actorUsername) || "Someone";
//   const target = clean(input.targetUsername) || "Someone";
//   if (input.action === "role_changed") {
//     return `${actor} أعطى ${target} رتبة ${input.newRole || ""}`;
//   }
//   if (input.action === "role_removed") {
//     return `${actor} أزال رتبة ${target}`;
//   }
//   if (input.action === "user_banned") {
//     return `${actor} حظر ${target}`;
//   }
//   if (input.action === "ip_banned") {
//     return `${actor} حظر IP الخاص بـ ${target}`;
//   }
//   if (input.action === "room_locked") {
//     return `${actor} قفل الغرفة للأعضاء فقط`;
//   }
//   if (input.action === "room_unlocked") {
//     return `${actor} فتح الغرفة للجميع`;
//   }
//   if (input.action === "password_changed") {
//     return `${actor} غيّر باسورد الغرفة`;
//   }
//   if (input.action === "password_removed") {
//     return `${actor} حذف باسورد الغرفة`;
//   }
//   if (input.action === "pinned_changed") {
//     return `${actor} غيّر الرسالة المثبتة`;
//   }
//   if (input.action === "join") {
//     return `${target} دخل الغرفة`;
//   }
//   if (input.action === "leave") {
//     return `${target} خرج من الغرفة`;
//   }
//   if (input.action === "reconnect_join") {
//     return `${target} عاد للغرفة بعد DC`;
//   }
//   if (input.action === "gift_sent") {
//     return `${actor} أرسل هدية إلى ${target}`;
//   }
//   if (input.action === "boost_added") {
//     return `${actor} عمل Boost للغرفة`;
//   }
//   return "Room update";
// }
/*
  رسالة هدية Live فقط.
  الهدية ممكن تكون فيديو / gif / lottie.
*/
async function incrementRoomGiftStats(input) {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🎁 [GIFT_STATS_START]");
    console.log("📥 input:", JSON.stringify(input, null, 2));
    const fromUserId = (0, room_sanitize_1.sanitizeUserId)(input.fromUserId);
    const targetUserId = (0, room_sanitize_1.sanitizeUserId)(input.targetUserId);
    console.log("🧼 sanitized fromUserId:", fromUserId);
    console.log("🧼 sanitized targetUserId:", targetUserId);
    if (!fromUserId) {
        console.log("❌ [GIFT_STATS_ERROR] missing fromUserId");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        return {
            ok: false,
            reason: "missing_from_user_id",
        };
    }
    const operations = [];
    operations.push({
        updateOne: {
            filter: {
                userId: fromUserId,
            },
            update: {
                $inc: {
                    "stats.giftsSentCount": 1,
                },
            },
        },
    });
    if (targetUserId) {
        operations.push({
            updateOne: {
                filter: {
                    userId: targetUserId,
                },
                update: {
                    $inc: {
                        "stats.giftsReceivedCount": 1,
                    },
                },
            },
        });
    }
    else {
        console.log("⚠️ [GIFT_STATS_WARNING] no targetUserId, received count will not increase");
    }
    console.log("🧾 bulk operations:", JSON.stringify(operations, null, 2));
    try {
        const beforeUsers = await User_model_1.UserModel.find({
            userId: {
                $in: [fromUserId, targetUserId].filter(Boolean),
            },
        })
            .select("userId username stats")
            .lean();
        console.log("👀 users before update:", JSON.stringify(beforeUsers, null, 2));
        const result = await User_model_1.UserModel.bulkWrite(operations, {
            ordered: false,
        });
        console.log("✅ [GIFT_STATS_BULK_RESULT]");
        console.log("matchedCount:", result.matchedCount);
        console.log("modifiedCount:", result.modifiedCount);
        console.log("upsertedCount:", result.upsertedCount);
        const afterUsers = await User_model_1.UserModel.find({
            userId: {
                $in: [fromUserId, targetUserId].filter(Boolean),
            },
        })
            .select("userId username stats")
            .lean();
        console.log("👀 users after update:", JSON.stringify(afterUsers, null, 2));
        console.log("✅ [GIFT_STATS_DONE]");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        return {
            ok: true,
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
        };
    }
    catch (error) {
        console.log("❌ [GIFT_STATS_EXCEPTION]");
        console.log("message:", error?.message);
        console.log("stack:", error?.stack);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        return {
            ok: false,
            reason: "gift_stats_update_failed",
            error: error?.message,
        };
    }
}
async function makeRoomGiftMessage(input) {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🎁 [MAKE_ROOM_GIFT_MESSAGE_START]");
    console.log("📥 raw input:", JSON.stringify(input, null, 2));
    const gift = (0, room_sanitize_1.sanitizeRoomGift)(input.gift);
    console.log("🎁 sanitized gift:", JSON.stringify(gift, null, 2));
    if (!gift) {
        console.log("❌ [MAKE_ROOM_GIFT_MESSAGE_ERROR] invalid gift");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        return {
            ok: false,
            reason: "invalid_gift",
        };
    }
    const fromUsername = clean(input.fromUsername);
    const targetUsername = clean(input.targetUsername);
    const fromUserId = (0, room_sanitize_1.sanitizeUserId)(input.fromUserId);
    const targetUserId = (0, room_sanitize_1.sanitizeUserId)(input.targetUserId);
    console.log("👤 fromUserId:", fromUserId);
    console.log("👤 fromUsername:", fromUsername);
    console.log("🎯 targetUserId:", targetUserId);
    console.log("🎯 targetUsername:", targetUsername);
    const message = {
        messageId: (0, room_ids_1.makeRoomGiftMessageId)(),
        roomId: (0, room_sanitize_1.sanitizeRoomId)(input.roomId),
        messageKind: "gift",
        type: "gift",
        fromUserId,
        fromUsername,
        fromPhotoUrl: clean(input.fromPhotoUrl),
        fromRole: input.fromRole || "none",
        text: targetUsername
            ? `${fromUsername} أرسل هدية إلى ${targetUsername}`
            : `${fromUsername} أرسل هدية`,
        media: null,
        mention: null,
        gift,
        entryVideo: null,
        replyTo: null,
        reactions: [],
        system: {
            action: "gift_sent",
            actorId: fromUserId,
            actorUsername: fromUsername,
            targetUserId,
            targetUsername,
            dc: false,
        },
        createdAt: nowIso(),
    };
    console.log("📦 gift message created:", JSON.stringify(message, null, 2));
    const statsResult = await incrementRoomGiftStats({
        fromUserId,
        targetUserId,
    });
    console.log("📊 [GIFT_STATS_RESULT]:", JSON.stringify(statsResult, null, 2));
    console.log("✅ [MAKE_ROOM_GIFT_MESSAGE_DONE]");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    return {
        ok: true,
        message,
        statsResult,
    };
}
/*
  رسالة فيديو دخول المستخدم.
  Live فقط.
*/
function makeRoomEntryVideoMessage(input) {
    const videoUrl = clean(input.entryVideo?.videoUrl);
    if (!videoUrl) {
        return {
            ok: false,
            reason: "missing_entry_video",
        };
    }
    const username = clean(input.username);
    const message = {
        messageId: (0, room_ids_1.makeRoomEntryVideoMessageId)(),
        roomId: (0, room_sanitize_1.sanitizeRoomId)(input.roomId),
        messageKind: "entry_video",
        type: "video",
        fromUserId: (0, room_sanitize_1.sanitizeUserId)(input.userId),
        fromUsername: username,
        fromPhotoUrl: clean(input.photoUrl),
        fromRole: input.fromRole || "none",
        text: `${username} دخل الغرفة`,
        media: null,
        mention: null,
        gift: null,
        entryVideo: {
            videoUrl,
            thumbnailUrl: clean(input.entryVideo.thumbnailUrl),
            durationMs: Number(input.entryVideo.durationMs || 0),
        },
        replyTo: null,
        reactions: [],
        system: null,
        createdAt: nowIso(),
    };
    return {
        ok: true,
        message,
    };
}
/*
  Reaction على رسالة Live.

  ملاحظة:
  لأن الرسائل لا تحفظ، الرياكشن لا يحفظ في MongoDB.
  الـ handler يستقبل messageId ويرسل هذا الحدث لكل الموجودين في الغرفة.
*/
function makeRoomReactionEvent(input) {
    const roomId = (0, room_sanitize_1.sanitizeRoomId)(input.roomId);
    const messageId = clean(input.messageId);
    const userId = (0, room_sanitize_1.sanitizeUserId)(input.userId);
    const emoji = clean(input.emoji).slice(0, 12);
    if (!roomId || !messageId || !userId || !emoji) {
        return {
            ok: false,
            reason: "invalid_reaction_payload",
        };
    }
    return {
        ok: true,
        reaction: {
            roomId,
            messageId,
            userId,
            emoji,
            createdAt: nowIso(),
        },
    };
}
//# sourceMappingURL=room-message.service.js.map