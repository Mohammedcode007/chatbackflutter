"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushToUser = sendPushToUser;
const app_1 = require("firebase-admin/app");
const messaging_1 = require("firebase-admin/messaging");
const User_model_1 = require("../models/User.model");
let firebaseReady = false;
function initFirebaseAdmin() {
    if (firebaseReady)
        return;
    const projectId = process.env.FIREBASE_PROJECT_ID || "";
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || "";
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
    if (!projectId || !clientEmail || !privateKey) {
        console.warn("[FCM_ADMIN_NOT_READY] Missing Firebase env variables");
        return;
    }
    if ((0, app_1.getApps)().length === 0) {
        (0, app_1.initializeApp)({
            credential: (0, app_1.cert)({
                projectId,
                clientEmail,
                privateKey,
            }),
        });
    }
    firebaseReady = true;
    console.log("[FCM_ADMIN_READY]");
}
async function sendPushToUser(input) {
    initFirebaseAdmin();
    if (!firebaseReady) {
        return {
            ok: false,
            reason: "firebase_admin_not_ready",
        };
    }
    const user = await User_model_1.UserModel.findOne({
        userId: input.userId,
    }).lean();
    const tokens = Array.isArray(user?.fcmTokens)
        ? user.fcmTokens
            .map((item) => String(item?.token || "").trim())
            .filter(Boolean)
        : [];
    if (tokens.length === 0) {
        console.log("[FCM_NO_TOKENS]", {
            userId: input.userId,
        });
        return {
            ok: false,
            reason: "no_fcm_tokens",
        };
    }
    const response = await (0, messaging_1.getMessaging)().sendEachForMulticast({
        tokens,
        notification: {
            title: input.title,
            body: input.body,
        },
        data: input.data || {},
        android: {
            priority: "high",
            notification: {
                channelId: "high_importance_channel",
                sound: "default",
            },
        },
    });
    const invalidTokens = [];
    response.responses.forEach((item, index) => {
        if (!item.success) {
            const code = item.error?.code || "";
            if (code === "messaging/invalid-registration-token" ||
                code === "messaging/registration-token-not-registered") {
                invalidTokens.push(tokens[index]);
            }
            console.error("[FCM_SEND_ITEM_ERROR]", {
                token: tokens[index],
                code,
                message: item.error?.message,
            });
        }
    });
    if (invalidTokens.length > 0) {
        await User_model_1.UserModel.updateOne({
            userId: input.userId,
        }, {
            $pull: {
                fcmTokens: {
                    token: {
                        $in: invalidTokens,
                    },
                },
            },
        });
    }
    console.log("[FCM_SEND_DONE]", {
        userId: input.userId,
        successCount: response.successCount,
        failureCount: response.failureCount,
    });
    return {
        ok: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
    };
}
//# sourceMappingURL=pushNotification.service.js.map