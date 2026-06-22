import mongoose, { Schema, Document } from "mongoose";

export type DmPrivacy = "open" | "friends_only" | "closed";
export type FriendRequestPrivacy = "open" | "closed";
export type AllowCalls = "all" | "friends_only" | "none";
export type Gender = "male" | "female" | "other" | "";

export type VerificationType = "none" | "blue" | "gold" | "business";

export type InventoryItemType =
  | "account_color"
  | "badge"
  | "verification";

export type UserInventoryItem = {
  itemId: string;
  type: InventoryItemType;
  key: string;
  name: string;
  value: string;
  purchasedAt: Date;
  expiresAt?: Date | null;
  isActive: boolean;
};

export type UserStats = {
  friendsCount: number;
  profileViewsCount: number;
  giftsSentCount: number;
  giftsReceivedCount: number;
};

export type UserDocument = Document & {
  userId: string;
  username: string;
  password: string;

  points: number;

  photoUrl: string;
  photoPublicId: string;
sessionTokenHash?: string;
sessionExpiresAt?: Date | null;
  coverUrl: string;
  coverPublicId: string;

  accountColor: string;

  badgeKey: string;
  badgeName: string;
  badgeValue: string;

  verificationType: VerificationType;

  inventory: UserInventoryItem[];

  friends: string[];

  stats: UserStats;

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

const InventoryItemSchema = new Schema<UserInventoryItem>(
  {
    itemId: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["account_color", "badge", "verification"],
      required: true,
    },

    key: {
      type: String,
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    value: {
      type: String,
      required: true,
    },

    purchasedAt: {
      type: Date,
      default: Date.now,
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  }
);

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
sessionTokenHash: {
  type: String,
  default: "",
  select: false,
  index: true,
},

sessionExpiresAt: {
  type: Date,
  default: null,
  select: false,
  index: true,
},
    points: {
      type: Number,
      default: 100,
      min: 0,
    },

    photoUrl: {
      type: String,
      default: "",
    },

    photoPublicId: {
      type: String,
      default: "",
    },

    coverUrl: {
      type: String,
      default: "",
    },

    coverPublicId: {
      type: String,
      default: "",
    },

    accountColor: {
      type: String,
      default: "#2BCB00",
    },

    badgeKey: {
      type: String,
      default: "",
    },

    badgeName: {
      type: String,
      default: "",
    },

    badgeValue: {
      type: String,
      default: "",
    },

    verificationType: {
      type: String,
      enum: ["none", "blue", "gold", "business"],
      default: "none",
    },

    inventory: {
      type: [InventoryItemSchema],
      default: [],
    },

    friends: [
      {
        type: String,
        index: true,
      },
    ],

    stats: {
      friendsCount: {
        type: Number,
        default: 0,
        min: 0,
      },

      profileViewsCount: {
        type: Number,
        default: 0,
        min: 0,
      },

      giftsSentCount: {
        type: Number,
        default: 0,
        min: 0,
      },

      giftsReceivedCount: {
        type: Number,
        default: 0,
        min: 0,
      },
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
      isVip: {
        type: Boolean,
        default: false,
      },

      badge: {
        type: String,
        default: null,
      },

      level: {
        type: Number,
        default: 1,
      },

      roomLimit: {
        type: Number,
        default: 5,
      },

      canCreatePrivateRoom: {
        type: Boolean,
        default: false,
      },

      canUseSpecialEffects: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

export const UserModel = mongoose.model<UserDocument>("User", UserSchema);