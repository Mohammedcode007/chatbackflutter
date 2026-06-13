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

type UserId = string;
type RoomId = string;
type SocketId = string;

export type RoomUserInfo = {
  userId: string;
  username: string;
  photoUrl: string;
  socketId: string;
  joinedAt: string;
  dc?: boolean;

  role: "creator" | "owner" | "admin" | "member" | "none";

  accountColor: string;

  badgeKey: string;
  badgeName: string;
  badgeValue: string;

  verificationType: "none" | "blue" | "gold" | "business" | string;
};

/*
  roomId -> users
*/
const roomUsers = new Map<RoomId, Map<UserId, RoomUserInfo>>();

/*
  userId -> roomIds
*/
const userRooms = new Map<UserId, Set<RoomId>>();

/*
  socketId -> userId
*/
const socketUsers = new Map<SocketId, UserId>();

/*
  socketId -> roomIds
*/
const socketRooms = new Map<SocketId, Set<RoomId>>();

/*
  userId -> rooms before disconnect
*/
const lastDisconnectedRooms = new Map<UserId, Set<RoomId>>();

function nowIso() {
  return new Date().toISOString();
}

function clean(value: any) {
  return String(value || "").trim();
}

function cleanRole(value: any): RoomUserInfo["role"] {
  const role = clean(value).toLowerCase();

  if (
    role === "creator" ||
    role === "owner" ||
    role === "admin" ||
    role === "member" ||
    role === "none"
  ) {
    return role;
  }

  return "none";
}

function cleanVerification(value: any) {
  const verification = clean(value).toLowerCase();

  if (
    verification === "blue" ||
    verification === "gold" ||
    verification === "business"
  ) {
    return verification;
  }

  return "none";
}

function ensureRoom(roomId: string) {
  if (!roomUsers.has(roomId)) {
    roomUsers.set(roomId, new Map<UserId, RoomUserInfo>());
  }

  return roomUsers.get(roomId)!;
}

function ensureUserRooms(userId: string) {
  if (!userRooms.has(userId)) {
    userRooms.set(userId, new Set<RoomId>());
  }

  return userRooms.get(userId)!;
}

function ensureSocketRooms(socketId: string) {
  if (!socketRooms.has(socketId)) {
    socketRooms.set(socketId, new Set<RoomId>());
  }

  return socketRooms.get(socketId)!;
}

export function addUserToRoom(input: {
  roomId: string;
  userId: string;
  username?: string;
  photoUrl?: string;
  socketId: string;
  dc?: boolean;

  role?: "creator" | "owner" | "admin" | "member" | "none" | string;

  accountColor?: string;

  badgeKey?: string;
  badgeName?: string;
  badgeValue?: string;

  verificationType?: "none" | "blue" | "gold" | "business" | string;
}) {
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

  const info: RoomUserInfo = {
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

    verificationType: cleanVerification(
      input.verificationType || oldInfo?.verificationType || "none"
    ),
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

export function updateRoomUserInfo(input: {
  roomId: string;
  userId: string;

  username?: string;
  photoUrl?: string;

  role?: string;

  accountColor?: string;

  badgeKey?: string;
  badgeName?: string;
  badgeValue?: string;

  verificationType?: string;
}) {
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

  const nextInfo: RoomUserInfo = {
    ...oldInfo,

    username: clean(input.username) || oldInfo.username,
    photoUrl: clean(input.photoUrl) || oldInfo.photoUrl,

    role: cleanRole(input.role || oldInfo.role),

    accountColor: clean(input.accountColor) || oldInfo.accountColor,

    badgeKey: clean(input.badgeKey) || oldInfo.badgeKey,
    badgeName: clean(input.badgeName) || oldInfo.badgeName,
    badgeValue: clean(input.badgeValue) || oldInfo.badgeValue,

    verificationType: cleanVerification(
      input.verificationType || oldInfo.verificationType
    ),
  };

  room.set(userId, nextInfo);

  return nextInfo;
}
export function updateRoomUserRole(input: {
  roomId: string;
  userId: string;
  role: "creator" | "owner" | "admin" | "member" | "none" | string;
}) {
  return updateRoomUserInfo({
    roomId: input.roomId,
    userId: input.userId,
    role: input.role,
  });
}
export function removeUserFromRoom(input: {
  roomId: string;
  userId: string;
  socketId?: string;
}) {
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

export function removeSocketFromRoom(input: {
  roomId: string;
  socketId: string;
}) {
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

export function getRoomUsers(roomId: string) {
  const id = clean(roomId);

  return Array.from(roomUsers.get(id)?.values() || []);
}

export function getRoomUserIds(roomId: string) {
  const id = clean(roomId);

  return Array.from(roomUsers.get(id)?.keys() || []);
}

export function getRoomUser(input: {
  roomId: string;
  userId: string;
}) {
  const roomId = clean(input.roomId);
  const userId = clean(input.userId);

  if (!roomId || !userId) return null;

  return roomUsers.get(roomId)?.get(userId) || null;
}

export function getUserRooms(userId: string) {
  const id = clean(userId);

  return Array.from(userRooms.get(id) || []);
}

export function getSocketRooms(socketId: string) {
  const id = clean(socketId);

  return Array.from(socketRooms.get(id) || []);
}

export function isUserInRoom(input: { roomId: string; userId: string }) {
  const roomId = clean(input.roomId);
  const userId = clean(input.userId);

  if (!roomId || !userId) return false;

  return roomUsers.get(roomId)?.has(userId) === true;
}

export function getRoomActiveCount(roomId: string) {
  const id = clean(roomId);

  return roomUsers.get(id)?.size || 0;
}

/*
  تستخدمها عند socket disconnect.
  تخرج المستخدم من كل الغرف اللايف وتحفظ أسماء الغرف مؤقتًا حتى يرجع.
*/
export function disconnectSocketFromAllRooms(input: {
  socketId: string;
  keepForReconnect?: boolean;
}) {
  const socketId = clean(input.socketId);

  if (!socketId) {
    return {
      userId: "",
      rooms: [] as string[],
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
export function disconnectUserFromAllRooms(input: {
  userId: string;
  keepForReconnect?: boolean;
}) {
  const userId = clean(input.userId);

  if (!userId) {
    return [] as string[];
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

export function getLastDisconnectedRooms(userId: string) {
  const id = clean(userId);

  return Array.from(lastDisconnectedRooms.get(id) || []);
}

export function clearLastDisconnectedRooms(userId: string) {
  const id = clean(userId);

  if (!id) return;

  lastDisconnectedRooms.delete(id);
}

/*
  تستخدمها عند reconnect.
  ترجع المستخدم للغرف التي كان فيها قبل dc.
*/
export function consumeLastDisconnectedRooms(userId: string) {
  const id = clean(userId);

  const rooms = getLastDisconnectedRooms(id);

  clearLastDisconnectedRooms(id);

  return rooms;
}

/*
  تنظيف يدوي لو احتجت.
*/
export function clearRoom(roomId: string) {
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

export function clearAllRoomClients() {
  roomUsers.clear();
  userRooms.clear();
  socketUsers.clear();
  socketRooms.clear();
  lastDisconnectedRooms.clear();
}

/*
  للـ logs والفحص.
*/
export function getRoomClientsDebugState() {
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

    lastDisconnectedRooms: Array.from(lastDisconnectedRooms.entries()).map(
      ([userId, rooms]) => ({
        userId,
        rooms: Array.from(rooms),
      })
    ),
  };
}