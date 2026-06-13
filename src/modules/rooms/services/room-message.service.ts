import { RoomModel } from "../models/Room.model";
import { UserModel } from "../../../models/User.model";

import {
  RoomGiftPayload,
  RoomLiveMessage,
  RoomLiveMedia,
  RoomReplyPayload,
  RoomRole,
  RoomUserMessageType,
} from "../types/room.types";

import { getRoomRole } from "./room-role.service";

import {
  makeRoomEntryVideoMessageId,
  makeRoomGiftMessageId,
  makeRoomMessageId,
  makeRoomSystemMessageId,
} from "../utils/room.ids";

import {
  parseRoomMention,
  sanitizeRoomGift,
  sanitizeRoomId,
  sanitizeRoomMedia,
  sanitizeRoomMessageText,
  sanitizeRoomReply,
  sanitizeRoomUserMessageType,
  sanitizeUserId,
} from "../utils/room.sanitize";

function clean(value: any) {
  return String(value || "").trim();
}

function nowIso() {
  return new Date().toISOString();
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
export async function sendRoomLiveMessageService(input: {
  userId: string;
  username?: string;
  photoUrl?: string;

  roomId: string;

  type: RoomUserMessageType;
  text?: string;

  media?: any;
  replyTo?: any;
}) {
  const userId = sanitizeUserId(input.userId);
  const roomId = sanitizeRoomId(input.roomId);
  const type = sanitizeRoomUserMessageType(input.type);
  const text = sanitizeRoomMessageText(input.text);

  if (!userId || !roomId) {
    return {
      ok: false as const,
      reason: "invalid_message_payload",
    };
  }

  const room = await RoomModel.findOne({ roomId }).lean();

  if (!room) {
    return {
      ok: false as const,
      reason: "room_not_found",
    };
  }

  if (Array.isArray(room.bannedUsers) && room.bannedUsers.includes(userId)) {
    return {
      ok: false as const,
      reason: "user_banned_from_room",
    };
  }

  const role = getRoomRole(room, userId);

  if (room.isLockedForNone && role === "none") {
    return {
      ok: false as const,
      reason: "room_locked_for_members_only",
    };
  }

  const media = sanitizeRoomMedia(input.media);
  const replyTo = sanitizeRoomReply(input.replyTo);

  if (type === "text" && !text) {
    return {
      ok: false as const,
      reason: "empty_message",
    };
  }

  if ((type === "image" || type === "gif" || type === "video") && !media) {
    return {
      ok: false as const,
      reason: "missing_media",
    };
  }

  /*
    @username msg
    لو النص يبدأ بمنشن، نرجع mentionDm للـ handler.
    الـ handler هو الذي يرسل DM باستخدام dm.service.
  */
  const parsedMention = type === "text" ? parseRoomMention(text) : null;

  let mention:
    | {
        username: string;
        userId: string;
        text: string;
      }
    | null = null;

  let mentionDm:
    | {
        toUserId: string;
        username: string;
        text: string;
      }
    | null = null;

  if (parsedMention) {
    const targetUser = await UserModel.findOne({
      username: parsedMention.username,
    })
      .select("userId username")
      .lean();

    if (targetUser) {
      mention = {
        username: parsedMention.username,
        userId: String((targetUser as any).userId || ""),
        text: parsedMention.text,
      };

      mentionDm = {
        toUserId: String((targetUser as any).userId || ""),
        username: parsedMention.username,
        text: parsedMention.text,
      };
    } else {
      mention = {
        username: parsedMention.username,
        userId: "",
        text: parsedMention.text,
      };
    }
  }

  const message: RoomLiveMessage = {
    messageId: makeRoomMessageId(),
    roomId,

    messageKind: "user",
    type,

    fromUserId: userId,
    fromUsername: clean(input.username),
    fromPhotoUrl: clean(input.photoUrl),
    fromRole: role,

    text,

    media: media as RoomLiveMedia | null,
    mention,
    gift: null,
    entryVideo: null,
    replyTo: replyTo as RoomReplyPayload | null,

    reactions: [],

    system: null,

    createdAt: nowIso(),
  };

  return {
    ok: true as const,
    room,
    role,
    message,
    mention,
    mentionDm,
  };
}

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
export function makeRoomSystemMessage(input: {
  roomId: string;

  action:
    | "role_changed"
    | "role_removed"
    | "user_banned"
    | "ip_banned"
    | "room_locked"
    | "room_unlocked"
    | "password_changed"
    | "password_removed"
    | "pinned_changed"
    | "join"
    | "leave"
    | "reconnect_join"
    | "gift_sent"
    | "boost_added";

  actorId?: string;
  actorUsername?: string;

  targetUserId?: string;
  targetUsername?: string;

  oldRole?: RoomRole;
  newRole?: Exclude<RoomRole, "creator">;

  dc?: boolean;

  text?: string;
}): RoomLiveMessage {
  const text =
    clean(input.text) ||
    buildRoomSystemText({
      action: input.action,
      actorUsername: input.actorUsername,
      targetUsername: input.targetUsername,
      oldRole: input.oldRole,
      newRole: input.newRole,
      dc: input.dc,
    });

  return {
    messageId: makeRoomSystemMessageId(),
    roomId: sanitizeRoomId(input.roomId),

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

function buildRoomSystemText(input: {
  action: string;
  actorUsername?: string;
  targetUsername?: string;
  oldRole?: string;
  newRole?: string;
  dc?: boolean;
}) {
  const actor = clean(input.actorUsername) || "Someone";
  const target = clean(input.targetUsername) || "Someone";

  if (input.action === "role_changed") {
    return `${actor} أعطى ${target} رتبة ${input.newRole || ""}`;
  }

  if (input.action === "role_removed") {
    return `${actor} أزال رتبة ${target}`;
  }

  if (input.action === "user_banned") {
    return `${actor} حظر ${target}`;
  }

  if (input.action === "ip_banned") {
    return `${actor} حظر IP الخاص بـ ${target}`;
  }

  if (input.action === "room_locked") {
    return `${actor} قفل الغرفة للأعضاء فقط`;
  }

  if (input.action === "room_unlocked") {
    return `${actor} فتح الغرفة للجميع`;
  }

  if (input.action === "password_changed") {
    return `${actor} غيّر باسورد الغرفة`;
  }

  if (input.action === "password_removed") {
    return `${actor} حذف باسورد الغرفة`;
  }

  if (input.action === "pinned_changed") {
    return `${actor} غيّر الرسالة المثبتة`;
  }

  if (input.action === "join") {
    return `${target} دخل الغرفة`;
  }

  if (input.action === "leave") {
    return `${target} خرج من الغرفة`;
  }

  if (input.action === "reconnect_join") {
    return `${target} عاد للغرفة بعد DC`;
  }

  if (input.action === "gift_sent") {
    return `${actor} أرسل هدية إلى ${target}`;
  }

  if (input.action === "boost_added") {
    return `${actor} عمل Boost للغرفة`;
  }

  return "Room update";
}

/*
  رسالة هدية Live فقط.
  الهدية ممكن تكون فيديو / gif / lottie.
*/
export function makeRoomGiftMessage(input: {
  roomId: string;

  fromUserId: string;
  fromUsername?: string;
  fromPhotoUrl?: string;
  fromRole?: RoomRole;

  targetUserId?: string;
  targetUsername?: string;

  gift: RoomGiftPayload | any;
}) {
  const gift = sanitizeRoomGift(input.gift);

  if (!gift) {
    return {
      ok: false as const,
      reason: "invalid_gift",
    };
  }

  const fromUsername = clean(input.fromUsername);
  const targetUsername = clean(input.targetUsername);

  const message: RoomLiveMessage = {
    messageId: makeRoomGiftMessageId(),
    roomId: sanitizeRoomId(input.roomId),

    messageKind: "gift",
    type: "gift",

    fromUserId: sanitizeUserId(input.fromUserId),
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

      actorId: sanitizeUserId(input.fromUserId),
      actorUsername: fromUsername,

      targetUserId: sanitizeUserId(input.targetUserId),
      targetUsername,

      dc: false,
    },

    createdAt: nowIso(),
  };

  return {
    ok: true as const,
    message,
  };
}

/*
  رسالة فيديو دخول المستخدم.
  Live فقط.
*/
export function makeRoomEntryVideoMessage(input: {
  roomId: string;

  userId: string;
  username?: string;
  photoUrl?: string;
  fromRole?: RoomRole;

  entryVideo: {
    videoUrl: string;
    thumbnailUrl: string;
    durationMs: number;
  };
}) {
  const videoUrl = clean(input.entryVideo?.videoUrl);

  if (!videoUrl) {
    return {
      ok: false as const,
      reason: "missing_entry_video",
    };
  }

  const username = clean(input.username);

  const message: RoomLiveMessage = {
    messageId: makeRoomEntryVideoMessageId(),
    roomId: sanitizeRoomId(input.roomId),

    messageKind: "entry_video",
    type: "video",

    fromUserId: sanitizeUserId(input.userId),
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
    ok: true as const,
    message,
  };
}

/*
  Reaction على رسالة Live.

  ملاحظة:
  لأن الرسائل لا تحفظ، الرياكشن لا يحفظ في MongoDB.
  الـ handler يستقبل messageId ويرسل هذا الحدث لكل الموجودين في الغرفة.
*/
export function makeRoomReactionEvent(input: {
  roomId: string;
  messageId: string;
  userId: string;
  emoji: string;
}) {
  const roomId = sanitizeRoomId(input.roomId);
  const messageId = clean(input.messageId);
  const userId = sanitizeUserId(input.userId);
  const emoji = clean(input.emoji).slice(0, 12);

  if (!roomId || !messageId || !userId || !emoji) {
    return {
      ok: false as const,
      reason: "invalid_reaction_payload",
    };
  }

  return {
    ok: true as const,
    reaction: {
      roomId,
      messageId,
      userId,
      emoji,
      createdAt: nowIso(),
    },
  };
}