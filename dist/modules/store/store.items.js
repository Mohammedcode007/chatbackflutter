// "use strict";
// Object.defineProperty(exports, "__esModule", { value: true });
// exports.STORE_ITEMS = exports.STORE_DURATION_DAYS = exports.STORE_PRICES = void 0;
// exports.findStoreItem = findStoreItem;
// exports.getStoreItemGroup = getStoreItemGroup;
// exports.isBadgeStoreItemType = isBadgeStoreItemType;
// exports.STORE_PRICES = {
//     account_color: 100,
//     badge: 200,
//     image_badge: 300,
//     lottie_badge: 500,
//     verification: 1000,
// };
// exports.STORE_DURATION_DAYS = 30;
// exports.STORE_ITEMS = [
//     // Colors
//     {
//         itemId: "color_green",
//         type: "account_color",
//         key: "green",
//         name: "Green",
//         value: "#2BCB00",
//         price: exports.STORE_PRICES.account_color,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "color_blue",
//         type: "account_color",
//         key: "blue",
//         name: "Blue",
//         value: "#3B82F6",
//         price: exports.STORE_PRICES.account_color,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "color_purple",
//         type: "account_color",
//         key: "purple",
//         name: "Purple",
//         value: "#8B5CF6",
//         price: exports.STORE_PRICES.account_color,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "color_gold",
//         type: "account_color",
//         key: "gold",
//         name: "Gold",
//         value: "#F59E0B",
//         price: exports.STORE_PRICES.account_color,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "color_red",
//         type: "account_color",
//         key: "red",
//         name: "Red",
//         value: "#EF4444",
//         price: exports.STORE_PRICES.account_color,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "color_pink",
//         type: "account_color",
//         key: "pink",
//         name: "Pink",
//         value: "#EC4899",
//         price: exports.STORE_PRICES.account_color,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "color_teal",
//         type: "account_color",
//         key: "teal",
//         name: "Teal",
//         value: "#14B8A6",
//         price: exports.STORE_PRICES.account_color,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     // Emoji Badges القديمة
//     {
//         itemId: "badge_star",
//         type: "badge",
//         key: "star",
//         name: "Star Badge",
//         value: "⭐",
//         price: exports.STORE_PRICES.badge,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "badge_crown",
//         type: "badge",
//         key: "crown",
//         name: "Crown Badge",
//         value: "👑",
//         price: exports.STORE_PRICES.badge,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "badge_fire",
//         type: "badge",
//         key: "fire",
//         name: "Fire Badge",
//         value: "🔥",
//         price: exports.STORE_PRICES.badge,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "badge_diamond",
//         type: "badge",
//         key: "diamond",
//         name: "Diamond Badge",
//         value: "💎",
//         price: exports.STORE_PRICES.badge,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     // Image Badges الجديدة
//     {
//         itemId: "image_badge_eagle",
//         type: "image_badge",
//         key: "eagle",
//         name: "Eagle Badge",
//         value: "tps://te-bot.site/chatbackflutter/uploads/badges/eagle.png",
//         price: exports.STORE_PRICES.image_badge,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "image_badge_lion",
//         type: "image_badge",
//         key: "lion",
//         name: "Lion Badge",
//         value: "https://te-bot.site/chatbackflutter/uploads/badges/lion.png?v=101",
//         price: exports.STORE_PRICES.image_badge,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "image_badge_skull",
//         type: "image_badge",
//         key: "skull",
//         name: "Skull Badge",
//         value: "https://te-bot.site/chatbackflutter/uploads/badges/skull.png",
//         price: exports.STORE_PRICES.image_badge,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "image_badge_heart",
//         type: "image_badge",
//         key: "heart",
//         name: "Heart Badge",
//         value: "https://te-bot.site/chatbackflutter/uploads/badges/heart.png?v=101",
//         price: exports.STORE_PRICES.image_badge,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "image_badge_wolf",
//         type: "image_badge",
//         key: "wolf",
//         name: "Wolf Badge",
//         value: "https://te-bot.site/chatbackflutter/uploads/badges/wolf.png?v=101",
//         price: exports.STORE_PRICES.image_badge,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "lottie_badge_teddy",
//         type: "lottie_badge",
//         key: "teddy",
//         name: "Teddy Lottie",
//         value: "https://te-bot.site/chatbackflutter/uploads/badges/Teddy.json",
//         price: exports.STORE_PRICES.lottie_badge,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "lottie_badge_blind",
//         type: "lottie_badge",
//         key: "blind",
//         name: "Blind Lottie",
//         value: "https://te-bot.site/chatbackflutter/uploads/badges/blind.json",
//         price: exports.STORE_PRICES.lottie_badge,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "lottie_badge_love",
//         type: "lottie_badge",
//         key: "love",
//         name: "Love Lottie",
//         value: "https://te-bot.site/chatbackflutter/uploads/badges/love.json",
//         price: exports.STORE_PRICES.lottie_badge,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "lottie_badge_skull",
//         type: "lottie_badge",
//         key: "skull",
//         name: "Skull Lottie",
//         value: "https://te-bot.site/chatbackflutter/uploads/badges/skull.json",
//         price: exports.STORE_PRICES.lottie_badge,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "lottie_badge_snake",
//         type: "lottie_badge",
//         key: "snake",
//         name: "Snake Lottie",
//         value: "https://te-bot.site/chatbackflutter/uploads/badges/Snake.json",
//         price: exports.STORE_PRICES.lottie_badge,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "lottie_badge_climb",
//         type: "lottie_badge",
//         key: "climb",
//         name: "Climb Lottie",
//         value: "https://te-bot.site/chatbackflutter/uploads/badges/ClMB.json",
//         price: exports.STORE_PRICES.lottie_badge,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "lottie_badge_money",
//         type: "lottie_badge",
//         key: "money",
//         name: "Money Lottie",
//         value: "https://te-bot.site/chatbackflutter/uploads/badges/Money.json",
//         price: exports.STORE_PRICES.lottie_badge,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "lottie_badge_koala",
//         type: "lottie_badge",
//         key: "koala",
//         name: "Koala Lottie",
//         value: "https://te-bot.site/chatbackflutter/uploads/badges/Koala.json",
//         price: exports.STORE_PRICES.lottie_badge,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "lottie_badge_panda",
//         type: "lottie_badge",
//         key: "panda",
//         name: "Panda Lottie",
//         value: "https://te-bot.site/chatbackflutter/uploads/badges/panda.json",
//         price: exports.STORE_PRICES.lottie_badge,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "lottie_badge_bird",
//         type: "lottie_badge",
//         key: "bird",
//         name: "Bird Lottie",
//         value: "https://te-bot.site/chatbackflutter/uploads/badges/bird.json",
//         price: exports.STORE_PRICES.lottie_badge,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "lottie_badge_itshot",
//         type: "lottie_badge",
//         key: "itshot",
//         name: "Itshot Lottie",
//         value: "https://te-bot.site/chatbackflutter/uploads/badges/itshot.json",
//         price: exports.STORE_PRICES.lottie_badge,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "lottie_badge_spider",
//         type: "lottie_badge",
//         key: "spider",
//         name: "Spider Lottie",
//         value: "https://te-bot.site/chatbackflutter/uploads/badges/Spider.json",
//         price: exports.STORE_PRICES.lottie_badge,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "lottie_badge_cat",
//         type: "lottie_badge",
//         key: "cat",
//         name: "Cat Lottie",
//         value: "https://te-bot.site/chatbackflutter/uploads/badges/cat.json",
//         price: exports.STORE_PRICES.lottie_badge,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "lottie_badge_butterfly",
//         type: "lottie_badge",
//         key: "butterfly",
//         name: "Butterfly Lottie",
//         value: "https://te-bot.site/chatbackflutter/uploads/badges/Butterfly.json",
//         price: exports.STORE_PRICES.lottie_badge,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     // Lottie Badges الجديدة
//     {
//         itemId: "lottie_badge_eagle_fire",
//         type: "lottie_badge",
//         key: "eagle_fire",
//         name: "Eagle Fire Lottie",
//         value: "tps://te-bot.site/chatbackflutter/uploads/badges/eagle-fire.json",
//         price: exports.STORE_PRICES.lottie_badge,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "lottie_badge_lion_gold",
//         type: "lottie_badge",
//         key: "lion_gold",
//         name: "Lion Gold Lottie",
//         value: "tps://te-bot.site/chatbackflutter/uploads/badges/lion-gold.json",
//         price: exports.STORE_PRICES.lottie_badge,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "lottie_badge_skull_dark",
//         type: "lottie_badge",
//         key: "skull_dark",
//         name: "Skull Dark Lottie",
//         value: "https://te-bot.site/chatbackflutter/uploads/badges/Skull1.json",
//         price: exports.STORE_PRICES.lottie_badge,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "lottie_badge_batman_dark",
//         type: "lottie_badge",
//         key: "batman_dark",
//         name: "Batman Dark Lottie",
//         value: "https://te-bot.site/chatbackflutter/uploads/badges/bat1.json",
//         price: exports.STORE_PRICES.lottie_badge,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     // Verification
//     {
//         itemId: "verify_blue",
//         type: "verification",
//         key: "blue",
//         name: "Blue Verification",
//         value: "blue",
//         price: exports.STORE_PRICES.verification,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "verify_gold",
//         type: "verification",
//         key: "gold",
//         name: "Gold Verification",
//         value: "gold",
//         price: exports.STORE_PRICES.verification,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
//     {
//         itemId: "verify_business",
//         type: "verification",
//         key: "business",
//         name: "Business Verification",
//         value: "business",
//         price: exports.STORE_PRICES.verification,
//         durationDays: exports.STORE_DURATION_DAYS,
//     },
// ];
// function findStoreItem(itemId) {
//     return exports.STORE_ITEMS.find((item) => item.itemId === itemId);
// }
// function getStoreItemGroup(type) {
//     if (type === "badge" ||
//         type === "image_badge" ||
//         type === "lottie_badge") {
//         return "badge_group";
//     }
//     return type;
// }
// function isBadgeStoreItemType(type) {
//     return (type === "badge" ||
//         type === "image_badge" ||
//         type === "lottie_badge");
// }
// //# sourceMappingURL=store.items.js.map


