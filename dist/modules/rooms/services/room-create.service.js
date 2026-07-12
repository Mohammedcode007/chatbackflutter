"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoomService = createRoomService;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const Room_model_1 = require("../models/Room.model");
const room_ids_1 = require("../utils/room.ids");
const room_sanitize_1 = require("../utils/room.sanitize");
const MAX_ROOM_USERS = 50;
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
async function createRoomService(input) {
    console.log("\n===== CREATE_ROOM_SERVICE_START =====");
    console.log("[createRoomService] raw input:", input);
    try {
        const creatorId = (0, room_sanitize_1.sanitizeUserId)(input.creatorId);
        const name = (0, room_sanitize_1.sanitizeRoomName)(input.name);
        const description = (0, room_sanitize_1.sanitizeRoomDescription)(input.description);
        const password = (0, room_sanitize_1.sanitizeRoomPassword)(input.password);
        const voiceEnabled = input.voiceEnabled === true;
        console.log("[createRoomService] sanitized values:", {
            creatorId,
            name,
            description,
            hasPassword: password.length > 0,
            passwordLength: password.length,
            voiceEnabled,
        });
        if (!creatorId) {
            console.log("[createRoomService] failed: not_logged_in");
            console.log("===== CREATE_ROOM_SERVICE_END =====\n");
            return {
                ok: false,
                reason: "not_logged_in",
            };
        }
        if (!name) {
            console.log("[createRoomService] failed: room_name_required");
            console.log("===== CREATE_ROOM_SERVICE_END =====\n");
            return {
                ok: false,
                reason: "room_name_required",
            };
        }
        if (name.length > 50) {
            console.log("[createRoomService] failed: room_name_too_long", {
                nameLength: name.length,
            });
            console.log("===== CREATE_ROOM_SERVICE_END =====\n");
            return {
                ok: false,
                reason: "room_name_too_long",
            };
        }
        if (!(0, room_sanitize_1.isValidRoomPassword)(password)) {
            console.log("[createRoomService] failed: invalid_room_password", {
                passwordLength: password.length,
            });
            console.log("===== CREATE_ROOM_SERVICE_END =====\n");
            return {
                ok: false,
                reason: "invalid_room_password",
            };
        }
        console.log("[createRoomService] checking duplicate room name...");
        const existingRoom = await Room_model_1.RoomModel.findOne({
            name: {
                $regex: `^${escapeRegExp(name)}$`,
                $options: "i",
            },
        })
            .select("roomId name creatorId")
            .lean();
        if (existingRoom) {
            console.log("[createRoomService] failed: duplicate room name", {
                requestedName: name,
                existingRoomId: existingRoom.roomId,
                existingName: existingRoom.name,
                existingCreatorId: existingRoom.creatorId,
            });
            console.log("===== CREATE_ROOM_SERVICE_END =====\n");
            return {
                ok: false,
                reason: "room_name_already_exists",
            };
        }
        console.log("[createRoomService] password validation passed");
        const passwordHash = password ? await bcryptjs_1.default.hash(password, 10) : "";
        console.log("[createRoomService] password hash created:", {
            hasPasswordHash: passwordHash.length > 0,
        });
        const roomId = (0, room_ids_1.makeRoomId)();
        console.log("[createRoomService] generated roomId:", roomId);
        const payload = {
            roomId,
            name,
            description,
            creatorId,
            owners: [],
            admins: [],
            members: [creatorId],
            roleLogs: [],
            bannedUsers: [],
            bannedIps: [],
            passwordHash,
            hasPassword: Boolean(passwordHash),
            isLockedForNone: false,
            maxUsers: MAX_ROOM_USERS,
            activeUsers: [],
            favoriteCount: 0,
            pinnedMessage: {
                text: "",
                updatedBy: "",
                updatedAt: null,
            },
            voiceEnabled,
        };
        console.log("[createRoomService] creating room with payload:", {
            ...payload,
            passwordHash: passwordHash ? "[HASHED]" : "",
        });
        const room = await Room_model_1.RoomModel.create(payload);
        console.log("[createRoomService] room saved successfully:", {
            _id: room._id,
            roomId: room.roomId,
            name: room.name,
            creatorId: room.creatorId,
            members: room.members,
            voiceEnabled: room.voiceEnabled,
            hasPassword: room.hasPassword,
            createdAt: room.createdAt,
        });
        console.log("===== CREATE_ROOM_SERVICE_END =====\n");
        return {
            ok: true,
            room,
        };
    }
    catch (error) {
        console.error("[createRoomService] unexpected error:", {
            name: error?.name,
            message: error?.message,
            code: error?.code,
            stack: error?.stack,
        });
        console.log("===== CREATE_ROOM_SERVICE_END =====\n");
        return {
            ok: false,
            reason: "room_create_failed",
        };
    }
}
//# sourceMappingURL=room-create.service.js.map