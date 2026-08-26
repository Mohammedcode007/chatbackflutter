
// import type { Server as HttpServer } from "http";
// import WebSocket, { WebSocketServer } from "ws";

// import { clearUserActiveDmChat } from "./stores/dmActiveChats.store";

// import {
//   addClient,
//   getAllClients,
//   getClient,
//   removeClient,
// } from "./stores/clients.store";

// import { dispatchWsMessage } from "./ws.dispatcher";
// import { parseWsMessage, safeSend, sendError } from "./ws.utils";
// import { WS_EVENTS } from "./ws.events";

// import {
//   disconnectSocketFromAllRooms,
//   getRoomUsers,
// } from "./stores/roomClients.store";

// import { makeRoomSystemMessage } from "../modules/rooms/services/room-message.service";

// function clean(value: any) {
//   return String(value || "").trim();
// }
// function makeDisconnectLeaveMessage(input: {
//   roomId: string;
//   userId: string;
//   username: string;
//   photoUrl?: string;
// }) {
//   const now = Date.now();

//   const username = clean(input.username) || "User";

//   return {
//     messageId: `leave_${input.userId}_${now}`,
//     roomId: input.roomId,

//     messageKind: "leave",
//     type: "none",

//     fromUserId: input.userId,
//     fromUsername: username,
//     fromPhotoUrl: clean(input.photoUrl),
//     fromRole: "none",

//     text: `${username} خرج`,

//     media: null,
//     mention: null,
//     gift: null,
//     entryVideo: null,
//     replyTo: null,
//     reactions: [],

//     accountColor: "",
//     badgeKey: "",
//     badgeName: "",
//     badgeValue: "",
//     verificationType: "none",

//     system: {
//       action: "leave",
//       actorId: input.userId,
//       actorUsername: username,
//       targetUserId: input.userId,
//       targetUsername: username,
//       dc: true,
//     },

//     createdAt: new Date().toISOString(),
//   };
// }

// function broadcastToRoom(roomId: string, payload: any) {
//   const roomUsers = getRoomUsers(roomId);
//   const clients = getAllClients();

//   for (const roomUser of roomUsers) {
//     for (const [socket, client] of clients.entries()) {
//       if (client.userId !== roomUser.userId) continue;
//       if (socket.readyState !== WebSocket.OPEN) continue;

//       safeSend(socket, payload);
//     }
//   }
// }

// function cleanupSocket(socket: WebSocket) {
//   const client = getClient(socket);

//   if (client?.userId) {
//     clearUserActiveDmChat(client.userId);
//   }

//   /*
//     مهم:
//     هنا نستخدم connectionId لأنه هو نفس socketId الذي يجب إرساله في joinRoomService.
//   */
//   const socketId = clean(client?.connectionId);

//   if (socketId) {
//     const result = disconnectSocketFromAllRooms({
//       socketId,
//       keepForReconnect: true,
//     });

//     /*
//       إرسال leave live لكل غرفة كان فيها المستخدم.
//       لا يتم حفظ الرسالة.
//     */
//     if (result.userId) {
//       for (const roomId of result.rooms) {
//         broadcastToRoom(roomId, {
//           handler: WS_EVENTS.ROOM_MESSAGE_EVENT,
//           type: "system",
//           message: makeRoomSystemMessage({
//             roomId,
//             action: "leave",
//             targetUserId: result.userId,
//             targetUsername:
//               clean((client as any).username) ||
//               clean((client as any).displayName) ||
//               result.userId,
//             text: `${
//               clean((client as any).username) ||
//               clean((client as any).displayName) ||
//               result.userId
//             } خرج من الغرفة`,
//           }),
//         });

//         broadcastToRoom(roomId, {
//           handler: WS_EVENTS.ROOM_ACTIVE_COUNT_EVENT,
//           type: "update",
//           roomId,
//         });
//       }
//     }
//   }

//   removeClient(socket);
// }

// export function initWebSocketServer(server: HttpServer) {
//   const wss = new WebSocketServer({
//     server,
//     path: "/ws",
//   });

//   wss.on("connection", (socket: WebSocket) => {
//     addClient(socket);

//     const client = getClient(socket);

//     safeSend(socket, {
//       handler: WS_EVENTS.CONNECTION_EVENT,
//       type: "success",
//       reason: "null",
//       message: "connected",
//       connection_id: client?.connectionId,
//     });

//     socket.on("message", async (raw) => {
//       const client = getClient(socket);

//       if (client) {
//         client.lastSeenAt = new Date();
//       }

//    const message = parseWsMessage(raw);

// if (!message) {
//   sendError(
//     socket,
//     WS_EVENTS.ERROR_EVENT,
//     "invalid_json_or_missing_handler"
//   );
//   return;
// }

// /*
//   Ping من Flutter.
//   هذا غير socket.ping() الخاص بالـ ws protocol.
//   Flutter يرسل JSON handler=ping، فنرد عليه بـ pong.
// */
// if (message.handler === "ping") {
//   if (client) {
//     client.isAlive = true;
//     client.lastSeenAt = new Date();
//   }

//   safeSend(socket, {
//     handler: "pong",
//     type: "pong",
//     reason: "null",
//     message: "alive",
//     time: new Date().toISOString(),
//     request_id: message.request_id,
//   });

//   return;
// }

