export type DmMessageType = "text" | "image" | "video" | "audio" | "file";

export type DmMediaPayload = {
  url: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  durationMs?: number;
  thumbnailUrl?: string;
};

export type DmReplyPayload = {
  messageId: string;
  fromUserId: string;
  type: DmMessageType;
  text?: string;
  mediaUrl?: string;
};

export type DmSharedPayload = {
  fromChatUserId: string;
  fromChatUsername: string;
  originalMessageId: string;
  originalType: DmMessageType;
  originalText?: string;
  originalMediaUrl?: string;
};

export type DmMessagePayload = {
  messageId: string;
  tempId?: string;

  chatId: string;

  fromUserId: string;
  toUserId: string;

  fromUsername?: string;
  fromPhotoUrl?: string;
  toUsername?: string;
  toPhotoUrl?: string;

  type: DmMessageType;

  text?: string;
  media?: DmMediaPayload | null;

  replyTo?: DmReplyPayload | null;
  shared?: DmSharedPayload | null;

  isEdited?: boolean;
  isDeleted?: boolean;

  createdAt: string;
  updatedAt: string;
};

export type DmSendResult =
  | {
      ok: true;
      message: DmMessagePayload;

      /*
        delivered هنا معناها:
        هل نعرض للمرسل علامتين صح أم لا.
        وليس معناها هل الرسالة وصلت فعليًا للسوكيت.
      */
      delivered: boolean;

      /*
        هل المستقبل Online حقيقي ونرسل له الرسالة الآن.
      */
      targetOnlineReal: boolean;

      storedInRedis: boolean;

      targetHidden: boolean;
      isFriend: boolean;
      canShowTargetActivity: boolean;
    }
  | {
      ok: false;
      reason: string;
    };