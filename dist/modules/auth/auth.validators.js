"use strict";
// import { LoginPayload, RegisterPayload } from "./auth.types";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLoginPayload = isLoginPayload;
exports.isRegisterPayload = isRegisterPayload;
exports.isResumePayload = isResumePayload;
function isLoginPayload(message) {
    return (message &&
        (message.handler === "auth.login" || message.handler === "login") &&
        typeof message.username === "string" &&
        typeof message.password === "string" &&
        typeof message.session === "string" &&
        typeof message.sdk === "string" &&
        typeof message.ver === "string" &&
        typeof message.id === "string" &&
        (message.request_id === undefined ||
            typeof message.request_id === "string"));
}
function isRegisterPayload(message) {
    return (message &&
        (message.handler === "auth.register" ||
            message.handler === "register") &&
        typeof message.username === "string" &&
        typeof message.password === "string" &&
        typeof message.session === "string" &&
        typeof message.sdk === "string" &&
        typeof message.ver === "string" &&
        typeof message.id === "string" &&
        (message.request_id === undefined ||
            typeof message.request_id === "string"));
}
function isResumePayload(message) {
    return (message &&
        (message.handler === "auth.resume" || message.handler === "resume") &&
        typeof message.token === "string" &&
        message.token.trim().length >= 32 &&
        typeof message.session === "string" &&
        message.session.trim().length > 0 &&
        (message.request_id === undefined ||
            typeof message.request_id === "string") &&
        (message.sdk === undefined || typeof message.sdk === "string") &&
        (message.ver === undefined || typeof message.ver === "string") &&
        (message.id === undefined || typeof message.id === "string"));
}
//# sourceMappingURL=auth.validators.js.map