"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true,
});

exports.STORE_ITEMS = exports.STORE_DURATION_DAYS =
  exports.STORE_PRICES =
    void 0;

exports.findStoreItem = findStoreItem;
exports.getStoreItemGroup = getStoreItemGroup;
exports.isBadgeStoreItemType = isBadgeStoreItemType;

exports.STORE_PRICES = {
  account_color: 100,
  badge: 200,
  image_badge: 300,
  lottie_badge: 500,
  verification: 1000,
};

exports.STORE_DURATION_DAYS = 30;

/*
|--------------------------------------------------------------------------
| Account Colors
|--------------------------------------------------------------------------
*/

const ACCOUNT_COLORS = [
  {
    key: "red",
    name: "Red",
    value: "#EF4444",
  },
  {
    key: "orange",
    name: "Orange",
    value: "#F97316",
  },
  {
    key: "amber",
    name: "Amber",
    value: "#F59E0B",
  },
  {
    key: "yellow",
    name: "Yellow",
    value: "#EAB308",
  },
  {
    key: "lime",
    name: "Lime",
    value: "#84CC16",
  },
  {
    key: "green",
    name: "Green",
    value: "#22C55E",
  },
  {
    key: "emerald",
    name: "Emerald",
    value: "#10B981",
  },
  {
    key: "teal",
    name: "Teal",
    value: "#14B8A6",
  },
  {
    key: "cyan",
    name: "Cyan",
    value: "#06B6D4",
  },
  {
    key: "sky",
    name: "Sky",
    value: "#0EA5E9",
  },
  {
    key: "blue",
    name: "Blue",
    value: "#3B82F6",
  },
  {
    key: "indigo",
    name: "Indigo",
    value: "#6366F1",
  },
  {
    key: "violet",
    name: "Violet",
    value: "#8B5CF6",
  },
  {
    key: "purple",
    name: "Purple",
    value: "#A855F7",
  },
  {
    key: "fuchsia",
    name: "Fuchsia",
    value: "#D946EF",
  },
  {
    key: "pink",
    name: "Pink",
    value: "#EC4899",
  },
  {
    key: "rose",
    name: "Rose",
    value: "#F43F5E",
  },
  {
    key: "dark_red",
    name: "Dark Red",
    value: "#DC2626",
  },
  {
    key: "dark_orange",
    name: "Dark Orange",
    value: "#EA580C",
  },
  {
    key: "dark_amber",
    name: "Dark Amber",
    value: "#D97706",
  },
  {
    key: "dark_lime",
    name: "Dark Lime",
    value: "#65A30D",
  },
  {
    key: "dark_green",
    name: "Dark Green",
    value: "#16A34A",
  },
  {
    key: "dark_emerald",
    name: "Dark Emerald",
    value: "#059669",
  },
  {
    key: "dark_teal",
    name: "Dark Teal",
    value: "#0D9488",
  },
  {
    key: "dark_cyan",
    name: "Dark Cyan",
    value: "#0891B2",
  },
  {
    key: "dark_sky",
    name: "Dark Sky",
    value: "#0284C7",
  },
  {
    key: "royal_blue",
    name: "Royal Blue",
    value: "#2563EB",
  },
  {
    key: "dark_indigo",
    name: "Dark Indigo",
    value: "#4F46E5",
  },
  {
    key: "dark_violet",
    name: "Dark Violet",
    value: "#7C3AED",
  },
  {
    key: "dark_purple",
    name: "Dark Purple",
    value: "#9333EA",
  },
  {
    key: "dark_fuchsia",
    name: "Dark Fuchsia",
    value: "#C026D3",
  },
  {
    key: "dark_pink",
    name: "Dark Pink",
    value: "#DB2777",
  },
  {
    key: "dark_rose",
    name: "Dark Rose",
    value: "#E11D48",
  },
  {
    key: "maroon",
    name: "Maroon",
    value: "#7F1D1D",
  },
  {
    key: "burnt_orange",
    name: "Burnt Orange",
    value: "#7C2D12",
  },
  {
    key: "olive_brown",
    name: "Olive Brown",
    value: "#713F12",
  },
  {
    key: "olive_green",
    name: "Olive Green",
    value: "#365314",
  },
  {
    key: "forest",
    name: "Forest",
    value: "#14532D",
  },
  {
    key: "deep_emerald",
    name: "Deep Emerald",
    value: "#064E3B",
  },
  {
    key: "deep_teal",
    name: "Deep Teal",
    value: "#134E4A",
  },
  {
    key: "deep_cyan",
    name: "Deep Cyan",
    value: "#164E63",
  },
  {
    key: "navy_sky",
    name: "Navy Sky",
    value: "#0C4A6E",
  },
  {
    key: "navy_blue",
    name: "Navy Blue",
    value: "#1E3A8A",
  },
  {
    key: "deep_indigo",
    name: "Deep Indigo",
    value: "#312E81",
  },
  {
    key: "deep_violet",
    name: "Deep Violet",
    value: "#4C1D95",
  },
  {
    key: "deep_purple",
    name: "Deep Purple",
    value: "#581C87",
  },
  {
    key: "deep_fuchsia",
    name: "Deep Fuchsia",
    value: "#701A75",
  },
  {
    key: "deep_pink",
    name: "Deep Pink",
    value: "#831843",
  },
  {
    key: "deep_rose",
    name: "Deep Rose",
    value: "#881337",
  },
  {
    key: "black_slate",
    name: "Black Slate",
    value: "#111827",
  },
];

