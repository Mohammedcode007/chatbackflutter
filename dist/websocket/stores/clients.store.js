"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addClient = addClient;
exports.getClient = getClient;
exports.getAllClients = getAllClients;
exports.updateClient = updateClient;
exports.removeClient = removeClient;
exports.getUserSockets = getUserSockets;
exports.isUserOnline = isUserOnline;
exports.sendToUserIfOnline = sendToUserIfOnline;
const ws_1 = __importDefault(require("ws"));
const id_1 = require("../../utils/id");
const clients = new Map();
const userSockets = new Map();
function addClient(socket) {
    const now = new Date();
    clients.set(socket, {
        socket,
        connectionId: (0, id_1.createId)(),
        isLoggedIn: false,
        isAlive: true,
        rooms: new Set(),
        connectedAt: now,
        lastSeenAt: now,
    });
}
function getClient(socket) {
    return clients.get(socket);
}
function getAllClients() {
    return clients;
}
function removeSocketFromUser(userId, socket) {
    const sockets = userSockets.get(userId);
    if (!sockets)
        return;
    sockets.delete(socket);
    if (sockets.size === 0) {
        userSockets.delete(userId);
    }
}
function addSocketToUser(userId, socket) {
    let sockets = userSockets.get(userId);
    if (!sockets) {
        sockets = new Set();
        userSockets.set(userId, sockets);
    }
    sockets.add(socket);
}
function updateClient(socket, data) {
    const oldClient = clients.get(socket);
    if (!oldClient)
        return;
    /*
      مهم جدًا:
      لو المستخدم كان عامل login وبعدها logout
      لازم نحذف السوكيت من userSockets
      حتى لا يظهر Online ولا يستقبل رسائل.
    */
    if (oldClient.userId) {
        const willLogout = data.isLoggedIn === false;
        const willChangeUser = data.userId !== undefined && data.userId !== oldClient.userId;
        if (willLogout || willChangeUser) {
            removeSocketFromUser(oldClient.userId, socket);
        }
    }
    const nextClient = {
        ...oldClient,
        ...data,
        lastSeenAt: new Date(),
    };
    clients.set(socket, nextClient);
    /*
      لا تضف السوكيت في online users إلا لو المستخدم loggedIn فعلًا.
    */
    if (nextClient.userId && nextClient.isLoggedIn) {
        addSocketToUser(nextClient.userId, socket);
    }
}
function removeClient(socket) {
    const client = clients.get(socket);
    if (client?.userId) {
        removeSocketFromUser(client.userId, socket);
    }
    clients.delete(socket);
}
function getUserSockets(userId) {
    const sockets = userSockets.get(userId);
    if (!sockets) {
        return new Set();
    }
    /*
      فلترة أمان:
      لا ترجع إلا السوكيتات المفتوحة والتي ما زالت loggedIn.
    */
    const validSockets = new Set();
    for (const socket of sockets) {
        const client = clients.get(socket);
        if (socket.readyState === ws_1.default.OPEN &&
            client?.isLoggedIn &&
            client.userId === userId) {
            validSockets.add(socket);
        }
    }
    if (validSockets.size === 0) {
        userSockets.delete(userId);
    }
    return validSockets;
}
function isUserOnline(userId) {
    return getUserSockets(userId).size > 0;
}
function sendToUserIfOnline(userId, payload) {
    const sockets = getUserSockets(userId);
    if (sockets.size === 0) {
        return false;
    }
    const text = JSON.stringify(payload);
    for (const socket of sockets) {
        if (socket.readyState === ws_1.default.OPEN) {
            socket.send(text);
        }
    }
    return true;
}
//# sourceMappingURL=clients.store.js.map