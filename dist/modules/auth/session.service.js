"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractClientIp = extractClientIp;
exports.lookupCountryCode = lookupCountryCode;
exports.extractDeviceInfo = extractDeviceInfo;
exports.createSessionRecord = createSessionRecord;
exports.getActiveSessions = getActiveSessions;
exports.revokeSession = revokeSession;
exports.revokeOtherSessions = revokeOtherSessions;
exports.touchSession = touchSession;
exports.deleteSessionOnLogout = deleteSessionOnLogout;
exports.generateSessionId = generateSessionId;
const crypto_1 = __importDefault(require("crypto"));
const geoip_lite_1 = __importDefault(require("geoip-lite"));
const request_ip_1 = __importDefault(require("request-ip"));
const Session_model_1 = require("../../models/Session.model");
/*
  استخراج عنوان IP الحقيقي من الطلب.
  يدعم both Express requests و WebSocket upgrade requests.
*/
function extractClientIp(req) {
    return request_ip_1.default.getClientIp(req);
}
/*
  تحويل IP إلى رمز الدولة (2 حرف ISO).
  fallback إلى "ALL" إذا لم يتم التعرف أو كان localhost.
*/
function lookupCountryCode(ip) {
    if (!ip)
        return "ALL";
    if (ip === "127.0.0.1" ||
        ip === "::1" ||
        ip === "::ffff:127.0.0.1" ||
        ip === "::ffff:192.168" ||
        ip.startsWith("192.168.") ||
        ip.startsWith("10.") ||
        ip.startsWith("172.")) {
        return "ALL";
    }
    try {
        const geo = geoip_lite_1.default.lookup(ip);
        if (geo && geo.country) {
            return geo.country;
        }
    }
    catch (err) {
        console.log("[GEOIP] Lookup failed:", err);
    }
    return "ALL";
}
/*
  استخراج معلومات الجهاز من User-Agent أو من البيانات المرسلة.
  يدعم Request objects و header records مباشرة.
*/
function extractDeviceInfo(reqOrHeaders, extra) {
    if (extra)
        return extra;
    const headers = reqOrHeaders && typeof reqOrHeaders === "object" && "headers" in reqOrHeaders
        ? reqOrHeaders.headers ?? {}
        : reqOrHeaders ?? {};
    const ua = headers?.["user-agent"] || "";
    return String(ua).substring(0, 200);
}
/*
  إنشاء جلسة جديدة في قاعدة البيانات.
*/
async function createSessionRecord(input) {
    const record = await Session_model_1.SessionModel.create({
        userId: input.userId,
        sessionId: input.sessionId,
        ipAddress: input.ipAddress,
        countryCode: input.countryCode,
        deviceInfo: input.deviceInfo,
        lastActiveAt: new Date(),
    });
    console.log("[SESSION] Record created:", {
        userId: input.userId,
        sessionId: input.sessionId,
        countryCode: input.countryCode,
        ipAddress: input.ipAddress,
    });
    return record;
}
/*
  جلب جميع الجلسات النشطة للمستخدم.
  يُعلّم الجلسة الحالية بـ isCurrent = true.
*/
async function getActiveSessions(userId, currentSessionId) {
    const sessions = await Session_model_1.SessionModel.find({
        userId,
    })
        .sort({ createdAt: -1 })
        .lean();
    const totalSessions = sessions.length;
    return sessions.map((session) => ({
        sessionId: session.sessionId,
        ipAddress: session.ipAddress,
        countryCode: session.countryCode,
        deviceInfo: session.deviceInfo,
        createdAt: session.createdAt,
        lastActiveAt: session.lastActiveAt,
        isCurrent: session.sessionId === currentSessionId,
    }));
}
/*
  حذف جلسة محددة.
*/
async function revokeSession(userId, sessionId) {
    const result = await Session_model_1.SessionModel.deleteOne({
        userId,
        sessionId,
    });
    console.log("[SESSION] Revoked:", {
        userId,
        sessionId,
        deletedCount: result.deletedCount,
    });
    return result.deletedCount > 0;
}
/*
  حذف جميع الجلسات ما عدا الجلسة الحالية.
*/
async function revokeOtherSessions(userId, currentSessionId) {
    const result = await Session_model_1.SessionModel.deleteMany({
        userId,
        sessionId: { $ne: currentSessionId },
    });
    console.log("[SESSION] Revoked others:", {
        userId,
        currentSessionId,
        deletedCount: result.deletedCount,
    });
    return result.deletedCount;
}
/*
  تحديث lastActiveAt للجلسة.
*/
async function touchSession(sessionId) {
    await Session_model_1.SessionModel.updateOne({ sessionId }, { lastActiveAt: new Date() });
}
/*
  حذف جلسة عند تسجيل الخروج.
*/
async function deleteSessionOnLogout(userId, sessionId) {
    await Session_model_1.SessionModel.deleteOne({
        userId,
        sessionId,
    });
    console.log("[SESSION] Deleted on logout:", {
        userId,
        sessionId,
    });
}
/*
  إنشاء sessionId فريد.
*/
function generateSessionId() {
    return crypto_1.default.randomBytes(16).toString("hex");
}
//# sourceMappingURL=session.service.js.map