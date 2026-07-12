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
exports.TweetModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const TweetMediaSchema = new mongoose_1.Schema({
    type: {
        type: String,
        enum: ["image", "video"],
        required: true,
    },
    url: {
        type: String,
        required: true,
        trim: true,
    },
    publicId: {
        type: String,
        default: "",
        trim: true,
    },
    thumbnailUrl: {
        type: String,
        default: "",
        trim: true,
    },
    width: {
        type: Number,
        default: undefined,
    },
    height: {
        type: Number,
        default: undefined,
    },
    duration: {
        type: Number,
        default: undefined,
    },
}, {
    _id: false,
});
const TweetSchema = new mongoose_1.Schema({
    tweetId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    authorId: {
        type: String,
        required: true,
        index: true,
    },
    authorUsername: {
        type: String,
        required: true,
        trim: true,
    },
    text: {
        type: String,
        default: "",
        trim: true,
        maxlength: 1000,
    },
    mediaType: {
        type: String,
        enum: ["none", "images", "video"],
        default: "none",
    },
    media: {
        type: [TweetMediaSchema],
        default: [],
    },
    mentions: {
        type: [String],
        default: [],
        index: true,
    },
    likesCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    commentsCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    retweetsCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    viewsCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    isDeleted: {
        type: Boolean,
        default: false,
        index: true,
    },
    deletedAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
});
TweetSchema.index({
    createdAt: -1,
});
TweetSchema.index({
    authorId: 1,
    createdAt: -1,
});
TweetSchema.index({
    isDeleted: 1,
    createdAt: -1,
});
exports.TweetModel = mongoose_1.default.model("Tweet", TweetSchema);
//# sourceMappingURL=Tweet.model.js.map