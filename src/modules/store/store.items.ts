export type StoreItemType = "account_color" | "badge" | "verification";

export type StoreItem = {
  itemId: string;
  type: StoreItemType;
  key: string;
  name: string;
  value: string;
  price: number;
  durationDays: number;
};

export const STORE_PRICES = {
  account_color: 100,
  badge: 200,
  verification: 1000,
} as const;

export const STORE_DURATION_DAYS = 30;

export const STORE_ITEMS: StoreItem[] = [
  // Colors - كل الألوان نفس السعر ونفس المدة
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

  // Badges - كل البادجات نفس السعر ونفس المدة
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

  // Verification - كل التوثيق نفس السعر ونفس المدة
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