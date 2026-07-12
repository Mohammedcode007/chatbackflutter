"use strict";
/*
  Room Clients Store

  هذا الملف مسؤول عن الغرف اللايف فقط:
  - مين موجود الآن داخل كل غرفة
  - كل مستخدم موجود في أي غرف
  - كل socket داخل أي غرف
  - آخر غرف كان فيها المستخدم قبل disconnect

  مهم:
  هذا لا يحفظ رسائل.
  الرسائل Live فقط.
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.addUserToRoom = addUserToRoom;
exports.updateRoomUserInfo = updateRoomUserInfo;
exports.updateRoomUserRole = updateRoomUserRole;
exports.removeUserFromRoom = removeUserFromRoom;
exports.removeSocketFromRoom = removeSocketFromRoom;
exports.getRoomUsers = getRoomUsers;
exports.getRoomUserIds = getRoomUserIds;
exports.getRoomUser = getRoomUser;
exports.getUserRooms = getUserRooms;
exports.getSocketRooms = getSocketRooms;
exports.isUserInRoom = isUserInRoom;
exports.getRoomActiveCount = getRoomActiveCount;
exports.disconnectSocketFromAllRooms = disconnectSocketFromAllRooms;
exports.disconnectUserFromAllRooms = disconnectUserFromAllRooms;
exports.getLastDisconnectedRooms = getLastDisconnectedRooms;
exports.clearLastDisconnectedRooms = clearLastDisconnectedRooms;
exports.consumeLastDisconnectedRooms = consumeLastDisconnectedRooms;
exports.clearRoom = clearRoom;
exports.clearAllRoomClients = clearAllRoomClients;
exports.getRoomClientsDebugState = getRoomClientsDebugState;
exports.getUserSocketIds = getUserSocketIds;
exports.removeUserFromSpecificRoom = removeUserFromSpecificRoom;
/*
  roomId -> users
*/
const roomUsers = new Map();
/*
  userId -> roomIds
*/
const userRooms = new Map();
/*
  socketId -> userId
*/
const socketUsers = new Map();
/*
  socketId -> roomIds
*/
const socketRooms = new Map();
/*
  userId -> rooms before disconnect
*/
const lastDisconnectedRooms = new Map();
function nowIso() {
    return new Date().toISOString();
}
function clean(value) {
    return String(value || "").trim();
}
function cleanRole(value) {
    const role = clean(value).toLowerCase();
    if (role === "creator" ||
        role === "owner" ||
        role === "admin" ||
        role === "member" ||
        role === "none") {
        return role;
    }
    return "none";
}
function cleanVerification(value) {
    const verification = clean(value).toLowerCase();
    if (verification === "blue" ||
        verification === "gold" ||
        verification === "business") {
        return verification;
    }
    return "none";
}
function ensureRoom(roomId) {
    if (!roomUsers.has(roomId)) {
        roomUsers.set(roomId, new Map());
    }
    return roomUsers.get(roomId);
}
function ensureUserRooms(userId) {
    if (!userRooms.has(userId)) {
        userRooms.set(userId, new Set());
    }
    return userRooms.get(userId);
}
function ensureSocketRooms(socketId) {
    if (!socketRooms.has(socketId)) {
        socketRooms.set(socketId, new Set());
    }
    return socketRooms.get(socketId);
}
function addUserToRoom(input) {
    const roomId = clean(input.roomId);
    const userId = clean(input.userId);
    const socketId = clean(input.socketId);
    if (!roomId || !userId || !socketId) {
        return null;
    }
    const username = clean(input.username);
    const photoUrl = clean(input.photoUrl);
    const room = ensureRoom(roomId);
    const oldInfo = room.get(userId);
    const info = {
        userId,
        username: username || oldInfo?.username || "",
        photoUrl: photoUrl || oldInfo?.photoUrl || "",
        socketId,
        joinedAt: oldInfo?.joinedAt || nowIso(),
        dc: input.dc === true,
        role: cleanRole(input.role || oldInfo?.role || "none"),
        accountColor: clean(input.accountColor || oldInfo?.accountColor || ""),
        badgeKey: clean(input.badgeKey || oldInfo?.badgeKey || ""),
        badgeName: clean(input.badgeName || oldInfo?.badgeName || ""),
        badgeValue: clean(input.badgeValue || oldInfo?.badgeValue || ""),
        verificationType: cleanVerification(input.verificationType || oldInfo?.verificationType || "none"),
    };
    room.set(userId, info);
    ensureUserRooms(userId).add(roomId);
    ensureSocketRooms(socketId).add(roomId);
    socketUsers.set(socketId, userId);
    /*
      لو رجع ودخل الغرفة، نحذفها من lastDisconnectedRooms.
    */
    const oldDisconnected = lastDisconnectedRooms.get(userId);
    if (oldDisconnected) {
        oldDisconnected.delete(roomId);
        if (oldDisconnected.size === 0) {
            lastDisconnectedRooms.delete(userId);
        }
    }
    return info;
}
function updateRoomUserInfo(input) {
    const roomId = clean(input.roomId);
    const userId = clean(input.userId);
    if (!roomId || !userId) {
        return null;
    }
    const room = roomUsers.get(roomId);
    if (!room) {
        return null;
    }
    const oldInfo = room.get(userId);
    if (!oldInfo) {
        return null;
    }
    const nextInfo = {
        ...oldInfo,
        username: clean(input.username) || oldInfo.username,
        photoUrl: clean(input.photoUrl) || oldInfo.photoUrl,
        role: cleanRole(input.role || oldInfo.role),
        accountColor: clean(input.accountColor) || oldInfo.accountColor,
        badgeKey: clean(input.badgeKey) || oldInfo.badgeKey,
        badgeName: clean(input.badgeName) || oldInfo.badgeName,
        badgeValue: clean(input.badgeValue) || oldInfo.badgeValue,
        verificationType: cleanVerification(input.verificationType || oldInfo.verificationType),
    };
    room.set(userId, nextInfo);
    return nextInfo;
}
function updateRoomUserRole(input) {
    return updateRoomUserInfo({
        roomId: input.roomId,
        userId: input.userId,
        role: input.role,
    });
}
function removeUserFromRoom(input) {
    const roomId = clean(input.roomId);
    const userId = clean(input.userId);
    const socketId = clean(input.socketId);
    if (!roomId || !userId) {
        return false;
    }
    roomUsers.get(roomId)?.delete(userId);
    if (roomUsers.get(roomId)?.size === 0) {
        roomUsers.delete(roomId);
    }
    userRooms.get(userId)?.delete(roomId);
    if (userRooms.get(userId)?.size === 0) {
        userRooms.delete(userId);
    }
    if (socketId) {
        socketRooms.get(socketId)?.delete(roomId);
        if (socketRooms.get(socketId)?.size === 0) {
            socketRooms.delete(socketId);
        }
    }
    return true;
}
function removeSocketFromRoom(input) {
    const roomId = clean(input.roomId);
    const socketId = clean(input.socketId);
    if (!roomId || !socketId) {
        return false;
    }
    const userId = socketUsers.get(socketId);
    if (!userId) {
        socketRooms.get(socketId)?.delete(roomId);
        return false;
    }
    return removeUserFromRoom({
        roomId,
        userId,
        socketId,
    });
}
function getRoomUsers(roomId) {
    const id = clean(roomId);
    return Array.from(roomUsers.get(id)?.values() || []);
}
function getRoomUserIds(roomId) {
    const id = clean(roomId);
    return Array.from(roomUsers.get(id)?.keys() || []);
}
function getRoomUser(input) {
    const roomId = clean(input.roomId);
    const userId = clean(input.userId);
    if (!roomId || !userId)
        return null;
    return roomUsers.get(roomId)?.get(userId) || null;
}
function getUserRooms(userId) {
    const id = clean(userId);
    return Array.from(userRooms.get(id) || []);
}
function getSocketRooms(socketId) {
    const id = clean(socketId);
    return Array.from(socketRooms.get(id) || []);
}
function isUserInRoom(input) {
    const roomId = clean(input.roomId);
    const userId = clean(input.userId);
    if (!roomId || !userId)
        return false;
    return roomUsers.get(roomId)?.has(userId) === true;
}
function getRoomActiveCount(roomId) {
    const id = clean(roomId);
    return roomUsers.get(id)?.size || 0;
}
/*
  تستخدمها عند socket disconnect.
  تخرج المستخدم من كل الغرف اللايف وتحفظ أسماء الغرف مؤقتًا حتى يرجع.
*/
function disconnectSocketFromAllRooms(input) {
    const socketId = clean(input.socketId);
    if (!socketId) {
        return {
            userId: "",
            rooms: [],
        };
    }
    const userId = socketUsers.get(socketId) || "";
    const rooms = Array.from(socketRooms.get(socketId) || []);
    if (userId && input.keepForReconnect !== false && rooms.length > 0) {
        lastDisconnectedRooms.set(userId, new Set(rooms));
    }
    for (const roomId of rooms) {
        if (userId) {
            roomUsers.get(roomId)?.delete(userId);
            if (roomUsers.get(roomId)?.size === 0) {
                roomUsers.delete(roomId);
            }
            userRooms.get(userId)?.delete(roomId);
        }
    }
    if (userId && userRooms.get(userId)?.size === 0) {
        userRooms.delete(userId);
    }
    socketRooms.delete(socketId);
    socketUsers.delete(socketId);
    return {
        userId,
        rooms,
    };
}
/*
  تستخدمها لو عندك userId مباشرة وليس socketId.
*/
function disconnectUserFromAllRooms(input) {
    const userId = clean(input.userId);
    if (!userId) {
        return [];
    }
    const rooms = Array.from(userRooms.get(userId) || []);
    if (input.keepForReconnect !== false && rooms.length > 0) {
        lastDisconnectedRooms.set(userId, new Set(rooms));
    }
    for (const roomId of rooms) {
        roomUsers.get(roomId)?.delete(userId);
        if (roomUsers.get(roomId)?.size === 0) {
            roomUsers.delete(roomId);
        }
    }
    userRooms.delete(userId);
    /*
      امسح socketRooms المرتبطة بهذا المستخدم.
    */
    for (const [socketId, mappedUserId] of socketUsers.entries()) {
        if (mappedUserId === userId) {
            socketRooms.delete(socketId);
            socketUsers.delete(socketId);
        }
    }
    return rooms;
}
function getLastDisconnectedRooms(userId) {
    const id = clean(userId);
    return Array.from(lastDisconnectedRooms.get(id) || []);
}
function clearLastDisconnectedRooms(userId) {
    const id = clean(userId);
    if (!id)
        return;
    lastDisconnectedRooms.delete(id);
}
/*
  تستخدمها عند reconnect.
  ترجع المستخدم للغرف التي كان فيها قبل dc.
*/
function consumeLastDisconnectedRooms(userId) {
    const id = clean(userId);
    const rooms = getLastDisconnectedRooms(id);
    clearLastDisconnectedRooms(id);
    return rooms;
}
/*
  تنظيف يدوي لو احتجت.
*/
function clearRoom(roomId) {
    const id = clean(roomId);
    const users = getRoomUserIds(id);
    for (const userId of users) {
        userRooms.get(userId)?.delete(id);
        if (userRooms.get(userId)?.size === 0) {
            userRooms.delete(userId);
        }
    }
    roomUsers.delete(id);
}
function clearAllRoomClients() {
    roomUsers.clear();
    userRooms.clear();
    socketUsers.clear();
    socketRooms.clear();
    lastDisconnectedRooms.clear();
}
/*
  للـ logs والفحص.
*/
function getRoomClientsDebugState() {
    return {
        rooms: Array.from(roomUsers.entries()).map(([roomId, users]) => ({
            roomId,
            count: users.size,
            users: Array.from(users.values()),
        })),
        userRooms: Array.from(userRooms.entries()).map(([userId, rooms]) => ({
            userId,
            rooms: Array.from(rooms),
        })),
        sockets: Array.from(socketRooms.entries()).map(([socketId, rooms]) => ({
            socketId,
            userId: socketUsers.get(socketId) || "",
            rooms: Array.from(rooms),
        })),
        lastDisconnectedRooms: Array.from(lastDisconnectedRooms.entries()).map(([userId, rooms]) => ({
            userId,
            rooms: Array.from(rooms),
        })),
    };
}
function getUserSocketIds(userIdValue) {
    const userId = clean(userIdValue);
    if (!userId) {
        return [];
    }
    const socketIds = [];
    for (const [socketId, mappedUserId] of socketUsers.entries()) {
        if (mappedUserId === userId) {
            socketIds.push(socketId);
        }
    }
    return socketIds;
}
function removeUserFromSpecificRoom(input) {
    const roomId = clean(input.roomId);
    const userId = clean(input.userId);
    if (!roomId || !userId) {
        return {
            ok: false,
            socketIds: [],
        };
    }
    const socketIds = getUserSocketIds(userId);
    roomUsers.get(roomId)?.delete(userId);
    if (roomUsers.get(roomId)?.size === 0) {
        roomUsers.delete(roomId);
    }
    userRooms.get(userId)?.delete(roomId);
    if (userRooms.get(userId)?.size === 0) {
        userRooms.delete(userId);
    }
    for (const socketId of socketIds) {
        socketRooms.get(socketId)?.delete(roomId);
        if (socketRooms.get(socketId)?.size === 0) {
            socketRooms.delete(socketId);
        }
    }
    lastDisconnectedRooms.get(userId)?.delete(roomId);
    if (lastDisconnectedRooms.get(userId)?.size === 0) {
        lastDisconnectedRooms.delete(userId);
    }
    return {
        ok: true,
        socketIds,
    };
}
//# sourceMappingURL=roomClients.store.js.map