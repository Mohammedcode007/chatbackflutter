"use strict";
// import "dotenv/config";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// import http from "http";
// import { createApp } from "./app";
// import { initWebSocketServer } from "./websocket/ws.server";
// import { connectDatabase } from "./database/db";
// import { env } from "./config/env";
// async function bootstrap() {
//   await connectDatabase();
//   const app = createApp();
//   const server = http.createServer(app);
//   initWebSocketServer(server);
//   server.listen(env.PORT, () => {
//     console.log(`HTTP server running on port ${env.PORT}`);
//     console.log(`WebSocket running on ws://localhost:${env.PORT}/ws`);
//   });
// }
// bootstrap().catch((error) => {
//   console.error("Server failed to start:", error);
//   process.exit(1);
// });
require("dotenv/config");
const http_1 = __importDefault(require("http"));
const app_1 = require("./app");
const ws_server_1 = require("./websocket/ws.server");
const db_1 = require("./database/db");
const env_1 = require("./config/env");
const ephemeralExpiry_worker_1 = require("./services/expiry/ephemeralExpiry.worker");
const redis_1 = require("./database/redis");
async function bootstrap() {
    /*
      الاتصال بـ MongoDB أولًا.
    */
    await (0, db_1.connectDatabase)();
    /*
      التأكد أن Redis جاهز قبل تشغيل Worker.
  
      لو Redis متصل بالفعل، ping سيعمل مباشرة.
    */
    try {
        const redisResult = await redis_1.redis.ping();
        console.log(`Redis ping result: ${redisResult}`);
    }
    catch (error) {
        console.error("Redis connection failed:", error);
        /*
          نوقف تشغيل السيرفر لأن نظام انتهاء
          التويتات والإشعارات يعتمد على Redis.
        */
        throw error;
    }
    /*
      تنفيذ تنظيف فوري عند تشغيل السيرفر.
  
      هذا يحذف أي تويتات أو إشعارات انتهت
      أثناء توقف السيرفر.
    */
    try {
        await (0, ephemeralExpiry_worker_1.runEphemeralCleanup)();
        console.log("Initial ephemeral cleanup completed");
    }
    catch (error) {
        /*
          لا نوقف السيرفر إذا فشل تنظيف واحد،
          لأن Worker سيحاول مرة أخرى لاحقًا.
        */
        console.error("Initial ephemeral cleanup failed:", error);
    }
    /*
      تشغيل Worker الدوري.
  
      سيبحث بشكل دوري عن:
      - التويتات المنتهية.
      - إشعارات التويتات المنتهية.
    */
    (0, ephemeralExpiry_worker_1.startEphemeralCleanupWorker)();
    const app = (0, app_1.createApp)();
    const server = http_1.default.createServer(app);
    (0, ws_server_1.initWebSocketServer)(server);
    server.listen(env_1.env.PORT, () => {
        console.log(`HTTP server running on port ${env_1.env.PORT}`);
        console.log(`WebSocket running on ws://localhost:${env_1.env.PORT}/ws`);
        console.log("Ephemeral cleanup worker is running");
    });
    /*
      إغلاق منظم عند إيقاف السيرفر.
    */
    const shutdown = async (signal) => {
        console.log(`${signal} received. Shutting down...`);
        /*
          إيقاف Worker حتى لا يبدأ عملية جديدة.
        */
        (0, ephemeralExpiry_worker_1.stopEphemeralCleanupWorker)();
        /*
          إيقاف استقبال اتصالات جديدة.
        */
        server.close(async (serverError) => {
            if (serverError) {
                console.error("HTTP server close error:", serverError);
            }
            try {
                await redis_1.redis.quit();
                console.log("Redis connection closed");
            }
            catch (redisError) {
                console.error("Redis close error:", redisError);
            }
            console.log("Server stopped");
            process.exit(serverError ? 1 : 0);
        });
        /*
          حماية إذا علقت اتصالات HTTP المفتوحة.
        */
        setTimeout(() => {
            console.error("Forced shutdown after timeout");
            process.exit(1);
        }, 10000).unref();
    };
    process.once("SIGINT", () => {
        void shutdown("SIGINT");
    });
    process.once("SIGTERM", () => {
        void shutdown("SIGTERM");
    });
}
bootstrap().catch(async (error) => {
    console.error("Server failed to start:", error);
    (0, ephemeralExpiry_worker_1.stopEphemeralCleanupWorker)();
    try {
        await redis_1.redis.quit();
    }
    catch (_) { }
    process.exit(1);
});
//# sourceMappingURL=server.js.map