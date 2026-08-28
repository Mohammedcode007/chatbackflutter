import express from "express";
import cors from "cors";
import path from "path";
import crypto from "crypto";
import { UserModel } from "./models/User.model";
import {
  forgotPasswordService,
  verifyOtpService,
  resetPasswordService,
} from "./modules/auth/auth.service";
import {
  getActiveSessions,
  revokeOtherSessions,
  revokeSession,
} from "./modules/auth/session.service";
import { uploadBase64ToCloudinary } from "./modules/media/cloudinary.service";
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

  /*
    مصادقة الطلب عبر رمز الجلسة المحفوظ في Authorization header.
    يعيد المستخدم أو null إذا كانت الجلسة غير صالحة.
  */
  const authUserFromRequest = async (
    req: express.Request
  ) => {
    const authHeader = req.headers.authorization || "";
    const authToken = authHeader.replace("Bearer ", "").trim();

    if (!authToken) return null;

    const sessionTokenHash = crypto
      .createHash("sha256")
      .update(authToken)
      .digest("hex");

    const user = await UserModel.findOne({
      sessionTokenHash,
      $or: [
        { sessionExpiresAt: null },
        { sessionExpiresAt: { $gt: new Date() } },
      ],
    }).select("+sessionTokenHash +sessionExpiresAt");

    return user;
  };

  /*
    جلب جميع الجلسات النشطة للمستخدم الحالي.
  */
  app.get(
    ["/api/auth/sessions", "/chatbackflutter/api/auth/sessions"],
    async (req, res) => {
      try {
        const user = await authUserFromRequest(req);

        if (!user) {
          return res.status(401).json({
            success: false,
            message: "invalid_or_expired_token",
          });
        }

        const currentSessionId =
          req.query.sessionId?.toString() || "";

        const sessions = await getActiveSessions(
          user.userId,
          currentSessionId
        );

        return res.json({
          success: true,
          userId: user.userId,
          totalSessions: sessions.length,
          currentSessionId,
          sessions,
        });
      } catch (error) {
        console.error("[REST SESSIONS_ERROR]", error);

        return res.status(500).json({
          success: false,
          message: "internal_server_error",
        });
      }
    }
  );

  /*
    إلغاء جلسة محددة.
  */
  app.post(
    ["/api/auth/sessions/revoke", "/chatbackflutter/api/auth/sessions/revoke"],
    async (req, res) => {
      try {
        const user = await authUserFromRequest(req);

        if (!user) {
          return res.status(401).json({
            success: false,
            message: "invalid_or_expired_token",
          });
        }

        const sessionId = String(req.body?.sessionId || "").trim();

        if (!sessionId) {
          return res.status(400).json({
            success: false,
            message: "sessionId_required",
          });
        }

        const revoked = await revokeSession(user.userId, sessionId);

        return res.json({
          success: revoked,
          message: revoked
            ? "session_revoked"
            : "session_not_found",
        });
      } catch (error) {
        console.error("[REST SESSIONS_REVOKE_ERROR]", error);

        return res.status(500).json({
          success: false,
          message: "internal_server_error",
        });
      }
    }
  );

  /*
    إلغاء جميع الجلسات ما عدا الجلسة الحالية.
  */
  app.post(
    [
      "/api/auth/sessions/revoke-others",
      "/chatbackflutter/api/auth/sessions/revoke-others",
    ],
    async (req, res) => {
      try {
        const user = await authUserFromRequest(req);

        if (!user) {
          return res.status(401).json({
            success: false,
            message: "invalid_or_expired_token",
          });
        }

        const currentSessionId =
          String(req.body?.sessionId || "").trim();

        if (!currentSessionId) {
          return res.status(400).json({
            success: false,
            message: "sessionId_required",
          });
        }

        const revokedCount = await revokeOtherSessions(
          user.userId,
          currentSessionId
        );

        return res.json({
          success: true,
          revokedCount,
          message: "other_sessions_revoked",
        });
      } catch (error) {
        console.error("[REST SESSIONS_REVOKE_OTHERS_ERROR]", error);

        return res.status(500).json({
          success: false,
          message: "internal_server_error",
        });
      }
    }
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

  const forgotPasswordHandler = async (
    req: express.Request,
    res: express.Response
  ) => {
    try {
      const email = String(req.body?.email || "").trim().toLowerCase();

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
          success: false,
          message: "invalid_email",
        });
      }

      const result = await forgotPasswordService({
        handler: "auth.forgot_password",
        email,
      });

      if (!result.ok) {
        return res.status(400).json({
          success: false,
          message: result.reason,
        });
      }

      return res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error("[REST FORGOT_PASSWORD_ERROR]", error);
      return res.status(500).json({
        success: false,
        message: "internal_server_error",
      });
    }
  };

  const verifyOtpHandler = async (
    req: express.Request,
    res: express.Response
  ) => {
    try {
      const email = String(req.body?.email || "").trim().toLowerCase();
      const otp = String(req.body?.otp || "").trim();

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
          success: false,
          message: "invalid_email",
        });
      }

      if (!otp || !/^\d{6}$/.test(otp)) {
        return res.status(400).json({
          success: false,
          message: "invalid_otp",
        });
      }

      const result = await verifyOtpService({
        handler: "auth.verify_otp",
        email,
        otp,
      });

      if (!result.ok) {
        return res.status(400).json({
          success: false,
          message: result.reason,
        });
      }

      return res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error("[REST VERIFY_OTP_ERROR]", error);
      return res.status(500).json({
        success: false,
        message: "internal_server_error",
      });
    }
  };

  const resetPasswordHandler = async (
    req: express.Request,
    res: express.Response
  ) => {
    try {
      const email = String(req.body?.email || "").trim().toLowerCase();
      const otp = String(req.body?.otp || "").trim();
      const newPassword = String(req.body?.newPassword || "").trim();

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
          success: false,
          message: "invalid_email",
        });
      }

      if (!otp || !/^\d{6}$/.test(otp)) {
        return res.status(400).json({
          success: false,
          message: "invalid_otp",
        });
      }

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "password_too_short",
        });
      }

      const result = await resetPasswordService({
        handler: "auth.reset_password",
        email,
        otp,
        newPassword,
      });

      if (!result.ok) {
        return res.status(400).json({
          success: false,
          message: result.reason,
        });
      }

      return res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error("[REST RESET_PASSWORD_ERROR]", error);
      return res.status(500).json({
        success: false,
        message: "internal_server_error",
      });
    }
  };

  app.post(
    ["/api/auth/forgot-password", "/chatbackflutter/api/auth/forgot-password"],
    forgotPasswordHandler
  );

  app.post(
    ["/api/auth/verify-otp", "/chatbackflutter/api/auth/verify-otp"],
    verifyOtpHandler
  );

  app.post(
    ["/api/auth/reset-password", "/chatbackflutter/api/auth/reset-password"],
    resetPasswordHandler
  );

  /*
    رفع صورة الغرفة عبر HTTP REST.
    يرجع رابط CDN/Server الجاهز لإرساله مع room.create / room.update.

    يمكن إرسال kind اختياري:
    - chat_image (افتراضي) لصور الشات الخاص.
    - room_cover / room_image / room_cover_image لصور وأغلفة الغرف.
  */
  app.post(
    ["/api/media/upload/room-image", "/chatbackflutter/api/media/upload/room-image"],
    async (req, res) => {
      try {
        const user = await authUserFromRequest(req);

        if (!user) {
          return res.status(401).json({
            success: false,
            message: "invalid_or_expired_token",
          });
        }

        const base64 = String(req.body?.base64 || "").trim();

        if (!base64 || !base64.startsWith("data:")) {
          return res.status(400).json({
            success: false,
            message: "invalid_base64_file",
          });
        }

        const requestedKind = String(req.body?.kind || "").trim().toLowerCase();
        const isRoomCover =
          requestedKind === "room_cover" ||
          requestedKind === "room_image" ||
          requestedKind === "room_cover_image";

        const kind = isRoomCover ? "room_cover" : "chat_image";

        const result = await uploadBase64ToCloudinary({
          base64,
          kind,
          userId: user.userId,
        });

        if (!result.ok) {
          return res.status(400).json({
            success: false,
            message: result.reason,
          });
        }

        return res.json({
          success: true,
          url: result.url,
          publicId: result.publicId,
          data: {
            url: result.url,
            publicId: result.publicId,
          },
        });
      } catch (error) {
        console.error("[REST ROOM_IMAGE_UPLOAD_ERROR]", error);
        return res.status(500).json({
          success: false,
          message: "internal_server_error",
        });
      }
    }
  );

  return app;
}