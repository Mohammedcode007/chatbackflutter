"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TWEET_COOLDOWN_MS = exports.TWEET_MAX_IMAGES = exports.TWEET_COMMENT_MAX_LENGTH = exports.TWEET_MAX_TEXT_LENGTH = void 0;
exports.cleanText = cleanText;
exports.cleanId = cleanId;
exports.clampLimit = clampLimit;
exports.parseCursor = parseCursor;
exports.extractMentionNames = extractMentionNames;
exports.resolveMentionedUsers = resolveMentionedUsers;
exports.publicTweetUser = publicTweetUser;
exports.normalizeMediaItem = normalizeMediaItem;
const User_model_1 = require("../../models/User.model");
exports.TWEET_MAX_TEXT_LENGTH = Number(process.env.TWEET_MAX_TEXT_LENGTH ||
    1000);
exports.TWEET_COMMENT_MAX_LENGTH = Number(process.env
    .TWEET_COMMENT_MAX_LENGTH || 500);
exports.TWEET_MAX_IMAGES = Number(process.env.TWEET_MAX_IMAGES || 4);
exports.TWEET_COOLDOWN_MS = Number(process.env
    .TWEET_CREATE_COOLDOWN_MS ||
    300000);
function cleanText(value) {
    return String(value || "").trim();
}
function cleanId(value) {
    return String(value || "").trim();
}
function clampLimit(value, defaultValue = 20, maxValue = 50) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return defaultValue;
    }
    return Math.min(Math.max(Math.floor(parsed), 1), maxValue);
}
function parseCursor(cursor) {
    if (!cursor)
        return null;
    const date = new Date(cursor);
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    return date;
}
/*
  المنشن يدعم:
  @username
  ويتوقف عند المسافة أو علامات الترقيم.

  لأن أسماء المستخدمين عندك قد تكون مزخرفة،
  نحاول أولًا البحث عن النص الكامل بعد @.
*/
function extractMentionNames(text) {
    const matches = text.match(/@([^\s@,.:;!?()[\]{}<>]+)/gu) || [];
    const result = matches
        .map((value) => value.slice(1).trim().toLowerCase())
        .filter(Boolean);
    return Array.from(new Set(result));
}
async function resolveMentionedUsers(text, senderUserId) {
    const names = extractMentionNames(text);
    if (names.length === 0) {
        return [];
    }
    const users = await User_model_1.UserModel.find({
        username: {
            $in: names,
        },
        userId: {
            $ne: senderUserId,
        },
    })
        .select([
        "userId",
        "username",
        "photoUrl",
    ].join(" "))
        .lean();
    return users;
}
function publicTweetUser(user) {
    if (!user)
        return null;
    const activeBadges = Array.isArray(user.inventory)
        ? user.inventory
            .filter((item) => item.type === "badge" &&
            item.isActive === true)
            .map((item) => ({
            itemId: item.itemId || "",
            key: item.key || "",
            name: item.name || "",
            value: item.value || "",
        }))
        : [];
    return {
        userId: String(user.userId || ""),
        username: String(user.username || ""),
        photoUrl: String(user.photoUrl || ""),
        accountColor: String(user.accountColor ||
            "#2BCB00"),
        badgeKey: String(user.badgeKey || ""),
        badgeName: String(user.badgeName || ""),
        badgeValue: String(user.badgeValue || ""),
        badges: activeBadges,
        verificationType: String(user.verificationType ||
            "none"),
    };
}
function normalizeMediaItem(item) {
    const value = item && typeof item === "object"
        ? item
        : {};
    return {
        type: value.type === "video"
            ? "video"
            : "image",
        url: cleanText(value.url),
        publicId: cleanText(value.publicId ??
            value.public_id),
        thumbnailUrl: cleanText(value.thumbnailUrl ??
            value.thumbnail_url),
        width: typeof value.width === "number"
            ? value.width
            : undefined,
        height: typeof value.height === "number"
            ? value.height
            : undefined,
        duration: typeof value.duration === "number"
            ? value.duration
            : undefined,
    };
}
//# sourceMappingURL=tweets.utils.js.map