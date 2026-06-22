import { UserModel } from "../../models/User.model";

export const TWEET_MAX_TEXT_LENGTH =
  Number(
    process.env.TWEET_MAX_TEXT_LENGTH ||
    1000
  );

export const TWEET_COMMENT_MAX_LENGTH =
  Number(
    process.env
      .TWEET_COMMENT_MAX_LENGTH || 500
  );

export const TWEET_MAX_IMAGES =
  Number(
    process.env.TWEET_MAX_IMAGES || 4
  );

export const TWEET_COOLDOWN_MS =
  Number(
    process.env
      .TWEET_CREATE_COOLDOWN_MS ||
    300000
  );

export function cleanText(
  value: unknown
) {
  return String(value || "").trim();
}

export function cleanId(
  value: unknown
) {
  return String(value || "").trim();
}

export function clampLimit(
  value: unknown,
  defaultValue = 20,
  maxValue = 50
) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }

  return Math.min(
    Math.max(
      Math.floor(parsed),
      1
    ),
    maxValue
  );
}

export function parseCursor(
  cursor?: string | null
) {
  if (!cursor) return null;

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
export function extractMentionNames(
  text: string
) {
  const matches =
    text.match(
      /@([^\s@,.:;!?()[\]{}<>]+)/gu
    ) || [];

  const result = matches
    .map((value) =>
      value.slice(1).trim().toLowerCase()
    )
    .filter(Boolean);

  return Array.from(new Set(result));
}

export async function resolveMentionedUsers(
  text: string,
  senderUserId: string
) {
  const names =
    extractMentionNames(text);

  if (names.length === 0) {
    return [];
  }

  const users = await UserModel.find({
    username: {
      $in: names,
    },

    userId: {
      $ne: senderUserId,
    },
  })
    .select(
      [
        "userId",
        "username",
        "photoUrl",
      ].join(" ")
    )
    .lean();

  return users;
}

export function publicTweetUser(
  user: any
) {
  if (!user) return null;

  const activeBadges =
    Array.isArray(user.inventory)
      ? user.inventory
        .filter(
          (item: any) =>
            item.type === "badge" &&
            item.isActive === true
        )
        .map((item: any) => ({
          itemId:
            item.itemId || "",
          key: item.key || "",
          name: item.name || "",
          value: item.value || "",
        }))
      : [];

  return {
    userId:
      String(user.userId || ""),

    username:
      String(user.username || ""),

    photoUrl:
      String(user.photoUrl || ""),

    accountColor:
      String(
        user.accountColor ||
        "#2BCB00"
      ),

    badgeKey:
      String(user.badgeKey || ""),

    badgeName:
      String(user.badgeName || ""),

    badgeValue:
      String(user.badgeValue || ""),

    badges: activeBadges,

    verificationType:
      String(
        user.verificationType ||
        "none"
      ),
  };
}
export type NormalizedTweetMediaItem = {
  type: "image" | "video";
  url: string;
  publicId: string;
  thumbnailUrl: string;
  width?: number;
  height?: number;
  duration?: number;
};

export function normalizeMediaItem(
  item: unknown
): NormalizedTweetMediaItem {
  const value =
    item && typeof item === "object"
      ? (item as Record<string, unknown>)
      : {};

  return {
    type:
      value.type === "video"
        ? "video"
        : "image",

    url:
      cleanText(value.url),

    publicId:
      cleanText(
        value.publicId ??
        value.public_id
      ),

    thumbnailUrl:
      cleanText(
        value.thumbnailUrl ??
        value.thumbnail_url
      ),

    width:
      typeof value.width === "number"
        ? value.width
        : undefined,

    height:
      typeof value.height === "number"
        ? value.height
        : undefined,

    duration:
      typeof value.duration === "number"
        ? value.duration
        : undefined,
  };
}