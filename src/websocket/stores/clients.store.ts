import WebSocket from "ws";
import { ClientInfo } from "../ws.types";
import { createId } from "../../utils/id";

const clients = new Map<WebSocket, ClientInfo>();
const userSockets = new Map<string, Set<WebSocket>>();

export function addClient(
  socket: WebSocket,
  clientIp?: string,
  upgradeHeaders?: Record<string, string | string[] | undefined>
) {
  const now = new Date();

  clients.set(socket, {
    socket,
    connectionId: createId(),
    clientIp,
    upgradeHeaders,
    isLoggedIn: false,
    isAlive: true,
    rooms: new Set<string>(),
    connectedAt: now,
    lastSeenAt: now,
  });
}

export function getClient(socket: WebSocket) {
  return clients.get(socket);
}

export function getAllClients() {
  return clients;
}

function removeSocketFromUser(userId: string, socket: WebSocket) {
  const sockets = userSockets.get(userId);

  if (!sockets) return;

  sockets.delete(socket);

  if (sockets.size === 0) {
    userSockets.delete(userId);
  }
}

function addSocketToUser(userId: string, socket: WebSocket) {
  let sockets = userSockets.get(userId);

  if (!sockets) {
    sockets = new Set<WebSocket>();
    userSockets.set(userId, sockets);
  }

  sockets.add(socket);
}

export function updateClient(
  socket: WebSocket,
  data: Partial<ClientInfo>
) {
  const oldClient = clients.get(socket);
  if (!oldClient) return;

  /*
    مهم جدًا:
    لو المستخدم كان عامل login وبعدها logout
    لازم نحذف السوكيت من userSockets
    حتى لا يظهر Online ولا يستقبل رسائل.
  */
  if (oldClient.userId) {
    const willLogout = data.isLoggedIn === false;
    const willChangeUser =
      data.userId !== undefined && data.userId !== oldClient.userId;

    if (willLogout || willChangeUser) {
      removeSocketFromUser(oldClient.userId, socket);
    }
  }

  const nextClient: ClientInfo = {
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

export function removeClient(socket: WebSocket) {
  const client = clients.get(socket);

  if (client?.userId) {
    removeSocketFromUser(client.userId, socket);
  }

  clients.delete(socket);
}

export function getUserSockets(userId: string) {
  const sockets = userSockets.get(userId);

  if (!sockets) {
    return new Set<WebSocket>();
  }

  /*
    فلترة أمان:
    لا ترجع إلا السوكيتات المفتوحة والتي ما زالت loggedIn.
  */
  const validSockets = new Set<WebSocket>();

  for (const socket of sockets) {
    const client = clients.get(socket);

    if (
      socket.readyState === WebSocket.OPEN &&
      client?.isLoggedIn &&
      client.userId === userId
    ) {
      validSockets.add(socket);
    }
  }

  if (validSockets.size === 0) {
    userSockets.delete(userId);
  }

  return validSockets;
}

export function isUserOnline(userId: string) {
  return getUserSockets(userId).size > 0;
}
export function sendToUserIfOnline(userId: string, payload: any) {
  const sockets = getUserSockets(userId);

  if (sockets.size === 0) {
    return false;
  }

  const text = JSON.stringify(payload);

  for (const socket of sockets) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(text);
    }
  }

  return true;
}