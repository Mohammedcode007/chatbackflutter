export type RoomLiveMessageKind =
  | "user"
  | "join"
  | "leave"
  | "gift"
  | "system"
  | "entry_video";

export type RoomLiveMessageType =
  | "text"
  | "image"
  | "gif"
  | "video"
  | "none";

export type RoomLiveMessage = {
  messageId: string;
  roomId: string;

  messageKind: RoomLiveMessageKind;
  type: RoomLiveMessageType;

  fromUserId: string;
  fromUsername: string;
  fromPhotoUrl: string;
  fromRole?: "creator" | "owner" | "admin" | "member" | "none";

  text: string;

  media: {
    url: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  } | null;

  mention: {
    username: string;
    userId: string;
    text: string;
  } | null;

  gift: {
    key: string;
    name: string;

    animationType: "video" | "gif" | "lottie";
    animationUrl: string;
    thumbnailUrl: string;

    value: number;
    durationMs: number;
  } | null;

  entryVideo: {
    videoUrl: string;
    thumbnailUrl: string;
    durationMs: number;
  } | null;

  replyTo: {
    messageId: string;
    fromUserId: string;
    text: string;
    type: string;
    mediaUrl: string;
  } | null;

  reactions: {
    userId: string;
    emoji: string;
    createdAt: string;
  }[];

  system: {
    action:
      | "role_changed"
      | "user_banned"
      | "ip_banned"
      | "room_locked"
      | "room_unlocked"
      | "password_changed"
      | "pinned_changed"
      | "join"
      | "leave"
      | "reconnect_join";

    actorId: string;
    actorUsername: string;

    targetUserId: string;
    targetUsername: string;

    oldRole?: string;
    newRole?: string;

    dc?: boolean;
  } | null;

  createdAt: string;
};