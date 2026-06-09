import mongoose, { Schema, Document, Types } from "mongoose";

export type MessageDocument = Document & {
  chat: Types.ObjectId;
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  body: string;
  type: "text" | "image" | "audio" | "video" | "file";
  seenBy: Types.ObjectId[];
  deliveredTo: Types.ObjectId[];
  deletedFor: Types.ObjectId[];
  deletedForEveryone: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const MessageSchema = new Schema<MessageDocument>(
  {
    chat: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
      index: true,
    },

    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    body: {
      type: String,
      default: "",
    },

    type: {
      type: String,
      enum: ["text", "image", "audio", "video", "file"],
      default: "text",
    },

    seenBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    deliveredTo: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    deletedFor: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    deletedForEveryone: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

MessageSchema.index({ chat: 1, createdAt: -1 });

export const MessageModel = mongoose.model<MessageDocument>(
  "Message",
  MessageSchema
);