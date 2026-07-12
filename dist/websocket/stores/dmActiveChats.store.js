"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUserActiveDmChat = setUserActiveDmChat;
exports.clearUserActiveDmChat = clearUserActiveDmChat;
exports.isUserActiveInDmChat = isUserActiveInDmChat;
exports.getUserActiveDmChat = getUserActiveDmChat;
const activeDmChats = new Map();
function setUserActiveDmChat(userId, chatId) {
    if (!userId || !chatId)
        return;
    activeDmChats.set(userId, chatId);
}
function clearUserActiveDmChat(userId) {
    if (!userId)
        return;
    activeDmChats.delete(userId);
}
function isUserActiveInDmChat(userId, chatId) {
    if (!userId || !chatId)
        return false;
    return activeDmChats.get(userId) === chatId;
}
function getUserActiveDmChat(userId) {
    if (!userId)
        return "";
    return activeDmChats.get(userId) || "";
}
//# sourceMappingURL=dmActiveChats.store.js.map