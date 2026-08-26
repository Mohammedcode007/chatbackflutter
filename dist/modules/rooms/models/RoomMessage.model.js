"use strict";
// import mongoose, { Schema, Document } from "mongoose";
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
// export type RoomMessageDocument = Document & {
//   messageId: string;
//   roomId: string;
//   fromUserId: string;
//   fromUsername: string;
//   fromPhotoUrl: string;
//   fromBadgeValue: string;
//   fromBadgeImageUrl: string;
//   fromBadgeLottieUrl: string;
//   messageKind: "user" | "join" | "leave" | "gift" | "system";
//   type: "text" | "image" | "gif" | "none";
//   text: string;
//   media: {
//     url: string;
//     fileName: string;
//     mimeType: string;
//     sizeBytes: number;
//   } | null;
//   mention: {
//     username: string;
//     userId: string;
//     text: string;
//   } | null;
//   gift: {
//     key: string;
//     name: string;
//     animationUrl: string;
//     value: number;
//   } | null;
//   replyTo: {
//     messageId: string;
//     fromUserId: string;
//     text: string;
//     type: string;
//     mediaUrl: string;
//   } | null;
//   reactions: {
//     userId: string;
//     emoji: string;
//     createdAt: Date;
//   }[];
//   isDeleted: boolean;
//   createdAt: Date;
//   updatedAt: Date;
// };
// const RoomMessageSchema = new Schema<RoomMessageDocument>(
//   {
//     messageId: {
//       type: String,
//       required: true,
//       unique: true,
//       index: true,
//     },
//     roomId: {
//       type: String,
//       required: true,
//       index: true,
//     },
//     fromUserId: {
//       type: String,
//       required: true,
//       index: true,
//     },
//     fromUsername: {
//       type: String,
//       default: "",
//     },
//     fromPhotoUrl: {
//       type: String,
//       default: "",
//     },
//     fromBadgeValue: {
//       type: String,
//       default: "",
//     },
//     fromBadgeImageUrl: {
//       type: String,
//       default: "",
//     },
//     fromBadgeLottieUrl: {
//       type: String,
//       default: "",
//     },
//     messageKind: {
//       type: String,
//       enum: ["user", "join", "leave", "gift", "system"],
//       required: true,
//       index: true,
//     },
//     type: {
//       type: String,
//       enum: ["text", "image", "gif", "none"],
//       default: "text",
//     },
//     text: {
//       type: String,
//       default: "",
//     },
//     media: {
//       type: {
//         url: String,
//         fileName: String,
//         mimeType: String,
//         sizeBytes: Number,
//       },
//       default: null,
//     },
//     mention: {
//       type: {
//         username: String,
//         userId: String,
//         text: String,
//       },
//       default: null,
//     },
//     gift: {
//       type: {
//         key: String,
//         name: String,
//         animationUrl: String,
//         value: Number,
//       },
//       default: null,
//     },
//     replyTo: {
//       type: {
//         messageId: String,
//         fromUserId: String,
//         text: String,
//         type: String,
//         mediaUrl: String,
//       },
//       default: null,
//     },
//     reactions: {
//       type: [
//         {
//           userId: String,
//           emoji: String,
//           createdAt: {
//             type: Date,
//             default: Date.now,
//           },
//         },
//       ],
//       default: [],
//     },
//     isDeleted: {
//       type: Boolean,
//       default: false,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );
// export const RoomMessageModel = mongoose.model<RoomMessageDocument>(
//   "RoomMessage",
//   RoomMessageSchema
// );
const mongoose_1 = __importStar(require("mongoose"));
const RoomMessageMediaSchema = new mongoose_1.Schema({
    url: {
        type: String,
        default: "",
        trim: true,
    },
    fileName: {
        type: String,
        default: "",
        trim: true,
    },
    mimeType: {
        type: String,
        default: "",
        trim: true,
    },
    sizeBytes: {
        type: Number,
        default: 0,
        min: 0,
    },
}, {
    _id: false,
});
const RoomMessageMentionSchema = new mongoose_1.Schema({
    username: {
        type: String,
        default: "",
        trim: true,
    },
    userId: {
        type: String,
        default: "",
        trim: true,
    },
    text: {
        type: String,
        default: "",
    },
}, {
    _id: false,
});
const RoomMessageGiftSchema = new mongoose_1.Schema({
    key: {
        type: String,
        default: "",
        trim: true,
    },
    name: {
        type: String,
        default: "",
        trim: true,
    },
    animationUrl: {
        type: String,
        default: "",
        trim: true,
    },
    value: {
        type: Number,
        default: 0,
        min: 0,
    },
}, {
    _id: false,
});
const RoomMessageReplySchema = new mongoose_1.Schema({
    messageId: {
        type: String,
        required: true,
        trim: true,
    },
    fromUserId: {
        type: String,
        default: "",
        trim: true,
    },
    fromUsername: {
        type: String,
        default: "",
    },
    fromPhotoUrl: {
        type: String,
        default: "",
        trim: true,
    },
    text: {
        type: String,
        default: "",
    },
    type: {
        type: String,
        enum: ["text", "image", "gif", "none"],
        default: "text",
    },
    mediaUrl: {
        type: String,
        default: "",
        trim: true,
    },
}, {
    _id: false,
});
const RoomMessageReactionSchema = new mongoose_1.Schema({
    userId: {
        type: String,
        required: true,
        trim: true,
    },
    username: {
        type: String,
        default: "",
    },
    photoUrl: {
        type: String,
        default: "",
        trim: true,
    },
    emoji: {
        type: String,
        required: true,
        trim: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, {
    _id: false,
});
const RoomMessageSchema = new mongoose_1.Schema({
    messageId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
    },
    roomId: {
        type: String,
        required: true,
        index: true,
        trim: true,
    },
    fromUserId: {
        type: String,
        required: true,
        index: true,
        trim: true,
    },
    fromUsername: {
        type: String,
        default: "",
    },
    fromPhotoUrl: {
        type: String,
        default: "",
        trim: true,
    },
    fromBadgeValue: {
        type: String,
        default: "",
    },
    fromBadgeImageUrl: {
        type: String,
        default: "",
        trim: true,
    },
    fromBadgeLottieUrl: {
        type: String,
        default: "",
        trim: true,
    },
    messageKind: {
        type: String,
        enum: [
            "user",
            "join",
            "leave",
            "gift",
            "system",
        ],
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: [
            "text",
            "image",
            "gif",
            "none",
        ],
        default: "text",
    },
    text: {
        type: String,
        default: "",
    },
    media: {
        type: RoomMessageMediaSchema,
        default: null,
    },
    mention: {
        type: RoomMessageMentionSchema,
        default: null,
    },
    gift: {
        type: RoomMessageGiftSchema,
        default: null,
    },
    replyTo: {
        type: RoomMessageReplySchema,
        default: null,
    },
    reactions: {
        type: [RoomMessageReactionSchema],
        default: [],
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
    versionKey: false,
});
RoomMessageSchema.index({
    roomId: 1,
    createdAt: -1,
});
RoomMessageSchema.index({
    roomId: 1,
    isDeleted: 1,
    createdAt: -1,
});
RoomMessageSchema.index({
    roomId: 1,
    "reactions.userId": 1,
});
exports.RoomMessageModel = mongoose_1.default.model("RoomMessage", RoomMessageSchema);
//# sourceMappingURL=RoomMessage.model.js.map