const COLOR_ITEMS = ACCOUNT_COLORS.map((color) => ({
  itemId: `color_${color.key}`,
  type: "account_color",
  key: color.key,
  name: color.name,
  value: color.value,
  price: exports.STORE_PRICES.account_color,
  durationDays: exports.STORE_DURATION_DAYS,
}));

/*
|--------------------------------------------------------------------------
| Disable Badge
|--------------------------------------------------------------------------
*/

const NO_BADGE_ITEM = {
  itemId: "badge_none",
  type: "badge",
  key: "none",
  name: "No Badge",
  value: "",
  price: 0,
  durationDays: 0,
  disableBadge: true,
};

/*
|--------------------------------------------------------------------------
| Emoji Badges
|--------------------------------------------------------------------------
*/

const EMOJI_BADGES = [
  {
    itemId: "badge_star",
    type: "badge",
    key: "star",
    name: "Star Badge",
    value: "⭐",
    price: exports.STORE_PRICES.badge,
    durationDays: exports.STORE_DURATION_DAYS,
  },
  {
    itemId: "badge_crown",
    type: "badge",
    key: "crown",
    name: "Crown Badge",
    value: "👑",
    price: exports.STORE_PRICES.badge,
    durationDays: exports.STORE_DURATION_DAYS,
  },
  {
    itemId: "badge_fire",
    type: "badge",
    key: "fire",
    name: "Fire Badge",
    value: "🔥",
    price: exports.STORE_PRICES.badge,
    durationDays: exports.STORE_DURATION_DAYS,
  },
  {
    itemId: "badge_diamond",
    type: "badge",
    key: "diamond",
    name: "Diamond Badge",
    value: "💎",
    price: exports.STORE_PRICES.badge,
    durationDays: exports.STORE_DURATION_DAYS,
  },
];

