"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const InventoryItemSchema = new mongoose_1.Schema({
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
}, {
    _id: false,
});
const UserFcmTokenSchema = new mongoose_1.Schema({
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
}, {
    _id: false,
});
const UserSchema = new mongoose_1.Schema({
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
}, {
    timestamps: true,
});
UserSchema.index({
    platformRole: 1,
    accountType: 1,
});
UserSchema.index({
    username: 1,
    platformRole: 1,
});
exports.UserModel = mongoose_1.default.model("User", UserSchema);
//# sourceMappingURL=User.model.js.map