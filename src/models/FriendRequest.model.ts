import mongoose, { Schema, Document } from "mongoose";

export type FriendRequestStatus = "pending" | "accepted" | "rejected";

export type FriendRequestDocument = Document & {
  fromUserId: string;
  toUserId: string;
  status: FriendRequestStatus;
  createdAt: Date;
  updatedAt: Date;
};

const FriendRequestSchema = new Schema<FriendRequestDocument>(
  {
    fromUserId: {
      type: String,
      required: true,
      index: true,
    },

    toUserId: {
      type: String,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

FriendRequestSchema.index(
  { fromUserId: 1, toUserId: 1, status: 1 },
  { unique: false }
);

export const FriendRequestModel = mongoose.model<FriendRequestDocument>(
  "FriendRequest",
  FriendRequestSchema
);