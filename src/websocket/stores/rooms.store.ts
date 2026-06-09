import WebSocket from "ws";
import { getClient } from "./clients.store";
import { safeSend } from "../ws.utils";

const roomSockets = new Map<string, Set<WebSocket>>();

export function joinSocketRoom(socket: WebSocket, roomId: string) {
  let sockets = roomSockets.get(roomId);

  if (!sockets) {
    sockets = new Set<WebSocket>();
    roomSockets.set(roomId, sockets);
  }

  sockets.add(socket);

  const client = getClient(socket);

  if (client) {
    client.rooms.add(roomId);
    client.activeRoomId = roomId;
  }
}

export function leaveSocketRoom(socket: WebSocket, roomId: string) {
  const sockets = roomSockets.get(roomId);

  if (sockets) {
    sockets.delete(socket);

    if (sockets.size === 0) {
      roomSockets.delete(roomId);
    }
  }

  const client = getClient(socket);

  if (client) {
    client.rooms.delete(roomId);

    if (client.activeRoomId === roomId) {
      client.activeRoomId = undefined;
    }
  }
}

export function leaveAllSocketRooms(socket: WebSocket) {
  const client = getClient(socket);

  if (!client) return;

  for (const roomId of client.rooms) {
    leaveSocketRoom(socket, roomId);
  }
}

export function sendToRoom(
  roomId: string,
  data: unknown,
  exceptSocket?: WebSocket
) {
  const sockets = roomSockets.get(roomId);

  if (!sockets) return;

  for (const socket of sockets) {
    if (exceptSocket && socket === exceptSocket) continue;

    safeSend(socket, data);
  }
}

export function getRoomOnlineCount(roomId: string) {
  return roomSockets.get(roomId)?.size || 0;
}