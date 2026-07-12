"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setRoomPinnedMessageService = setRoomPinnedMessageService;
exports.clearRoomPinnedMessageService = clearRoomPinnedMessageService;
exports.getRoomPinnedMessageService = getRoomPinnedMessageService;
const Room_model_1 = require("../models/Room.model");
const room_role_service_1 = require("./room-role.service");
const room_sanitize_1 = require("../utils/room.sanitize");
async function setRoomPinnedMessageService(input) {
    const actorId = (0, room_sanitize_1.sanitizeUserId)(input.actorId);
    const roomId = (0, room_sanitize_1.sanitizeRoomId)(input.roomId);
    const text = (0, room_sanitize_1.sanitizePinnedMessage)(input.text);
    if (!actorId || !roomId) {
        return {
            ok: false,
            reason: "invalid_pin_payload",
        };
    }
    const room = await Room_model_1.RoomModel.findOne({ roomId });
    if (!room) {
        return {
            ok: false,
            reason: "room_not_found",
        };
    }
    const actorRole = (0, room_role_service_1.getRoomRole)(room, actorId);
    /*
      creator و owner فقط يغيروا الرسالة المثبتة.
    */
    if (!(0, room_role_service_1.canRoomAction)(actorRole, "set_pinned_message")) {
        return {
            ok: false,
            reason: "no_permission",
        };
    }
    room.pinnedMessage = {
        text,
        updatedBy: actorId,
        updatedAt: new Date(),
    };
    await room.save();
    return {
        ok: true,
        room,
        pinnedMessage: room.pinnedMessage,
        actorRole,
    };
}
async function clearRoomPinnedMessageService(input) {
    const actorId = (0, room_sanitize_1.sanitizeUserId)(input.actorId);
    const roomId = (0, room_sanitize_1.sanitizeRoomId)(input.roomId);
    if (!actorId || !roomId) {
        return {
            ok: false,
            reason: "invalid_pin_payload",
        };
    }
    const room = await Room_model_1.RoomModel.findOne({ roomId });
    if (!room) {
        return {
            ok: false,
            reason: "room_not_found",
        };
    }
    const actorRole = (0, room_role_service_1.getRoomRole)(room, actorId);
    /*
      creator و owner فقط يحذفوا الرسالة المثبتة.
    */
    if (!(0, room_role_service_1.canRoomAction)(actorRole, "set_pinned_message")) {
        return {
            ok: false,
            reason: "no_permission",
        };
    }
    room.pinnedMessage = {
        text: "",
        updatedBy: actorId,
        updatedAt: new Date(),
    };
    await room.save();
    return {
        ok: true,
        room,
        pinnedMessage: room.pinnedMessage,
        actorRole,
    };
}
async function getRoomPinnedMessageService(input) {
    const roomId = (0, room_sanitize_1.sanitizeRoomId)(input.roomId);
    if (!roomId) {
        return {
            ok: false,
            reason: "invalid_room_id",
        };
    }
    const room = await Room_model_1.RoomModel.findOne({ roomId })
        .select("roomId pinnedMessage")
        .lean();
    if (!room) {
        return {
            ok: false,
            reason: "room_not_found",
        };
    }
    return {
        ok: true,
        roomId,
        pinnedMessage: room.pinnedMessage,
    };
}
//# sourceMappingURL=room-pin.service.js.map