// try {
//   await dispatchWsMessage({
//     socket,
//     message,
//     client,
//   });
// } catch (error: any) {
//         sendError(
//           socket,
//           WS_EVENTS.ERROR_EVENT,
//           error?.message || "server_error",
//           message.request_id
//         );
//       }
//     });

//     socket.on("pong", () => {
//       const client = getClient(socket);

//       if (client) {
//         client.isAlive = true;
//         client.lastSeenAt = new Date();
//       }
//     });

//     socket.on("close", () => {
//       cleanupSocket(socket);
//     });

//     socket.on("error", () => {
//       cleanupSocket(socket);
//     });
//   });

//   const heartbeatInterval = setInterval(() => {
//     for (const [socket, client] of getAllClients().entries()) {
//       if (socket.readyState !== WebSocket.OPEN) {
//         cleanupSocket(socket);
//         continue;
//       }

//       if (!client.isAlive) {
//         cleanupSocket(socket);
//         socket.terminate();
//         continue;
//       }

//       client.isAlive = false;
//       socket.ping();
//     }
//   }, 30000);

//   wss.on("close", () => {
//     clearInterval(heartbeatInterval);
//   });

//   return wss;
// }
import type { Server as HttpServer } from "http";
import WebSocket, { WebSocketServer } from "ws";

import { clearUserActiveDmChat } from "./stores/dmActiveChats.store";

import {
  addClient,
  getAllClients,
  getClient,
  removeClient,
} from "./stores/clients.store";

import { dispatchWsMessage } from "./ws.dispatcher";
import { parseWsMessage, safeSend, sendError } from "./ws.utils";
import { WS_EVENTS } from "./ws.events";

import {
  disconnectSocketFromAllRooms,
  getRoomUsers,
} from "./stores/roomClients.store";

const ROOM_USERS_EVENT = "room.users";

function clean(value: any) {
  return String(value || "").trim();
}

function normalizeActiveUser(user: any) {
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

function getActiveUsers(roomId: string) {
  return getRoomUsers(roomId).map(normalizeActiveUser);
}

function makeDisconnectLeaveMessage(input: {
  roomId: string;
  userId: string;
  username: string;
  photoUrl?: string;
}) {
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

function broadcastToRoom(roomId: string, payload: any) {
  const roomUsers = getRoomUsers(roomId);
  const clients = getAllClients();

  for (const roomUser of roomUsers) {
    for (const [socket, client] of clients.entries()) {
      if (client.userId !== roomUser.userId) continue;
      if (socket.readyState !== WebSocket.OPEN) continue;

      safeSend(socket, payload);
    }
  }
}

/*
  حماية من تكرار cleanupSocket.
  لأن close و error أو heartbeat ممكن يستدعوا نفس الدالة أكثر من مرة.
*/
const cleanedSockets = new WeakSet<WebSocket>();

function cleanupSocket(socket: WebSocket) {
  if (cleanedSockets.has(socket)) {
    return;
  }

  cleanedSockets.add(socket);

  const client = getClient(socket);

  if (client?.userId) {
    clearUserActiveDmChat(client.userId);
  }

  /*
    مهم:
    هنا نستخدم connectionId لأنه هو نفس socketId الذي يتم إرساله في joinRoomService.
  */
  const socketId = clean(client?.connectionId);

  if (socketId) {
    const result = disconnectSocketFromAllRooms({
      socketId,
      keepForReconnect: true,
    });

    /*
      إرسال رسالة خروج live لكل غرفة كان فيها المستخدم.
      لا يتم حفظ الرسالة في قاعدة البيانات.
    */
    if (result.userId) {
      for (const roomId of result.rooms) {
        const username =
          clean((client as any).username) ||
          clean((client as any).displayName) ||
          result.userId;

        const photoUrl =
          clean((client as any).photoUrl) ||
          clean((client as any).avatarUrl) ||
          "";

        broadcastToRoom(roomId, {
          handler: WS_EVENTS.ROOM_MESSAGE_EVENT,
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
          handler: WS_EVENTS.ROOM_ACTIVE_COUNT_EVENT,
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

        broadcastToRoom(roomId, {
          handler: "room_event",
          type: "user_dc",
          userId: result.userId,
          username,
          message: `${username} غادر بسبب انقطاع الاتصال DC`,
        });
      }
    }
  }

  removeClient(socket);
}

export function initWebSocketServer(server: HttpServer) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
  });

  wss.on("connection", (socket: WebSocket) => {
    addClient(socket);

    const client = getClient(socket);

    safeSend(socket, {
      handler: WS_EVENTS.CONNECTION_EVENT,
      type: "success",
      reason: "null",
      message: "connected",
      connection_id: client?.connectionId,
    });

    socket.on("message", async (raw) => {
      const client = getClient(socket);

      if (client) {
        client.lastSeenAt = new Date();
      }

      const message = parseWsMessage(raw);

      if (!message) {
        sendError(
          socket,
          WS_EVENTS.ERROR_EVENT,
          "invalid_json_or_missing_handler"
        );
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

        safeSend(socket, {
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
        await dispatchWsMessage({
          socket,
          message,
          client,
        });
      } catch (error: any) {
        sendError(
          socket,
          WS_EVENTS.ERROR_EVENT,
          error?.message || "server_error",
          message.request_id
        );
      }
    });

    socket.on("pong", () => {
      const client = getClient(socket);

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
    for (const [socket, client] of getAllClients().entries()) {
      if (socket.readyState !== WebSocket.OPEN) {
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