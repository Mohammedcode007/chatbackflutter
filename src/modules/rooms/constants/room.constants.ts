export const ROOM_LIMITS = {
  MAX_NAME_LENGTH: 50,
  MAX_USERS_PER_ROOM: 50,
  BOOST_DAYS: 30,
};

export const ROOM_ROLES = {
  CREATOR: "creator",
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
  NONE: "none",
} as const;

export const ROOM_LIST_TABS = {
  ACTIVE: "active",
  FAVORITE: "favorite",
  PUBLIC: "public",
  VOICE: "voice",
} as const;

export const ROOM_MESSAGE_TYPES = {
  USER: "user",
  JOIN: "join",
  LEAVE: "leave",
  GIFT: "gift",
  SYSTEM: "system",
} as const;

export const ROOM_USER_MESSAGE_TYPES = {
  TEXT: "text",
  IMAGE: "image",
  GIF: "gif",
} as const;