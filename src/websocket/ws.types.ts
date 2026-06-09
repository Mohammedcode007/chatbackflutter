import WebSocket from "ws";

export type WsSocket = WebSocket;

export type WsMessage = {
  handler: string;
  request_id?: string;
  [key: string]: any;
};

export type WsResponse = {
  handler: string;
  type: "success" | "error";
  reason?: string;
  request_id?: string;
  [key: string]: any;
};

export type ClientInfo = {
  socket: WsSocket;

  connectionId: string;

  /**
   * MongoDB _id الداخلي
   * يستخدم في عمليات قاعدة البيانات فقط.
   */
  mongoId?: string;

  /**
   * userId العام الذي يتعامل به Flutter
   * مثال: 855516862
   */
  userId?: string;

  username?: string;
  photoUrl?: string;
  session?: string;

  isLoggedIn: boolean;
  isAlive: boolean;

  rooms: Set<string>;

  activeChatId?: string;
  activeRoomId?: string;

  connectedAt: Date;
  lastSeenAt: Date;
};

export type WsHandlerContext = {
  socket: WsSocket;
  message: WsMessage;
  client?: ClientInfo;
};

export type WsHandler = (
  context: WsHandlerContext
) => Promise<void> | void;