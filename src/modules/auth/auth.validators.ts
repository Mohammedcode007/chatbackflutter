import { LoginPayload, RegisterPayload } from "./auth.types";

export function isLoginPayload(message: any): message is LoginPayload {
  return (
    message &&
    (message.handler === "auth.login" || message.handler === "login") &&
    typeof message.username === "string" &&
    typeof message.password === "string" &&
    typeof message.session === "string" &&
    typeof message.sdk === "string" &&
    typeof message.ver === "string" &&
    typeof message.id === "string" &&
    (message.request_id === undefined || typeof message.request_id === "string")
  );
}

export function isRegisterPayload(message: any): message is RegisterPayload {
  return (
    message &&
    (message.handler === "auth.register" || message.handler === "register") &&
    typeof message.username === "string" &&
    typeof message.password === "string" &&
    typeof message.session === "string" &&
    typeof message.sdk === "string" &&
    typeof message.ver === "string" &&
    typeof message.id === "string" &&
    (message.request_id === undefined || typeof message.request_id === "string")
  );
}