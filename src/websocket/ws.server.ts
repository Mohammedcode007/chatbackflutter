// import type { Server as HttpServer } from "http";
// import WebSocket, { WebSocketServer } from "ws";
// import { clearUserActiveDmChat } from "./stores/dmActiveChats.store";
// import {
//   addClient,
//   getAllClients,
//   getClient,
//   removeClient,
// } from "./stores/clients.store";

// import { leaveAllSocketRooms } from "./stores/rooms.store";
// import { dispatchWsMessage } from "./ws.dispatcher";
// import { parseWsMessage, safeSend, sendError } from "./ws.utils";
// import { WS_EVENTS } from "./ws.events";

// function cleanupSocket(socket: WebSocket) {
//   const client = getClient(socket);

//   if (client?.userId) {
//     clearUserActiveDmChat(client.userId);
//   }

//   leaveAllSocketRooms(socket);
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

//       const message = parseWsMessage(raw);

//       if (!message) {
//         sendError(
//           socket,
//           WS_EVENTS.ERROR_EVENT,
//           "invalid_json_or_missing_handler"
//         );
//         return;
//       }

//       try {
//         await dispatchWsMessage({
//           socket,
//           message,
//           client,
//         });
//       } catch (error: any) {
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

import { makeRoomSystemMessage } from "../modules/rooms/services/room-message.service";

function clean(value: any) {
  return String(value || "").trim();
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

function cleanupSocket(socket: WebSocket) {
  const client = getClient(socket);

  if (client?.userId) {
    clearUserActiveDmChat(client.userId);
  }

  /*
    مهم:
    هنا نستخدم connectionId لأنه هو نفس socketId الذي يجب إرساله في joinRoomService.
  */
  const socketId = clean(client?.connectionId);

  if (socketId) {
    const result = disconnectSocketFromAllRooms({
      socketId,
      keepForReconnect: true,
    });

    /*
      إرسال leave live لكل غرفة كان فيها المستخدم.
      لا يتم حفظ الرسالة.
    */
    if (result.userId) {
      for (const roomId of result.rooms) {
        broadcastToRoom(roomId, {
          handler: WS_EVENTS.ROOM_MESSAGE_EVENT,
          type: "system",
          message: makeRoomSystemMessage({
            roomId,
            action: "leave",
            targetUserId: result.userId,
            targetUsername:
              clean((client as any).username) ||
              clean((client as any).displayName) ||
              result.userId,
            text: `${
              clean((client as any).username) ||
              clean((client as any).displayName) ||
              result.userId
            } خرج من الغرفة`,
          }),
        });

        broadcastToRoom(roomId, {
          handler: WS_EVENTS.ROOM_ACTIVE_COUNT_EVENT,
          type: "update",
          roomId,
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