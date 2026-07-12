"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROOM_USER_MESSAGE_TYPES = exports.ROOM_MESSAGE_TYPES = exports.ROOM_LIST_TABS = exports.ROOM_ROLES = exports.ROOM_LIMITS = void 0;
exports.ROOM_LIMITS = {
    MAX_NAME_LENGTH: 50,
    MAX_USERS_PER_ROOM: 50,
    BOOST_DAYS: 30,
};
exports.ROOM_ROLES = {
    CREATOR: "creator",
    OWNER: "owner",
    ADMIN: "admin",
    MEMBER: "member",
    NONE: "none",
};
exports.ROOM_LIST_TABS = {
    ACTIVE: "active",
    FAVORITE: "favorite",
    PUBLIC: "public",
    VOICE: "voice",
};
exports.ROOM_MESSAGE_TYPES = {
    USER: "user",
    JOIN: "join",
    LEAVE: "leave",
    GIFT: "gift",
    SYSTEM: "system",
};
exports.ROOM_USER_MESSAGE_TYPES = {
    TEXT: "text",
    IMAGE: "image",
    GIF: "gif",
};
//# sourceMappingURL=room.constants.js.map