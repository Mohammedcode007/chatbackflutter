

export type StoreItemType =
  | "account_color"
  | "badge"
  | "image_badge"
  | "lottie_badge"
  | "verification";

export type StoreItem = {
  itemId: string;
  type: StoreItemType;
  key: string;
  name: string;
  value: string;
  price: number;
  durationDays: number;
};

export type StoreItemGroup =
  | "account_color"
  | "badge_group"
  | "verification";

export const STORE_PRICES = {
  account_color: 100,
  badge: 200,
  image_badge: 300,
  lottie_badge: 500,
  verification: 1000,
} as const;

export const STORE_DURATION_DAYS = 30;

export const STORE_ITEMS: StoreItem[] = [
  // Colors
  {
    itemId: "color_green",
    type: "account_color",
    key: "green",
    name: "Green",
    value: "#2BCB00",
    price: STORE_PRICES.account_color,
    durationDays: STORE_DURATION_DAYS,
  },
  {
    itemId: "color_blue",
    type: "account_color",
    key: "blue",
    name: "Blue",
    value: "#3B82F6",
    price: STORE_PRICES.account_color,
    durationDays: STORE_DURATION_DAYS,
  },
  {
    itemId: "color_purple",
    type: "account_color",
    key: "purple",
    name: "Purple",
    value: "#8B5CF6",
    price: STORE_PRICES.account_color,
    durationDays: STORE_DURATION_DAYS,
  },
  {
    itemId: "color_gold",
    type: "account_color",
    key: "gold",
    name: "Gold",
    value: "#F59E0B",
    price: STORE_PRICES.account_color,
    durationDays: STORE_DURATION_DAYS,
  },
  {
    itemId: "color_red",
    type: "account_color",
    key: "red",
    name: "Red",
    value: "#EF4444",
    price: STORE_PRICES.account_color,
    durationDays: STORE_DURATION_DAYS,
  },
  {
    itemId: "color_pink",
    type: "account_color",
    key: "pink",
    name: "Pink",
    value: "#EC4899",
    price: STORE_PRICES.account_color,
    durationDays: STORE_DURATION_DAYS,
  },
  {
    itemId: "color_teal",
    type: "account_color",
    key: "teal",
    name: "Teal",
    value: "#14B8A6",
    price: STORE_PRICES.account_color,
    durationDays: STORE_DURATION_DAYS,
  },

  // Emoji Badges القديمة
  {
    itemId: "badge_star",
    type: "badge",
    key: "star",
    name: "Star Badge",
    value: "⭐",
    price: STORE_PRICES.badge,
    durationDays: STORE_DURATION_DAYS,
  },
  {
    itemId: "badge_crown",
    type: "badge",
    key: "crown",
    name: "Crown Badge",
    value: "👑",
    price: STORE_PRICES.badge,
    durationDays: STORE_DURATION_DAYS,
  },
  {
    itemId: "badge_fire",
    type: "badge",
    key: "fire",
    name: "Fire Badge",
    value: "🔥",
    price: STORE_PRICES.badge,
    durationDays: STORE_DURATION_DAYS,
  },
  {
    itemId: "badge_diamond",
    type: "badge",
    key: "diamond",
    name: "Diamond Badge",
    value: "💎",
    price: STORE_PRICES.badge,
    durationDays: STORE_DURATION_DAYS,
  },

  // Image Badges الجديدة
  {
    itemId: "image_badge_eagle",
    type: "image_badge",
    key: "eagle",
    name: "Eagle Badge",
    value: "tps://te-bot.site/chatbackflutter/uploads/badges/eagle.png",
    price: STORE_PRICES.image_badge,
    durationDays: STORE_DURATION_DAYS,
  },
  {
    itemId: "image_badge_lion",
    type: "image_badge",
    key: "lion",
    name: "Lion Badge",
    value:
      "https://te-bot.site/chatbackflutter/uploads/badges/lion.png?v=101",
    price: STORE_PRICES.image_badge,
    durationDays: STORE_DURATION_DAYS,
  },
  {
    itemId: "image_badge_skull",
    type: "image_badge",
    key: "skull",
    name: "Skull Badge",
    value: "tps://te-bot.site/chatbackflutter/uploads/badges/skull.png",
    price: STORE_PRICES.image_badge,
    durationDays: STORE_DURATION_DAYS,
  },

  // Lottie Badges الجديدة
  {
    itemId: "lottie_badge_eagle_fire",
    type: "lottie_badge",
    key: "eagle_fire",
    name: "Eagle Fire Lottie",
    value: "tps://te-bot.site/chatbackflutter/uploads/badges/eagle-fire.json",
    price: STORE_PRICES.lottie_badge,
    durationDays: STORE_DURATION_DAYS,
  },
  {
    itemId: "lottie_badge_lion_gold",
    type: "lottie_badge",
    key: "lion_gold",
    name: "Lion Gold Lottie",
    value: "tps://te-bot.site/chatbackflutter/uploads/badges/lion-gold.json",
    price: STORE_PRICES.lottie_badge,
    durationDays: STORE_DURATION_DAYS,
  },
  {
    itemId: "lottie_badge_skull_dark",
    type: "lottie_badge",
    key: "skull_dark",
    name: "Skull Dark Lottie",
    value: "https://te-bot.site/chatbackflutter/uploads/badges/Skull1.json",
    price: STORE_PRICES.lottie_badge,
    durationDays: STORE_DURATION_DAYS,
  },
{
  itemId: "lottie_badge_batman_dark",
  type: "lottie_badge",
  key: "batman_dark",
  name: "Batman Dark Lottie",
  value: "https://te-bot.site/chatbackflutter/uploads/badges/bat1.json",
  price: STORE_PRICES.lottie_badge,
  durationDays: STORE_DURATION_DAYS,
},
  // Verification
  {
    itemId: "verify_blue",
    type: "verification",
    key: "blue",
    name: "Blue Verification",
    value: "blue",
    price: STORE_PRICES.verification,
    durationDays: STORE_DURATION_DAYS,
  },
  {
    itemId: "verify_gold",
    type: "verification",
    key: "gold",
    name: "Gold Verification",
    value: "gold",
    price: STORE_PRICES.verification,
    durationDays: STORE_DURATION_DAYS,
  },
  {
    itemId: "verify_business",
    type: "verification",
    key: "business",
    name: "Business Verification",
    value: "business",
    price: STORE_PRICES.verification,
    durationDays: STORE_DURATION_DAYS,
  },
];

export function findStoreItem(itemId: string) {
  return STORE_ITEMS.find((item) => item.itemId === itemId);
}

export function getStoreItemGroup(type: StoreItemType): StoreItemGroup {
  if (
    type === "badge" ||
    type === "image_badge" ||
    type === "lottie_badge"
  ) {
    return "badge_group";
  }

  return type;
}

export function isBadgeStoreItemType(type: StoreItemType) {
  return (
    type === "badge" ||
    type === "image_badge" ||
    type === "lottie_badge"
  );
}