/*
|--------------------------------------------------------------------------
| Image Badges
|--------------------------------------------------------------------------
*/

const IMAGE_BADGES = [
  {
    itemId: "image_badge_eagle",
    type: "image_badge",
    key: "eagle",
    name: "Eagle Badge",
    value:
      "https://te-bot.site/chatbackflutter/uploads/badges/eagle.png",
    price: exports.STORE_PRICES.image_badge,
    durationDays: exports.STORE_DURATION_DAYS,
  },
  {
    itemId: "image_badge_lion",
    type: "image_badge",
    key: "lion",
    name: "Lion Badge",
    value:
      "https://te-bot.site/chatbackflutter/uploads/badges/lion.png?v=101",
    price: exports.STORE_PRICES.image_badge,
    durationDays: exports.STORE_DURATION_DAYS,
  },
  {
    itemId: "image_badge_skull",
    type: "image_badge",
    key: "skull",
    name: "Skull Badge",
    value:
      "https://te-bot.site/chatbackflutter/uploads/badges/skull.png",
    price: exports.STORE_PRICES.image_badge,
    durationDays: exports.STORE_DURATION_DAYS,
  },
  {
    itemId: "image_badge_heart",
    type: "image_badge",
    key: "heart",
    name: "Heart Badge",
    value:
      "https://te-bot.site/chatbackflutter/uploads/badges/heart.png?v=101",
    price: exports.STORE_PRICES.image_badge,
    durationDays: exports.STORE_DURATION_DAYS,
  },
  {
    itemId: "image_badge_wolf",
    type: "image_badge",
    key: "wolf",
    name: "Wolf Badge",
    value:
      "https://te-bot.site/chatbackflutter/uploads/badges/wolf.png?v=101",
    price: exports.STORE_PRICES.image_badge,
    durationDays: exports.STORE_DURATION_DAYS,
  },
];

