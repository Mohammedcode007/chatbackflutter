export type LoginPayload = {
  handler: "auth.login" | "login";

  request_id?: string;

  username: string;
  password: string;
  session: string;
  sdk: string;
  ver: string;
  id: string;
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
};

export type LogoutPayload = {
  handler: "auth.logout" | "logout";

  request_id?: string;
};