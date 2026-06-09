import WebSocket from "ws";
import { WsMessage, WsResponse } from "./ws.types";

export function safeSend(socket: WebSocket, data: unknown) {
  if (socket.readyState !== WebSocket.OPEN) return;

  socket.send(JSON.stringify(data));
}

export function sendSuccess(
  socket: WebSocket,
  data: Omit<WsResponse, "type">
) {
  safeSend(socket, {
    type: "success",
    reason: data.reason ?? "null",
    ...data,
  });
}

export function sendError(
  socket: WebSocket,
  handler: string,
  reason: string,
  requestId?: string
) {
  safeSend(socket, {
    handler,
    type: "error",
    reason,
    ...(requestId ? { request_id: requestId } : {}),
  });
}

export function parseWsMessage(raw: WebSocket.RawData): WsMessage | null {
  try {
    const data = JSON.parse(raw.toString());

    if (!data || typeof data !== "object") {
      return null;
    }

    if (!data.handler || typeof data.handler !== "string") {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}