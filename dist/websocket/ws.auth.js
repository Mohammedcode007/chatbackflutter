"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireLogin = requireLogin;
const ws_utils_1 = require("./ws.utils");
function requireLogin(context, eventHandler) {
    if (!context.client?.isLoggedIn || !context.client.userId) {
        (0, ws_utils_1.sendError)(context.socket, eventHandler, "not_logged_in", context.message.request_id);
        return false;
    }
    return true;
}
//# sourceMappingURL=ws.auth.js.map