"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeSend = safeSend;
exports.sendSuccess = sendSuccess;
exports.sendError = sendError;
exports.parseWsMessage = parseWsMessage;
const ws_1 = __importDefault(require("ws"));
function safeSend(socket, data) {
    if (socket.readyState !== ws_1.default.OPEN)
        return;
    socket.send(JSON.stringify(data));
}
function sendSuccess(socket, data) {
    safeSend(socket, {
        type: "success",
        reason: data.reason ?? "null",
        ...data,
    });
}
function sendError(socket, handler, reason, requestId) {
    safeSend(socket, {
        handler,
        type: "error",
        reason,
        ...(requestId ? { request_id: requestId } : {}),
    });
}
function parseWsMessage(raw) {
    try {
        const data = JSON.parse(raw.toString());
        if (!data || typeof data !== "object") {
            return null;
        }
        if (!data.handler || typeof data.handler !== "string") {
            return null;
        }
        return data;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=ws.utils.js.map