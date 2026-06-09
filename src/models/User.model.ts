import mongoose, { Schema, Document } from "mongoose";

export type DmPrivacy = "open" | "friends_only" | "closed";
export type FriendRequestPrivacy = "open" | "closed";
export type AllowCalls = "all" | "friends_only" | "none";
export type Gender = "male" | "female" | "other" | "";

export type UserDocument = Document & {
  userId: string;
  username: string;
  password: string;

  photoUrl: string;
  coverUrl: string;

  current: string;
  statusMessage: string;

  email: string;
  birthdate: string;
  country: string;
  gender: Gender;

  privateLock: boolean;
  autoJoinStream: boolean;
  hideActivityStatus: boolean;

  isManualOffline: boolean;

  privacy: {
    dmPrivacy: DmPrivacy;
    friendRequestPrivacy: FriendRequestPrivacy;
    allowCalls: AllowCalls;
  };

  blockedUsers: string[];

  features: {
    isVip: boolean;
    badge: string | null;
    level: number;
    roomLimit: number;
    canCreatePrivateRoom: boolean;
    canUseSpecialEffects: boolean;
  };

  createdAt: Date;
  updatedAt: Date;
};

const UserSchema = new Schema<UserDocument>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    username: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
    },

    photoUrl: {
      type: String,
      default: "",
    },

    coverUrl: {
      type: String,
      default: "",
    },

    current: {
      type: String,
      default: "0",
    },

    statusMessage: {
      type: String,
      default: "",
    },

    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    birthdate: {
      type: String,
      default: "",
    },

    country: {
      type: String,
      default: "",
    },

    gender: {
      type: String,
      enum: ["male", "female", "other", ""],
      default: "",
    },

    privateLock: {
      type: Boolean,
      default: false,
    },

    autoJoinStream: {
      type: Boolean,
      default: false,
    },

    hideActivityStatus: {
      type: Boolean,
      default: false,
    },

    isManualOffline: {
      type: Boolean,
      default: false,
    },

    privacy: {
      dmPrivacy: {
        type: String,
        enum: ["open", "friends_only", "closed"],
        default: "open",
      },

      friendRequestPrivacy: {
        type: String,
        enum: ["open", "closed"],
        default: "open",
      },

      allowCalls: {
        type: String,
        enum: ["all", "friends_only", "none"],
        default: "all",
      },
    },

    blockedUsers: [
      {
        type: String,
        index: true,
      },
    ],

    features: {
      isVip: { type: Boolean, default: false },
      badge: { type: String, default: null },
      level: { type: Number, default: 1 },
      roomLimit: { type: Number, default: 5 },
      canCreatePrivateRoom: { type: Boolean, default: false },
      canUseSpecialEffects: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

export const UserModel = mongoose.model<UserDocument>("User", UserSchema);