/*
|--------------------------------------------------------------------------
| Lottie Badges
|--------------------------------------------------------------------------
*/

const LOTTIE_BADGES = [
  {
    itemId: "lottie_badge_teddy",
    type: "lottie_badge",
    key: "teddy",
    name: "Teddy Lottie",
    value:
      "https://te-bot.site/chatbackflutter/uploads/badges/Teddy.json",
    price: exports.STORE_PRICES.lottie_badge,
    durationDays: exports.STORE_DURATION_DAYS,
  },
  {
    itemId: "lottie_badge_blind",
    type: "lottie_badge",
    key: "blind",
    name: "Blind Lottie",
    value:
      "https://te-bot.site/chatbackflutter/uploads/badges/blind.json",
    price: exports.STORE_PRICES.lottie_badge,
    durationDays: exports.STORE_DURATION_DAYS,
  },
  {
    itemId: "lottie_badge_love",
    type: "lottie_badge",
    key: "love",
    name: "Love Lottie",
    value:
      "https://te-bot.site/chatbackflutter/uploads/badges/love.json",
    price: exports.STORE_PRICES.lottie_badge,
    durationDays: exports.STORE_DURATION_DAYS,
  },
  {
    itemId: "lottie_badge_skull",
    type: "lottie_badge",
    key: "skull",
    name: "Skull Lottie",
    value:
      "https://te-bot.site/chatbackflutter/uploads/badges/skull.json",
    price: exports.STORE_PRICES.lottie_badge,
    durationDays: exports.STORE_DURATION_DAYS,
  },
  {
    itemId: "lottie_badge_snake",
    type: "lottie_badge",
    key: "snake",
    name: "Snake Lottie",
    value:
      "https://te-bot.site/chatbackflutter/uploads/badges/Snake.json",
    price: exports.STORE_PRICES.lottie_badge,
    durationDays: exports.STORE_DURATION_DAYS,
  },
  {
    itemId: "lottie_badge_climb",
    type: "lottie_badge",
    key: "climb",
    name: "Climb Lottie",
    value:
      "https://te-bot.site/chatbackflutter/uploads/badges/ClMB.json",
    price: exports.STORE_PRICES.lottie_badge,
    durationDays: exports.STORE_DURATION_DAYS,
  },
  {
    itemId: "lottie_badge_money",
    type: "lottie_badge",
    key: "money",
    name: "Money Lottie",
    value:
      "https://te-bot.site/chatbackflutter/uploads/badges/Money.json",
    price: exports.STORE_PRICES.lottie_badge,
    durationDays: exports.STORE_DURATION_DAYS,
  },
  {
    itemId: "lottie_badge_koala",
    type: "lottie_badge",
    key: "koala",
    name: "Koala Lottie",
    value:
      "https://te-bot.site/chatbackflutter/uploads/badges/Koala.json",
    price: exports.STORE_PRICES.lottie_badge,
    durationDays: exports.STORE_DURATION_DAYS,
  },
  {
    itemId: "lottie_badge_panda",
    type: "lottie_badge",
    key: "panda",
    name: "Panda Lottie",
    value:
      "https://te-bot.site/chatbackflutter/uploads/badges/panda.json",
    price: exports.STORE_PRICES.lottie_badge,
    durationDays: exports.STORE_DURATION_DAYS,
  },
  {
    itemId: "lottie_badge_bird",
    type: "lottie_badge",
    key: "bird",
    name: "Bird Lottie",
    value:
      "https://te-bot.site/chatbackflutter/uploads/badges/bird.json",
    price: exports.STORE_PRICES.lottie_badge,
    durationDays: exports.STORE_DURATION_DAYS,
  },
  {
    itemId: "lottie_badge_itshot",
    type: "lottie_badge",
    key: "itshot",
    name: "Itshot Lottie",
    value:
      "https://te-bot.site/chatbackflutter/uploads/badges/itshot.json",
    price: exports.STORE_PRICES.lottie_badge,
    durationDays: exports.STORE_DURATION_DAYS,
  },
  {
    itemId: "lottie_badge_spider",
    type: "lottie_badge",
    key: "spider",
    name: "Spider Lottie",
    value:
      "https://te-bot.site/chatbackflutter/uploads/badges/Spider.json",
    price: exports.STORE_PRICES.lottie_badge,
    durationDays: exports.STORE_DURATION_DAYS,
  },
  {
    itemId: "lottie_badge_cat",
    type: "lottie_badge",
    key: "cat",
    name: "Cat Lottie",
    value:
      "https://te-bot.site/chatbackflutter/uploads/badges/cat.json",
    price: exports.STORE_PRICES.lottie_badge,
    durationDays: exports.STORE_DURATION_DAYS,
  },
  {
    itemId: "lottie_badge_butterfly",
    type: "lottie_badge",
    key: "butterfly",
    name: "Butterfly Lottie",
    value:
      "https://te-bot.site/chatbackflutter/uploads/badges/Butterfly.json",
    price: exports.STORE_PRICES.lottie_badge,
    durationDays: exports.STORE_DURATION_DAYS,
  },
  {
    itemId: "lottie_badge_eagle_fire",
    type: "lottie_badge",
    key: "eagle_fire",
    name: "Eagle Fire Lottie",
    value:
      "https://te-bot.site/chatbackflutter/uploads/badges/eagle-fire.json",
    price: exports.STORE_PRICES.lottie_badge,
    durationDays: exports.STORE_DURATION_DAYS,
  },
  {
    itemId: "lottie_badge_lion_gold",
    type: "lottie_badge",
    key: "lion_gold",
    name: "Lion Gold Lottie",
    value:
      "https://te-bot.site/chatbackflutter/uploads/badges/lion-gold.json",
    price: exports.STORE_PRICES.lottie_badge,
    durationDays: exports.STORE_DURATION_DAYS,
  },
  {
    itemId: "lottie_badge_skull_dark",
    type: "lottie_badge",
    key: "skull_dark",
    name: "Skull Dark Lottie",
    value:
      "https://te-bot.site/chatbackflutter/uploads/badges/Skull1.json",
    price: exports.STORE_PRICES.lottie_badge,
    durationDays: exports.STORE_DURATION_DAYS,
  },
  {
    itemId: "lottie_badge_batman_dark",
    type: "lottie_badge",
    key: "batman_dark",
    name: "Batman Dark Lottie",
    value:
      "https://te-bot.site/chatbackflutter/uploads/badges/bat1.json",
    price: exports.STORE_PRICES.lottie_badge,
    durationDays: exports.STORE_DURATION_DAYS,
  },
];

