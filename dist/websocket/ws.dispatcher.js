"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchWsMessage = dispatchWsMessage;
const ws_utils_1 = require("./ws.utils");
const ws_events_1 = require("./ws.events");
const store_handlers_1 = require("../modules/store/store.handlers");
const auth_handlers_1 = require("../modules/auth/auth.handlers");
const friends_handlers_1 = require("../modules/friends/friends.handlers");
const chats_handlers_1 = require("../modules/chats/chats.handlers");
const room_handlers_1 = require("../modules/rooms/handlers/room.handlers");
const tweets_handlers_1 = require("../modules/tweets/tweets.handlers");
const notifications_handlers_1 = require("../modules/notifications/notifications.handlers");
const features_handlers_1 = require("../modules/features/features.handlers");
const users_handlers_1 = require("../modules/users/users.handlers");
const dm_handlers_1 = require("../modules/dm/dm.handlers");
const handlers = {
    ...auth_handlers_1.authHandlers,
    ...store_handlers_1.storeHandlers,
    ...friends_handlers_1.friendsHandlers,
    ...chats_handlers_1.chatsHandlers,
    ...room_handlers_1.roomHandlers,
    ...tweets_handlers_1.tweetsHandlers,
    ...notifications_handlers_1.notificationsHandlers,
    ...features_handlers_1.featuresHandlers,
    ...dm_handlers_1.dmHandlers,
    ...users_handlers_1.usersHandlers,
};
async function dispatchWsMessage(context) {
    const handlerName = context.message.handler;
    const handler = handlers[handlerName];
    if (!handler) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ERROR_EVENT, `unknown_handler:${handlerName}`, context.message.request_id);
        return;
    }
    try {
        await handler(context);
    }
    catch (error) {
        (0, ws_utils_1.sendError)(context.socket, ws_events_1.WS_EVENTS.ERROR_EVENT, error?.message || "server_error", context.message.request_id);
    }
}
//# sourceMappingURL=ws.dispatcher.js.map