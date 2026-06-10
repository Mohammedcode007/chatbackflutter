import mongoose, { Schema, Document } from "mongoose";

export type ProfileViewDocument = Document & {
  targetUserId: string;
  viewerUserId: string;
  viewedDay: string;
  createdAt: Date;
  updatedAt: Date;
};

const ProfileViewSchema = new Schema<ProfileViewDocument>(
  {
    targetUserId: {
      type: String,
      required: true,
      index: true,
    },

    viewerUserId: {
      type: String,
      required: true,
      index: true,
    },

    viewedDay: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

ProfileViewSchema.index(
  {
    targetUserId: 1,
    viewerUserId: 1,
    viewedDay: 1,
  },
  {
    unique: true,
  }
);

export const ProfileViewModel = mongoose.model<ProfileViewDocument>(
  "ProfileView",
  ProfileViewSchema
);