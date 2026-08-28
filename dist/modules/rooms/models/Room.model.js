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
exports.RoomModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const RoleLogSchema = new mongoose_1.Schema({
    logId: {
        type: String,
        required: true,
    },
    action: {
        type: String,
        enum: ["role_set", "role_removed"],
        required: true,
    },
    actorId: {
        type: String,
        required: true,
        index: true,
    },
    actorUsername: {
        type: String,
        default: "",
    },
    targetUserId: {
        type: String,
        required: true,
        index: true,
    },
    targetUsername: {
        type: String,
        default: "",
    },
    oldRole: {
        type: String,
        enum: ["creator", "owner", "admin", "member", "none"],
        required: true,
    },
    newRole: {
        type: String,
        enum: ["owner", "admin", "member", "none"],
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, {
    _id: false,
});
const RoomSchema = new mongoose_1.Schema({
    roomId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50,
        index: true,
    },
    description: {
        type: String,
        default: "",
    },
    creatorId: {
        type: String,
        required: true,
        index: true,
    },
    owners: {
        type: [String],
        default: [],
        index: true,
    },
    admins: {
        type: [String],
        default: [],
        index: true,
    },
    members: {
        type: [String],
        default: [],
        index: true,
    },
    roleLogs: {
        type: [RoleLogSchema],
        default: [],
    },
    bannedUsers: {
        type: [String],
        default: [],
        index: true,
    },
    bannedIps: {
        type: [String],
        default: [],
    },
    passwordHash: {
        type: String,
        default: "",
    },
    hasPassword: {
        type: Boolean,
        default: false,
    },
    isLockedForNone: {
        type: Boolean,
        default: false,
    },
    maxUsers: {
        type: Number,
        default: 50,
        min: 1,
        max: 50,
    },
    activeUsers: {
        type: [String],
        default: [],
        index: true,
    },
    favoriteCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    pinnedMessage: {
        text: {
            type: String,
            default: "",
        },
        updatedBy: {
            type: String,
            default: "",
        },
        updatedAt: {
            type: Date,
            default: null,
        },
    },
    voiceEnabled: {
        type: Boolean,
        default: false,
    },
    roomImage: {
        type: String,
        default: "",
    },
    country: {
        type: String,
        default: "",
    },
}, {
    timestamps: true,
});
/*
  Indexes مهمة للبحث والترتيب.
*/
RoomSchema.index({ roomId: 1, creatorId: 1 });
RoomSchema.index({ roomId: 1, owners: 1 });
RoomSchema.index({ roomId: 1, admins: 1 });
RoomSchema.index({ roomId: 1, members: 1 });
RoomSchema.index({ roomId: 1, bannedUsers: 1 });
RoomSchema.index({ roomId: 1, "roleLogs.createdAt": -1 });
RoomSchema.index({ roomId: 1, "roleLogs.actorId": 1 });
RoomSchema.index({ roomId: 1, "roleLogs.targetUserId": 1 });
/*
  تنظيف بسيط قبل الحفظ:
  - creator لا يكون داخل owners/admins/members.
  - أي مستخدم لا يتكرر في أكثر من قائمة.
*/
RoomSchema.pre("save", function () {
    const room = this;
    const creatorId = String(room.creatorId || "").trim();
    function uniqueWithoutCreator(list) {
        return Array.from(new Set((list || [])
            .map((id) => String(id || "").trim())
            .filter((id) => id && id !== creatorId)));
    }
    room.owners = uniqueWithoutCreator(room.owners);
    room.admins = uniqueWithoutCreator(room.admins);
    room.members = uniqueWithoutCreator(room.members);
    /*
      لا تجعل نفس الشخص في أكثر من رتبة.
      الأولوية:
      owner ثم admin ثم member.
    */
    const ownersSet = new Set(room.owners);
    const adminsSet = new Set(room.admins);
    room.admins = room.admins.filter((id) => !ownersSet.has(id));
    room.members = room.members.filter((id) => !ownersSet.has(id) && !adminsSet.has(id));
    room.bannedUsers = Array.from(new Set((room.bannedUsers || [])
        .map((id) => String(id || "").trim())
        .filter((id) => id && id !== creatorId)));
    room.bannedIps = Array.from(new Set((room.bannedIps || [])
        .map((ip) => String(ip || "").trim())
        .filter(Boolean)));
    room.activeUsers = Array.from(new Set((room.activeUsers || [])
        .map((id) => String(id || "").trim())
        .filter(Boolean)));
    if (room.maxUsers > 50) {
        room.maxUsers = 50;
    }
    if (room.maxUsers < 1) {
        room.maxUsers = 1;
    }
});
exports.RoomModel = mongoose_1.default.model("Room", RoomSchema);
//# sourceMappingURL=Room.model.js.map