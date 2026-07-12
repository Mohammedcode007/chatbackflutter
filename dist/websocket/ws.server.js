"use strict";
// import type { Server as HttpServer } from "http";
// import WebSocket, { WebSocketServer } from "ws";
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
exports.initWebSocketServer = initWebSocketServer;
const ws_1 = __importStar(require("ws"));
const dmActiveChats_store_1 = require("./stores/dmActiveChats.store");
const clients_store_1 = require("./stores/clients.store");
const ws_dispatcher_1 = require("./ws.dispatcher");
const ws_utils_1 = require("./ws.utils");
const ws_events_1 = require("./ws.events");
const roomClients_store_1 = require("./stores/roomClients.store");
const ROOM_USERS_EVENT = "room.users";
function clean(value) {
    return String(value || "").trim();
}
function normalizeActiveUser(user) {
    return {
        userId: clean(user.userId),
        username: clean(user.username),
        photoUrl: clean(user.photoUrl),
        socketId: clean(user.socketId),
        joinedAt: user.joinedAt || "",
        dc: user.dc === true,
        role: clean(user.role || "none"),
        accountColor: clean(user.accountColor),
        badgeKey: clean(user.badgeKey),
        badgeName: clean(user.badgeName),
        badgeValue: clean(user.badgeValue),
        verificationType: clean(user.verificationType || "none"),
    };
}
function getActiveUsers(roomId) {
    return (0, roomClients_store_1.getRoomUsers)(roomId).map(normalizeActiveUser);
}
function makeDisconnectLeaveMessage(input) {
    const now = Date.now();
    const username = clean(input.username) || "User";
    return {
        messageId: `leave_${input.userId}_${now}`,
        roomId: input.roomId,
        messageKind: "leave",
        type: "none",
        fromUserId: input.userId,
        fromUsername: username,
        fromPhotoUrl: clean(input.photoUrl),
        fromRole: "none",
        text: `${username} خرج`,
        media: null,
        mention: null,
        gift: null,
        entryVideo: null,
        replyTo: null,
        reactions: [],
        accountColor: "",
        badgeKey: "",
        badgeName: "",
        badgeValue: "",
        verificationType: "none",
        system: {
            action: "leave",
            actorId: input.userId,
            actorUsername: username,
            targetUserId: input.userId,
            targetUsername: username,
            dc: true,
        },
        createdAt: new Date().toISOString(),
    };
}
function broadcastToRoom(roomId, payload) {
    const roomUsers = (0, roomClients_store_1.getRoomUsers)(roomId);
    const clients = (0, clients_store_1.getAllClients)();
    for (const roomUser of roomUsers) {
        for (const [socket, client] of clients.entries()) {
            if (client.userId !== roomUser.userId)
                continue;
            if (socket.readyState !== ws_1.default.OPEN)
                continue;
            (0, ws_utils_1.safeSend)(socket, payload);
        }
    }
}
/*
  حماية من تكرار cleanupSocket.
  لأن close و error أو heartbeat ممكن يستدعوا نفس الدالة أكثر من مرة.
*/
const cleanedSockets = new WeakSet();
function cleanupSocket(socket) {
    if (cleanedSockets.has(socket)) {
        return;
    }
    cleanedSockets.add(socket);
    const client = (0, clients_store_1.getClient)(socket);
    if (client?.userId) {
        (0, dmActiveChats_store_1.clearUserActiveDmChat)(client.userId);
    }
    /*
      مهم:
      هنا نستخدم connectionId لأنه هو نفس socketId الذي يتم إرساله في joinRoomService.
    */
    const socketId = clean(client?.connectionId);
    if (socketId) {
        const result = (0, roomClients_store_1.disconnectSocketFromAllRooms)({
            socketId,
            keepForReconnect: true,
        });
        /*
          إرسال رسالة خروج live لكل غرفة كان فيها المستخدم.
          لا يتم حفظ الرسالة في قاعدة البيانات.
        */
        if (result.userId) {
            for (const roomId of result.rooms) {
                const username = clean(client.username) ||
                    clean(client.displayName) ||
                    result.userId;
                const photoUrl = clean(client.photoUrl) ||
                    clean(client.avatarUrl) ||
                    "";
                broadcastToRoom(roomId, {
                    handler: ws_events_1.WS_EVENTS.ROOM_MESSAGE_EVENT,
                    type: "message",
                    roomId,
                    message: makeDisconnectLeaveMessage({
                        roomId,
                        userId: result.userId,
                        username,
                        photoUrl,
                    }),
                });
                const activeUsers = getActiveUsers(roomId);
                const activeCount = activeUsers.length;
                broadcastToRoom(roomId, {
                    handler: ws_events_1.WS_EVENTS.ROOM_ACTIVE_COUNT_EVENT,
                    type: "active_count",
                    roomId,
                    activeCount,
                    activeUsers,
                    users: activeUsers,
                });
                broadcastToRoom(roomId, {
                    handler: ROOM_USERS_EVENT,
                    type: "users",
                    roomId,
                    users: activeUsers,
                    activeUsers,
                    activeCount,
                });
            }
        }
    }
    (0, clients_store_1.removeClient)(socket);
}
function initWebSocketServer(server) {
    const wss = new ws_1.WebSocketServer({
        server,
        path: "/ws",
    });
    wss.on("connection", (socket) => {
        (0, clients_store_1.addClient)(socket);
        const client = (0, clients_store_1.getClient)(socket);
        (0, ws_utils_1.safeSend)(socket, {
            handler: ws_events_1.WS_EVENTS.CONNECTION_EVENT,
            type: "success",
            reason: "null",
            message: "connected",
            connection_id: client?.connectionId,
        });
        socket.on("message", async (raw) => {
            const client = (0, clients_store_1.getClient)(socket);
            if (client) {
                client.lastSeenAt = new Date();
            }
            const message = (0, ws_utils_1.parseWsMessage)(raw);
            if (!message) {
                (0, ws_utils_1.sendError)(socket, ws_events_1.WS_EVENTS.ERROR_EVENT, "invalid_json_or_missing_handler");
                return;
            }
            /*
              Ping من Flutter.
              هذا غير socket.ping() الخاص بالـ ws protocol.
              Flutter يرسل JSON handler=ping، فنرد عليه بـ pong.
            */
            if (message.handler === "ping") {
                if (client) {
                    client.isAlive = true;
                    client.lastSeenAt = new Date();
                }
                (0, ws_utils_1.safeSend)(socket, {
                    handler: "pong",
                    type: "pong",
                    reason: "null",
                    message: "alive",
                    time: new Date().toISOString(),
                    request_id: message.request_id,
                });
                return;
            }
            try {
                await (0, ws_dispatcher_1.dispatchWsMessage)({
                    socket,
                    message,
                    client,
                });
            }
            catch (error) {
                (0, ws_utils_1.sendError)(socket, ws_events_1.WS_EVENTS.ERROR_EVENT, error?.message || "server_error", message.request_id);
            }
        });
        socket.on("pong", () => {
            const client = (0, clients_store_1.getClient)(socket);
            if (client) {
                client.isAlive = true;
                client.lastSeenAt = new Date();
            }
        });
        socket.on("close", () => {
            cleanupSocket(socket);
        });
        socket.on("error", () => {
            cleanupSocket(socket);
        });
    });
    const heartbeatInterval = setInterval(() => {
        for (const [socket, client] of (0, clients_store_1.getAllClients)().entries()) {
            if (socket.readyState !== ws_1.default.OPEN) {
                cleanupSocket(socket);
                continue;
            }
            if (!client.isAlive) {
                cleanupSocket(socket);
                socket.terminate();
                continue;
            }
            client.isAlive = false;
            socket.ping();
        }
    }, 30000);
    wss.on("close", () => {
        clearInterval(heartbeatInterval);
    });
    return wss;
}
//# sourceMappingURL=ws.server.js.map