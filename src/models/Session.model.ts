import mongoose, { Schema, Document } from "mongoose";

export type SessionDocument = Document & {
  userId: string;
  sessionId: string;
  ipAddress: string;
  countryCode: string;
  deviceInfo: string;
  createdAt: Date;
  lastActiveAt: Date;
};

const SessionSchema = new Schema<SessionDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },

    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    ipAddress: {
      type: String,
      default: "",
    },

    countryCode: {
      type: String,
      default: "ALL",
    },

    deviceInfo: {
      type: String,
      default: "",
    },

    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

SessionSchema.index({ userId: 1, createdAt: -1 });

export const SessionModel = mongoose.model<SessionDocument>(
  "Session",
  SessionSchema
);
