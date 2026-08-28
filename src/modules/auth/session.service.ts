import crypto from "crypto";
import geoip from "geoip-lite";
import requestIp from "request-ip";
import type { IncomingMessage } from "http";
import type { Request } from "express";

import { SessionModel } from "../../models/Session.model";

/*
  استخراج عنوان IP الحقيقي من الطلب.
  يدعم both Express requests و WebSocket upgrade requests.
*/
export function extractClientIp(
  req: Request | IncomingMessage
): string | null {
  return requestIp.getClientIp(req as any);
}

/*
  تحويل IP إلى رمز الدولة (2 حرف ISO).
  fallback إلى "ALL" إذا لم يتم التعرف أو كان localhost.
*/
export function lookupCountryCode(
  ip: string | null
): string {
  if (!ip) return "ALL";

  if (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "::ffff:127.0.0.1" ||
    ip === "::ffff:192.168" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.")
  ) {
    return "ALL";
  }

  try {
    const geo = geoip.lookup(ip);

    if (geo && geo.country) {
      return geo.country;
    }
  } catch (err) {
    console.log("[GEOIP] Lookup failed:", err);
  }

  return "ALL";
}

/*
  استخراج معلومات الجهاز من User-Agent أو من البيانات المرسلة.
  يدعم Request objects و header records مباشرة.
*/
export function extractDeviceInfo(
  reqOrHeaders:
    | { headers?: Record<string, any> }
    | Record<string, any>
    | null
    | undefined,
  extra?: string
): string {
  if (extra) return extra;

  const headers =
    reqOrHeaders && typeof reqOrHeaders === "object" && "headers" in reqOrHeaders
      ? (reqOrHeaders as { headers?: Record<string, any> }).headers ?? {}
      : (reqOrHeaders as Record<string, any>) ?? {};

  const ua =
    (headers as any)?.["user-agent"] || "";

  return String(ua).substring(0, 200);
}

/*
  إنشاء جلسة جديدة في قاعدة البيانات.
*/
export async function createSessionRecord(input: {
  userId: string;
  sessionId: string;
  ipAddress: string;
  countryCode: string;
  deviceInfo: string;
}) {
  const record = await SessionModel.create({
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
export async function getActiveSessions(
  userId: string,
  currentSessionId: string
) {
  const sessions = await SessionModel.find({
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
export async function revokeSession(
  userId: string,
  sessionId: string
) {
  const result = await SessionModel.deleteOne({
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
export async function revokeOtherSessions(
  userId: string,
  currentSessionId: string
) {
  const result = await SessionModel.deleteMany({
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
export async function touchSession(
  sessionId: string
) {
  await SessionModel.updateOne(
    { sessionId },
    { lastActiveAt: new Date() }
  );
}

/*
  حذف جلسة عند تسجيل الخروج.
*/
export async function deleteSessionOnLogout(
  userId: string,
  sessionId: string
) {
  await SessionModel.deleteOne({
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
export function generateSessionId(): string {
  return crypto.randomBytes(16).toString("hex");
}
