"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinSocketRoom = joinSocketRoom;
exports.leaveSocketRoom = leaveSocketRoom;
exports.leaveAllSocketRooms = leaveAllSocketRooms;
exports.sendToRoom = sendToRoom;
exports.getRoomOnlineCount = getRoomOnlineCount;
const clients_store_1 = require("./clients.store");
const ws_utils_1 = require("../ws.utils");
const roomSockets = new Map();
function joinSocketRoom(socket, roomId) {
    let sockets = roomSockets.get(roomId);
    if (!sockets) {
        sockets = new Set();
        roomSockets.set(roomId, sockets);
    }
    sockets.add(socket);
    const client = (0, clients_store_1.getClient)(socket);
    if (client) {
        client.rooms.add(roomId);
        client.activeRoomId = roomId;
    }
}
function leaveSocketRoom(socket, roomId) {
    const sockets = roomSockets.get(roomId);
    if (sockets) {
        sockets.delete(socket);
        if (sockets.size === 0) {
            roomSockets.delete(roomId);
        }
    }
    const client = (0, clients_store_1.getClient)(socket);
    if (client) {
        client.rooms.delete(roomId);
        if (client.activeRoomId === roomId) {
            client.activeRoomId = undefined;
        }
    }
}
function leaveAllSocketRooms(socket) {
    const client = (0, clients_store_1.getClient)(socket);
    if (!client)
        return;
    for (const roomId of client.rooms) {
        leaveSocketRoom(socket, roomId);
    }
}
function sendToRoom(roomId, data, exceptSocket) {
    const sockets = roomSockets.get(roomId);
    if (!sockets)
        return;
    for (const socket of sockets) {
        if (exceptSocket && socket === exceptSocket)
            continue;
        (0, ws_utils_1.safeSend)(socket, data);
    }
}
function getRoomOnlineCount(roomId) {
    return roomSockets.get(roomId)?.size || 0;
}
//# sourceMappingURL=rooms.store.js.map