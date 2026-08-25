// import { LoginPayload, RegisterPayload } from "./auth.types";

// export function isLoginPayload(message: any): message is LoginPayload {
//   return (
//     message &&
//     (message.handler === "auth.login" || message.handler === "login") &&
//     typeof message.username === "string" &&
//     typeof message.password === "string" &&
//     typeof message.session === "string" &&
//     typeof message.sdk === "string" &&
//     typeof message.ver === "string" &&
//     typeof message.id === "string" &&
//     (message.request_id === undefined || typeof message.request_id === "string")
//   );
// }

// export function isRegisterPayload(message: any): message is RegisterPayload {
//   return (
//     message &&
//     (message.handler === "auth.register" || message.handler === "register") &&
//     typeof message.username === "string" &&
//     typeof message.password === "string" &&
//     typeof message.session === "string" &&
//     typeof message.sdk === "string" &&
//     typeof message.ver === "string" &&
//     typeof message.id === "string" &&
//     (message.request_id === undefined || typeof message.request_id === "string")
//   );
// }

import {
  LoginPayload,
  RegisterPayload,
  ResumePayload,
  ForgotPasswordPayload,
  VerifyOtpPayload,
  ResetPasswordPayload,
} from "./auth.types";

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
    (message.request_id === undefined ||
      typeof message.request_id === "string")
  );
}

export function isRegisterPayload(message: any): message is RegisterPayload {
  return (
    message &&
    (message.handler === "auth.register" ||
      message.handler === "register") &&
    typeof message.username === "string" &&
    typeof message.password === "string" &&
    typeof message.session === "string" &&
    typeof message.sdk === "string" &&
    typeof message.ver === "string" &&
    typeof message.id === "string" &&
    (message.request_id === undefined ||
      typeof message.request_id === "string")
  );
}

export function isResumePayload(message: any): message is ResumePayload {
  return (
    message &&
    (message.handler === "auth.resume" || message.handler === "resume") &&
    typeof message.token === "string" &&
    message.token.trim().length >= 32 &&
    typeof message.session === "string" &&
    message.session.trim().length > 0 &&
    (message.request_id === undefined ||
      typeof message.request_id === "string") &&
    (message.sdk === undefined || typeof message.sdk === "string") &&
    (message.ver === undefined || typeof message.ver === "string") &&
    (message.id === undefined || typeof message.id === "string")
  );
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isForgotPasswordPayload(
  message: any
): message is ForgotPasswordPayload {
  return (
    message &&
    (message.handler === "auth.forgot_password" ||
      message.handler === "forgot_password") &&
    typeof message.email === "string" &&
    EMAIL_REGEX.test(message.email.trim()) &&
    (message.request_id === undefined ||
      typeof message.request_id === "string")
  );
}

export function isVerifyOtpPayload(
  message: any
): message is VerifyOtpPayload {
  return (
    message &&
    (message.handler === "auth.verify_otp" ||
      message.handler === "verify_otp") &&
    typeof message.email === "string" &&
    EMAIL_REGEX.test(message.email.trim()) &&
    typeof message.otp === "string" &&
    message.otp.trim().length === 6 &&
    /^\d{6}$/.test(message.otp.trim()) &&
    (message.request_id === undefined ||
      typeof message.request_id === "string")
  );
}

export function isResetPasswordPayload(
  message: any
): message is ResetPasswordPayload {
  return (
    message &&
    (message.handler === "auth.reset_password" ||
      message.handler === "reset_password") &&
    typeof message.email === "string" &&
    EMAIL_REGEX.test(message.email.trim()) &&
    typeof message.otp === "string" &&
    message.otp.trim().length === 6 &&
    /^\d{6}$/.test(message.otp.trim()) &&
    typeof message.newPassword === "string" &&
    message.newPassword.trim().length >= 6 &&
    (message.request_id === undefined ||
      typeof message.request_id === "string")
  );
}