import mongoose, { Schema, Document } from "mongoose";

export type RoomMessageDocument = Document & {
  messageId: string;
  roomId: string;

  fromUserId: string;
  fromUsername: string;
  fromPhotoUrl: string;

  fromBadgeValue: string;
  fromBadgeImageUrl: string;
  fromBadgeLottieUrl: string;

  messageKind: "user" | "join" | "leave" | "gift" | "system";
  type: "text" | "image" | "gif" | "none";

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
    animationUrl: string;
    value: number;
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
    createdAt: Date;
  }[];

  isDeleted: boolean;

  createdAt: Date;
  updatedAt: Date;
};

const RoomMessageSchema = new Schema<RoomMessageDocument>(
  {
    messageId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    roomId: {
      type: String,
      required: true,
      index: true,
    },

    fromUserId: {
      type: String,
      required: true,
      index: true,
    },

    fromUsername: {
      type: String,
      default: "",
    },

    fromPhotoUrl: {
      type: String,
      default: "",
    },
    fromBadgeValue: {
      type: String,
      default: "",
    },

    fromBadgeImageUrl: {
      type: String,
      default: "",
    },

    fromBadgeLottieUrl: {
      type: String,
      default: "",
    },
    messageKind: {
      type: String,
      enum: ["user", "join", "leave", "gift", "system"],
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["text", "image", "gif", "none"],
      default: "text",
    },

    text: {
      type: String,
      default: "",
    },

    media: {
      type: {
        url: String,
        fileName: String,
        mimeType: String,
        sizeBytes: Number,
      },
      default: null,
    },

    mention: {
      type: {
        username: String,
        userId: String,
        text: String,
      },
      default: null,
    },

    gift: {
      type: {
        key: String,
        name: String,
        animationUrl: String,
        value: Number,
      },
      default: null,
    },

    replyTo: {
      type: {
        messageId: String,
        fromUserId: String,
        text: String,
        type: String,
        mediaUrl: String,
      },
      default: null,
    },

    reactions: {
      type: [
        {
          userId: String,
          emoji: String,
          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const RoomMessageModel = mongoose.model<RoomMessageDocument>(
  "RoomMessage",
  RoomMessageSchema
);