import mongoose, { Schema, Document } from "mongoose";

export type DmPrivacy = "open" | "friends_only" | "closed";
export type FriendRequestPrivacy = "open" | "closed";
export type AllowCalls = "all" | "friends_only" | "none";
export type Gender = "male" | "female" | "other" | "";

export type VerificationType = "none" | "blue" | "gold" | "business";

export type InventoryItemType =
  | "account_color"
  | "badge"
  | "image_badge"
  | "lottie_badge"
  | "verification";
export type PlatformRole = "user" | "admin" | "owner";

export type UserAccountType =
  | "none"
  | "merchant"
  | "dealer"
  | "agent"
  | "partner"
  | "creator"
  | "broadcaster"
  | "vip"
  | "business"
  | "official"
  | "sponsor"
  | "tester";
export type UserInventoryItem = {
  itemId: string;
  type: InventoryItemType;
  key: string;
  name: string;
  value: string;
  purchasedAt: Date;
  expiresAt?: Date | null;
  isActive: boolean;

  /*
    آخر مرة المستخدم جدد نفس العنصر.
    مثال: اشترى نفس البادج مرة أخرى لتمديد المدة.
  */
  renewedAt?: Date | null;

  /*
    آخر مرة المستخدم فعّل هذا العنصر من المخزون.
    مثال: بدّل من لوتي إلى صورة أو العكس.
  */
  activatedAt?: Date | null;
};

export type UserStats = {
  friendsCount: number;
  profileViewsCount: number;
  giftsSentCount: number;
  giftsReceivedCount: number;
};
export type UserFcmToken = {
  token: string;
  platform: "android" | "ios" | "web" | string;
  updatedAt: Date;
};
export type UserDocument = Document & {
  userId: string;
  username: string;
  password: string;
  /*
    صلاحية المستخدم العامة داخل النظام.

    user:
    مستخدم عادي.

    admin:
    مدير عام يستطيع استخدام أوامر الإدارة المسموحة.

    owner:
    مالك النظام وصاحب أعلى صلاحية.
  */
  platformRole: PlatformRole;

  /*
    نوع الحساب التجاري أو التعريفي.
    القيمة الافتراضية none للمستخدمين الحاليين والجدد.
  */
  accountType: UserAccountType;

  /*
    رابط يظهر أو يعمل عند دخول المستخدم إلى الغرفة.
    يمكن أن يكون:
    - صورة
    - GIF
    - فيديو
    - Lottie JSON

    التطبيق هو المسؤول عن تحديد طريقة عرضه حسب الامتداد.
  */
  roomEntryMediaUrl: string;

  /*
    رابط يظهر عند فتح صفحة بروفايل المستخدم.
  */
  profileEntryMediaUrl: string;

  /*
    رسالة مخصصة تظهر عند دخول المستخدم إلى الغرفة.
    الحد الأقصى المقترح 160 حرفًا.
  */
  roomWelcomeMessage: string;

  /*
    تفعيل أو تعطيل تأثير الدخول إلى الغرف.
  */
  roomEntryEnabled: boolean;

  /*
    تفعيل أو تعطيل التأثير عند فتح البروفايل.
  */
  profileEntryEnabled: boolean;
  points: number;
  fcmTokens: UserFcmToken[];
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
  badgeImageKey: string;
  badgeImageName: string;
  badgeImageUrl: string;

  badgeLottieKey: string;
  badgeLottieName: string;
  badgeLottieUrl: string;
  verificationType: VerificationType;

  inventory: UserInventoryItem[];

  friends: string[];

  stats: UserStats;

  current: string;
  statusMessage: string;

  email: string;
  resetPasswordOTP?: string;
  resetPasswordExpires?: Date | null;
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
      enum: [
        "account_color",
        "badge",
        "image_badge",
        "lottie_badge",
        "verification",
      ],
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
    renewedAt: {
      type: Date,
      default: null,
    },

    activatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  }
);
const UserFcmTokenSchema = new Schema<UserFcmToken>(
  {
    token: {
      type: String,
      required: true,
      index: true,
    },

    platform: {
      type: String,
      default: "android",
    },

    updatedAt: {
      type: Date,
      default: Date.now,
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
        platformRole: {
      type: String,
      enum: ["user", "admin", "owner"],
      default: "user",
      index: true,
    },

    accountType: {
      type: String,
      enum: [
        "none",
        "merchant",
        "dealer",
        "agent",
        "partner",
        "creator",
        "broadcaster",
        "vip",
        "business",
        "official",
        "sponsor",
        "tester",
      ],
      default: "none",
      index: true,
    },

    roomEntryMediaUrl: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2048,
    },

    profileEntryMediaUrl: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2048,
    },

    roomWelcomeMessage: {
      type: String,
      default: "",
      trim: true,
      maxlength: 160,
    },

    roomEntryEnabled: {
      type: Boolean,
      default: false,
    },

    profileEntryEnabled: {
      type: Boolean,
      default: false,
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
      default: 100000,
      min: 0,
    },
    fcmTokens: {
      type: [UserFcmTokenSchema],
      default: [],
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
    badgeImageKey: {
      type: String,
      default: "",
    },

    badgeImageName: {
      type: String,
      default: "",
    },

    badgeImageUrl: {
      type: String,
      default: "",
    },

    badgeLottieKey: {
      type: String,
      default: "",
    },

    badgeLottieName: {
      type: String,
      default: "",
    },

    badgeLottieUrl: {
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

    resetPasswordOTP: {
      type: String,
      default: null,
      select: false,
    },

    resetPasswordExpires: {
      type: Date,
      default: null,
      select: false,
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
UserSchema.index({
  platformRole: 1,
  accountType: 1,
});

UserSchema.index({
  username: 1,
  platformRole: 1,
});
export const UserModel = mongoose.model<UserDocument>("User", UserSchema);