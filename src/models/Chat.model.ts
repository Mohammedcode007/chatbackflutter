import mongoose, { Schema, Document, Types } from "mongoose";

export type ChatDocument = Document & {
  members: Types.ObjectId[];
  lastMessage?: Types.ObjectId;
  lastMessageText: string;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const ChatSchema = new Schema<ChatDocument>(
  {
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
    ],

    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    lastMessageText: {
      type: String,
      default: "",
    },

    lastMessageAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

ChatSchema.index({ members: 1 });

export const ChatModel = mongoose.model<ChatDocument>("Chat", ChatSchema);