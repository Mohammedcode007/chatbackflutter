"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeIp = normalizeIp;
exports.getClientIp = getClientIp;
exports.isIpBanned = isIpBanned;
exports.addBannedIp = addBannedIp;
exports.removeBannedIp = removeBannedIp;
exports.getIpDebugInfo = getIpDebugInfo;
function clean(value) {
    return String(value || "").trim();
}
/*
  يحول IP مثل:
  ::ffff:192.168.1.10
  إلى:
  192.168.1.10
*/
function normalizeIp(value) {
    let ip = clean(value);
    if (!ip)
        return "";
    if (ip.startsWith("::ffff:")) {
        ip = ip.replace("::ffff:", "");
    }
    /*
      لو IP فيه port مثل:
      192.168.1.10:5000
    */
    if (ip.includes(":")) {
        const parts = ip.split(":");
        if (parts.length === 2 && /^\d+$/.test(parts[1])) {
            ip = parts[0];
        }
    }
    return ip.trim();
}
/*
  استخراج IP من socket context.
  متوافق مع مكتبة ws (وليس Socket.IO):
  headers → context.client.upgradeHeaders (ملتقطة من طلب الـ upgrade)
  أو مباشرة context.client.clientIp.
*/
function getClientIp(context) {
    const client = context?.client;
    const socket = context?.socket;
    const upgradeHeaders = client?.upgradeHeaders || {};
    const clientIp = client?.clientIp || "";
    const cfIp = clean(upgradeHeaders["cf-connecting-ip"]);
    const forwardedFor = clean(upgradeHeaders["x-forwarded-for"])
        .split(",")
        .map((item) => clean(item))
        .filter(Boolean)[0];
    const realIp = clean(upgradeHeaders["x-real-ip"]);
    const remoteAddress = clean(socket?._socket?.remoteAddress) ||
        clean(socket?._sender?._socket?.remoteAddress);
    return normalizeIp(cfIp || forwardedFor || realIp || clientIp || remoteAddress);
}
/*
  فحص هل IP محظور داخل الغرفة.
*/
function isIpBanned(input) {
    const ip = normalizeIp(input.ip);
    if (!ip)
        return false;
    const bannedIps = Array.isArray(input.bannedIps)
        ? input.bannedIps.map(normalizeIp).filter(Boolean)
        : [];
    return bannedIps.includes(ip);
}
/*
  إضافة IP للحظر بدون تكرار.
*/
function addBannedIp(input) {
    const ip = normalizeIp(input.ip);
    const current = Array.isArray(input.bannedIps)
        ? input.bannedIps.map(normalizeIp).filter(Boolean)
        : [];
    if (!ip)
        return current;
    if (!current.includes(ip)) {
        current.push(ip);
    }
    return current;
}
/*
  إزالة IP من الحظر.
*/
function removeBannedIp(input) {
    const ip = normalizeIp(input.ip);
    const current = Array.isArray(input.bannedIps)
        ? input.bannedIps.map(normalizeIp).filter(Boolean)
        : [];
    if (!ip)
        return current;
    return current.filter((item) => item !== ip);
}
/*
  للـ logs فقط.
*/
function getIpDebugInfo(context) {
    const client = context?.client;
    const socket = context?.socket;
    const upgradeHeaders = client?.upgradeHeaders || {};
    return {
        ip: getClientIp(context),
        cfConnectingIp: clean(upgradeHeaders["cf-connecting-ip"]),
        xForwardedFor: clean(upgradeHeaders["x-forwarded-for"]),
        xRealIp: clean(upgradeHeaders["x-real-ip"]),
        clientIp: clean(client?.clientIp),
        remoteAddress: clean(socket?._socket?.remoteAddress),
    };
}
//# sourceMappingURL=room.ip.js.map