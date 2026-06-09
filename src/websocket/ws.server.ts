import type { Server as HttpServer } from "http";
import WebSocket, { WebSocketServer } from "ws";

import {
  addClient,
  getAllClients,
  getClient,
  removeClient,
} from "./stores/clients.store";

import { leaveAllSocketRooms } from "./stores/rooms.store";
import { dispatchWsMessage } from "./ws.dispatcher";
import { parseWsMessage, safeSend, sendError } from "./ws.utils";
import { WS_EVENTS } from "./ws.events";

function cleanupSocket(socket: WebSocket) {
  leaveAllSocketRooms(socket);
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