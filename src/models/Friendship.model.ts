import mongoose, { Schema, Document } from "mongoose";

export type FriendshipDocument = Document & {
  userA: string;
  userB: string;
  createdAt: Date;
  updatedAt: Date;
};

const FriendshipSchema = new Schema<FriendshipDocument>(
  {
    userA: {
      type: String,
      required: true,
      index: true,
    },

    userB: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

FriendshipSchema.index({ userA: 1, userB: 1 }, { unique: true });

export const FriendshipModel = mongoose.model<FriendshipDocument>(
  "Friendship",
  FriendshipSchema
);
