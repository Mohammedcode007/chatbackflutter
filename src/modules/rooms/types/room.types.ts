export type RoomRole =
  | "creator"
  | "owner"
  | "admin"
  | "member"
  | "none";

export type RoomRoleWithoutCreator = Exclude<RoomRole, "creator">;

export type RoomRoleLogAction =
  | "role_set"
  | "role_removed";

export type RoomListType =
  | "active"
  | "favorite"
  | "public"
  | "voice";

/*
  نوع الرسالة اللايف داخل الغرفة.
  لا يتم حفظها في MongoDB.
*/
export type RoomLiveMessageKind =
  | "user"
  | "join"
  | "leave"
  | "gift"
  | "system"
  | "role"
  | "entry_video";

/*
  نوع محتوى رسالة المستخدم.
*/
export type RoomUserMessageType =
  | "text"
  | "image"
  | "gif"
  | "video"
  | "audio"
  | "voice"
  | "gift"
  | "none";

/*
  نوع عام للرسالة اللايف.
*/
export type RoomLiveMessageType =
  | "text"
  | "image"
  | "gif"
  | "video"
  | "gift"
   | "audio"
  | "voice"
  | "none";

/*
  أحداث رسائل النظام اللايف.
*/
export type RoomSystemAction =
  | "role_changed"
  | "role_removed"
  | "role_set"

  | "user_kicked"
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
  | "boost_added"

  | "room_post";

/*
  الصلاحيات داخل الغرفة.
*/
export type RoomPermissionAction =
  | "set_owner"
  | "set_admin"
  | "set_member"
  | "remove_role"

  | "kick_user"
  | "ban_user"
  | "ban_ip"
  | "unban_user"
  | "unban_ip"

  | "set_password"
  | "remove_password"

  | "lock_room"
  | "unlock_room"

  | "set_pinned_message"

  | "send_message"
  | "send_gift"
  | "join_room"

  | "boost_room"
  | "favorite_room";

/*
  شكل الميديا في الرسائل اللايف.
*/
export type RoomLiveMedia = {
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

/*
  شكل الهدية.
  ممكن تكون فيديو / gif / lottie.
*/
export type RoomGiftPayload = {
  key: string;
  name: string;

  animationType: "video" | "gif" | "lottie";
  animationUrl: string;
  thumbnailUrl: string;

  value: number;
  durationMs: number;
};

/*
  فيديو دخول المستخدم.
*/
export type RoomEntryVideoPayload = {
  videoUrl: string;
  thumbnailUrl: string;
  durationMs: number;
};

/*
  Reply داخل الرسائل اللايف.
*/
export type RoomReplyPayload = {
  messageId: string;
  fromUserId: string;
  text: string;
  type: string;
  mediaUrl: string;
};

/*
  Mention داخل الغرفة.
*/
export type RoomMentionPayload = {
  username: string;
  userId: string;
  text: string;
};

/*
  Reaction داخل الرسائل اللايف.
  ملاحظة:
  بما أن الرسائل لا تحفظ، الرياكشن يعيش طالما الرسالة موجودة عند العملاء فقط.
*/
export type RoomReactionPayload = {
  userId: string;
  emoji: string;
  createdAt: string;
};

/*
  بيانات system message.
*/
export type RoomSystemPayload = {
  action: RoomSystemAction;

  actorId: string;
  actorUsername: string;

  targetUserId: string;
  targetUsername: string;

  oldRole?: RoomRole;
  newRole?: RoomRoleWithoutCreator;

  dc?: boolean;

  /*
    اختياري لرسائل الطرد/الحظر/البوست.
  */
  message?: string;

  /*
    اختياري لبوست الغرفة.
    حاليًا ستستخدم video، ولاحقًا يمكن توسعتها.
  */
  postType?: "video" | "image" | "text" | "audio" | string;
  videoUrl?: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
};

/*
  الرسالة اللايف الكاملة.
  لا يتم حفظها في MongoDB.
*/
export type RoomLiveMessage = {
  messageId: string;
  roomId: string;

  messageKind: RoomLiveMessageKind;
  type: RoomLiveMessageType;

  fromUserId: string;
  fromUsername: string;
  fromPhotoUrl: string;
  fromRole: RoomRole;

  text: string;

  media: RoomLiveMedia | null;
  mention: RoomMentionPayload | null;
  gift: RoomGiftPayload | null;
  entryVideo: RoomEntryVideoPayload | null;
  replyTo: RoomReplyPayload | null;

  reactions: RoomReactionPayload[];

  system: RoomSystemPayload | null;

  createdAt: string;
};