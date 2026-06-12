const activeDmChats = new Map<string, string>();

export function setUserActiveDmChat(userId: string, chatId: string) {
  if (!userId || !chatId) return;

  activeDmChats.set(userId, chatId);
}

export function clearUserActiveDmChat(userId: string) {
  if (!userId) return;

  activeDmChats.delete(userId);
}

export function isUserActiveInDmChat(userId: string, chatId: string) {
  if (!userId || !chatId) return false;

  return activeDmChats.get(userId) === chatId;
}

export function getUserActiveDmChat(userId: string) {
  if (!userId) return "";

  return activeDmChats.get(userId) || "";
}