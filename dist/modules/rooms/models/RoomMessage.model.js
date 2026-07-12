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
exports.RoomMessageModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const RoomMessageSchema = new mongoose_1.Schema({
    messageId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    roomId: {
        type: String,
        required: true,
        index: true,
    },
    fromUserId: {
        type: String,
        required: true,
        index: true,
    },
    fromUsername: {
        type: String,
        default: "",
    },
    fromPhotoUrl: {
        type: String,
        default: "",
    },
    fromBadgeValue: {
        type: String,
        default: "",
    },
    fromBadgeImageUrl: {
        type: String,
        default: "",
    },
    fromBadgeLottieUrl: {
        type: String,
        default: "",
    },
    messageKind: {
        type: String,
        enum: ["user", "join", "leave", "gift", "system"],
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: ["text", "image", "gif", "none"],
        default: "text",
    },
    text: {
        type: String,
        default: "",
    },
    media: {
        type: {
            url: String,
            fileName: String,
            mimeType: String,
            sizeBytes: Number,
        },
        default: null,
    },
    mention: {
        type: {
            username: String,
            userId: String,
            text: String,
        },
        default: null,
    },
    gift: {
        type: {
            key: String,
            name: String,
            animationUrl: String,
            value: Number,
        },
        default: null,
    },
    replyTo: {
        type: {
            messageId: String,
            fromUserId: String,
            text: String,
            type: String,
            mediaUrl: String,
        },
        default: null,
    },
    reactions: {
        type: [
            {
                userId: String,
                emoji: String,
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        default: [],
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});
exports.RoomMessageModel = mongoose_1.default.model("RoomMessage", RoomMessageSchema);
//# sourceMappingURL=RoomMessage.model.js.map