function clean(value: any) {
  return String(value || "").trim();
}

/*
  يحول IP مثل:
  ::ffff:192.168.1.10
  إلى:
  192.168.1.10
*/
export function normalizeIp(value: any) {
  let ip = clean(value);

  if (!ip) return "";

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
*/
export function getClientIp(context: any) {
  const socket = context?.socket;
  const handshake = socket?.handshake || {};
  const headers = handshake.headers || {};

  const cfIp = clean(headers["cf-connecting-ip"]);

  const forwardedFor = clean(headers["x-forwarded-for"])
    .split(",")
    .map((item) => clean(item))
    .filter(Boolean)[0];

  const realIp = clean(headers["x-real-ip"]);

  const socketIp =
    clean(handshake.address) ||
    clean(socket?.conn?.remoteAddress) ||
    clean(socket?.request?.connection?.remoteAddress) ||
    clean(socket?.request?.socket?.remoteAddress);

  return normalizeIp(cfIp || forwardedFor || realIp || socketIp);
}

/*
  فحص هل IP محظور داخل الغرفة.
*/
export function isIpBanned(input: {
  ip: string;
  bannedIps: string[];
}) {
  const ip = normalizeIp(input.ip);

  if (!ip) return false;

  const bannedIps = Array.isArray(input.bannedIps)
    ? input.bannedIps.map(normalizeIp).filter(Boolean)
    : [];

  return bannedIps.includes(ip);
}

/*
  إضافة IP للحظر بدون تكرار.
*/
export function addBannedIp(input: {
  ip: string;
  bannedIps: string[];
}) {
  const ip = normalizeIp(input.ip);

  const current = Array.isArray(input.bannedIps)
    ? input.bannedIps.map(normalizeIp).filter(Boolean)
    : [];

  if (!ip) return current;

  if (!current.includes(ip)) {
    current.push(ip);
  }

  return current;
}

/*
  إزالة IP من الحظر.
*/
export function removeBannedIp(input: {
  ip: string;
  bannedIps: string[];
}) {
  const ip = normalizeIp(input.ip);

  const current = Array.isArray(input.bannedIps)
    ? input.bannedIps.map(normalizeIp).filter(Boolean)
    : [];

  if (!ip) return current;

  return current.filter((item) => item !== ip);
}

/*
  للـ logs فقط.
*/
export function getIpDebugInfo(context: any) {
  const socket = context?.socket;
  const handshake = socket?.handshake || {};
  const headers = handshake.headers || {};

  return {
    ip: getClientIp(context),
    cfConnectingIp: clean(headers["cf-connecting-ip"]),
    xForwardedFor: clean(headers["x-forwarded-for"]),
    xRealIp: clean(headers["x-real-ip"]),
    handshakeAddress: clean(handshake.address),
    remoteAddress: clean(socket?.conn?.remoteAddress),
  };
}