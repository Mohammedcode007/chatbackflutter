import "dotenv/config";

import http from "http";

import { createApp } from "./app";
import { initWebSocketServer } from "./websocket/ws.server";
import { connectDatabase } from "./database/db";
import { env } from "./config/env";

async function bootstrap() {
  await connectDatabase();

  const app = createApp();

  const server = http.createServer(app);

  initWebSocketServer(server);

  server.listen(env.PORT, () => {
    console.log(`HTTP server running on port ${env.PORT}`);
    console.log(`WebSocket running on ws://localhost:${env.PORT}/ws`);
  });
}

bootstrap().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});