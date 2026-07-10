import express from "express";
import cors from "cors";
import path from "path";
import crypto from "crypto";
import { UserModel } from "./models/User.model";
export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use(
    express.static(path.join(process.cwd(), "public"))
  );

  app.use(
    "/chatbackflutter",
    express.static(path.join(process.cwd(), "public"))
  );

  /*
    استقبال FCM Token من تطبيق Flutter.
    هذا مؤقتًا للتأكد أن التوكن يصل للسيرفر.
    بعد نجاحه سنربطه بقاعدة البيانات.
  */
 app.post(
  ["/api/users/fcm-token", "/chatbackflutter/api/users/fcm-token"],
  async (req, res) => {
    try {
      const authHeader = req.headers.authorization || "";
      const authToken = authHeader.replace("Bearer ", "").trim();

      const fcmToken = req.body?.fcmToken?.toString().trim() || "";
      const platform = req.body?.platform?.toString().trim() || "android";

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🔥 [FCM_TOKEN_RECEIVED]");
      console.log("auth token exists:", authToken.length > 0);
      console.log("fcm token exists:", fcmToken.length > 0);
      console.log("fcm token:", fcmToken);
      console.log("platform:", platform);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      if (!authToken) {
        return res.status(401).json({
          success: false,
          message: "auth_token_required",
        });
      }

      if (!fcmToken) {
        return res.status(400).json({
          success: false,
          message: "fcmToken is required",
        });
      }

      const sessionTokenHash = crypto
        .createHash("sha256")
        .update(authToken)
        .digest("hex");

      const user = await UserModel.findOne({
        sessionTokenHash,
        $or: [
          {
            sessionExpiresAt: null,
          },
          {
            sessionExpiresAt: {
              $gt: new Date(),
            },
          },
        ],
      }).select("+sessionTokenHash +sessionExpiresAt");

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "invalid_or_expired_token",
        });
      }

      user.fcmTokens = Array.isArray(user.fcmTokens)
        ? user.fcmTokens.filter((item: any) => {
            return item?.token !== fcmToken;
          })
        : [];

      user.fcmTokens.push({
        token: fcmToken,
        platform,
        updatedAt: new Date(),
      });

      /*
        نخزن آخر 10 أجهزة فقط للمستخدم.
      */
      user.fcmTokens = user.fcmTokens.slice(-10);

      await user.save();

      console.log("✅ [FCM_TOKEN_SAVED]", {
        userId: user.userId,
        platform,
        tokensCount: user.fcmTokens.length,
      });

      return res.json({
        success: true,
        message: "FCM token saved",
      });
    } catch (error) {
      console.error("[FCM_TOKEN_SAVE_ERROR]", error);

      return res.status(500).json({
        success: false,
        message: "Failed to save FCM token",
      });
    }
  }
);

  app.use(
    "/uploads",
    express.static(path.join(process.cwd(), "public/uploads"))
  );

  app.get("/", (_req, res) => {
    res.json({
      ok: true,
      message: "Server is running",
    });
  });

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      websocket: true,
    });
  });

  return app;
}