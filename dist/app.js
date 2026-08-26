"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const User_model_1 = require("./models/User.model");
const auth_service_1 = require("./modules/auth/auth.service");
function createApp() {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    app.use(express_1.default.static(path_1.default.join(process.cwd(), "public")));
    app.use("/chatbackflutter", express_1.default.static(path_1.default.join(process.cwd(), "public")));
    /*
      استقبال FCM Token من تطبيق Flutter.
      هذا مؤقتًا للتأكد أن التوكن يصل للسيرفر.
      بعد نجاحه سنربطه بقاعدة البيانات.
    */
    app.post(["/api/users/fcm-token", "/chatbackflutter/api/users/fcm-token"], async (req, res) => {
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
            const sessionTokenHash = crypto_1.default
                .createHash("sha256")
                .update(authToken)
                .digest("hex");
            const user = await User_model_1.UserModel.findOne({
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
                ? user.fcmTokens.filter((item) => {
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
        }
        catch (error) {
            console.error("[FCM_TOKEN_SAVE_ERROR]", error);
            return res.status(500).json({
                success: false,
                message: "Failed to save FCM token",
            });
        }
    });
    app.use("/uploads", express_1.default.static(path_1.default.join(process.cwd(), "public/uploads")));
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
    const forgotPasswordHandler = async (req, res) => {
        try {
            const email = String(req.body?.email || "").trim().toLowerCase();
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: "invalid_email",
                });
            }
            const result = await (0, auth_service_1.forgotPasswordService)({
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
        }
        catch (error) {
            console.error("[REST FORGOT_PASSWORD_ERROR]", error);
            return res.status(500).json({
                success: false,
                message: "internal_server_error",
            });
        }
    };
    const verifyOtpHandler = async (req, res) => {
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
            const result = await (0, auth_service_1.verifyOtpService)({
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
        }
        catch (error) {
            console.error("[REST VERIFY_OTP_ERROR]", error);
            return res.status(500).json({
                success: false,
                message: "internal_server_error",
            });
        }
    };
    const resetPasswordHandler = async (req, res) => {
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
            const result = await (0, auth_service_1.resetPasswordService)({
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
        }
        catch (error) {
            console.error("[REST RESET_PASSWORD_ERROR]", error);
            return res.status(500).json({
                success: false,
                message: "internal_server_error",
            });
        }
    };
    app.post(["/api/auth/forgot-password", "/chatbackflutter/api/auth/forgot-password"], forgotPasswordHandler);
    app.post(["/api/auth/verify-otp", "/chatbackflutter/api/auth/verify-otp"], verifyOtpHandler);
    app.post(["/api/auth/reset-password", "/chatbackflutter/api/auth/reset-password"], resetPasswordHandler);
    return app;
}
//# sourceMappingURL=app.js.map