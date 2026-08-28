// export type LoginPayload = {
//   handler: "auth.login" | "login";

//   request_id?: string;

//   username: string;
//   password: string;
//   session: string;
//   sdk: string;
//   ver: string;
//   id: string;
// };
// export type RegisterPayload = {
//   handler: "auth.register" | "register";
//   request_id?: string;
//   username: string;
//   password: string;
//   session: string;
//   sdk: string;
//   ver: string;
//   id: string;
// };

// export type LogoutPayload = {
//   handler: "auth.logout" | "logout";

//   request_id?: string;
// };

export type LoginPayload = {
  handler: "auth.login" | "login";

  request_id?: string;

  username: string;
  password: string;
  session: string;
  sdk: string;
  ver: string;
  id: string;

  /*
    معرف الجلسة الحالية المرسل من التطبيق (إن وُجد).
  */
  sessionId?: string;

  /*
    معلومات الجهاز الإضافية (اختياري).
  */
  deviceInfo?: string;
};

export type RegisterPayload = {
  handler: "auth.register" | "register";

  request_id?: string;

  username: string;
  password: string;
  session: string;
  sdk: string;
  ver: string;
  id: string;

  sessionId?: string;
  deviceInfo?: string;
};

export type ResumePayload = {
  handler: "auth.resume" | "resume";

  request_id?: string;

  /*
    الرمز المحفوظ داخل التطبيق.
  */
  token: string;

  /*
    معرّف جديد لاتصال السوكيت الحالي.
  */
  session: string;

  sdk?: string;
  ver?: string;
  id?: string;

  sessionId?: string;
  deviceInfo?: string;
};

export type LogoutPayload = {
  handler: "auth.logout" | "logout";

  request_id?: string;
};

export type ForgotPasswordPayload = {
  handler: "auth.forgot_password" | "forgot_password";

  request_id?: string;

  email: string;
};

export type VerifyOtpPayload = {
  handler: "auth.verify_otp" | "verify_otp";

  request_id?: string;

  email: string;
  otp: string;
};

export type ResetPasswordPayload = {
  handler: "auth.reset_password" | "reset_password";

  request_id?: string;

  email: string;
  otp: string;
  newPassword: string;
};