/*
|--------------------------------------------------------------------------
| Verification
|--------------------------------------------------------------------------
*/

const VERIFICATION_ITEMS = [
  {
    itemId: "verify_blue",
    type: "verification",
    key: "blue",
    name: "Blue Verification",
    value: "blue",
    price: exports.STORE_PRICES.verification,
    durationDays: exports.STORE_DURATION_DAYS,
  },
  {
    itemId: "verify_gold",
    type: "verification",
    key: "gold",
    name: "Gold Verification",
    value: "gold",
    price: exports.STORE_PRICES.verification,
    durationDays: exports.STORE_DURATION_DAYS,
  },
  {
    itemId: "verify_business",
    type: "verification",
    key: "business",
    name: "Business Verification",
    value: "business",
    price: exports.STORE_PRICES.verification,
    durationDays: exports.STORE_DURATION_DAYS,
  },
];

/*
|--------------------------------------------------------------------------
| Final Store Items
|--------------------------------------------------------------------------
*/

exports.STORE_ITEMS = [
  ...COLOR_ITEMS,

  NO_BADGE_ITEM,

  ...EMOJI_BADGES,
  ...IMAGE_BADGES,
  ...LOTTIE_BADGES,
  ...VERIFICATION_ITEMS,
];

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function findStoreItem(itemId) {
  const normalizedItemId =
    typeof itemId === "string" ? itemId.trim() : "";

  if (!normalizedItemId) {
    return undefined;
  }

  return exports.STORE_ITEMS.find(
    (item) => item.itemId === normalizedItemId,
  );
}

function getStoreItemGroup(type) {
  if (
    type === "badge" ||
    type === "image_badge" ||
    type === "lottie_badge"
  ) {
    return "badge_group";
  }

  return type;
}

function isBadgeStoreItemType(type) {
  return (
    type === "badge" ||
    type === "image_badge" ||
    type === "lottie_badge"
  );
}

//# sourceMappingURL=store.items.js.map