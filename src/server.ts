// import "dotenv/config";

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

import "dotenv/config";

import http from "http";

import { createApp } from "./app";
import { initWebSocketServer } from "./websocket/ws.server";
import { connectDatabase } from "./database/db";
import { env } from "./config/env";

import {
  startEphemeralCleanupWorker,
  stopEphemeralCleanupWorker,
  runEphemeralCleanup,
} from "./services/expiry/ephemeralExpiry.worker";

import { redis } from "./database/redis";

async function bootstrap() {
  /*
    الاتصال بـ MongoDB أولًا.
  */
  await connectDatabase();


  /*
    التأكد أن Redis جاهز قبل تشغيل Worker.

    لو Redis متصل بالفعل، ping سيعمل مباشرة.
  */
  try {
    const redisResult =
      await redis.ping();

    console.log(
      `Redis ping result: ${redisResult}`
    );
  } catch (error) {
    console.error(
      "Redis connection failed:",
      error
    );

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
    await runEphemeralCleanup();

    console.log(
      "Initial ephemeral cleanup completed"
    );
  } catch (error) {
    /*
      لا نوقف السيرفر إذا فشل تنظيف واحد،
      لأن Worker سيحاول مرة أخرى لاحقًا.
    */
    console.error(
      "Initial ephemeral cleanup failed:",
      error
    );
  }

  /*
    تشغيل Worker الدوري.

    سيبحث بشكل دوري عن:
    - التويتات المنتهية.
    - إشعارات التويتات المنتهية.
  */
  startEphemeralCleanupWorker();

  const app =
    createApp();

  const server =
    http.createServer(app);

  initWebSocketServer(
    server
  );

  server.listen(
    env.PORT,
    () => {
      console.log(
        `HTTP server running on port ${env.PORT}`
      );

      console.log(
        `WebSocket running on ws://localhost:${env.PORT}/ws`
      );

      console.log(
        "Ephemeral cleanup worker is running"
      );
    }
  );

  /*
    إغلاق منظم عند إيقاف السيرفر.
  */
  const shutdown =
    async (
      signal: string
    ) => {
      console.log(
        `${signal} received. Shutting down...`
      );

      /*
        إيقاف Worker حتى لا يبدأ عملية جديدة.
      */
      stopEphemeralCleanupWorker();

      /*
        إيقاف استقبال اتصالات جديدة.
      */
      server.close(
        async (serverError) => {
          if (serverError) {
            console.error(
              "HTTP server close error:",
              serverError
            );
          }

          try {
            await redis.quit();

            console.log(
              "Redis connection closed"
            );
          } catch (redisError) {
            console.error(
              "Redis close error:",
              redisError
            );
          }

          console.log(
            "Server stopped"
          );

          process.exit(
            serverError ? 1 : 0
          );
        }
      );

      /*
        حماية إذا علقت اتصالات HTTP المفتوحة.
      */
      setTimeout(
        () => {
          console.error(
            "Forced shutdown after timeout"
          );

          process.exit(1);
        },
        10000
      ).unref();
    };

  process.once(
    "SIGINT",
    () => {
      void shutdown(
        "SIGINT"
      );
    }
  );

  process.once(
    "SIGTERM",
    () => {
      void shutdown(
        "SIGTERM"
      );
    }
  );
}

bootstrap().catch(
  async (error) => {
    console.error(
      "Server failed to start:",
      error
    );

    stopEphemeralCleanupWorker();

    try {
      await redis.quit();
    } catch (_) {}

    process.exit(1);
  }
);