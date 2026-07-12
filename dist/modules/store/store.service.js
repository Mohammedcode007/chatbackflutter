"use strict";
// import { UserModel } from "../../models/User.model";
// import { findStoreItem, STORE_ITEMS, StoreItemType } from "./store.items";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listStoreItemsService = listStoreItemsService;
exports.buyStoreItemService = buyStoreItemService;
exports.activateStoreItemService = activateStoreItemService;
exports.addUserPointsService = addUserPointsService;
// function sanitizeUser(user: any) {
//   const obj = user.toObject ? user.toObject() : user;
//   const { password, __v, ...safeUser } = obj;
//   return {
//     ...safeUser,
//     _id: String(obj._id),
//     mongoId: String(obj._id),
//   };
// }
// function addDays(days: number) {
//   const date = new Date();
//   date.setDate(date.getDate() + days);
//   return date;
// }
// function isExpired(expiresAt?: Date | string | null) {
//   if (!expiresAt) return false;
//   return new Date(expiresAt).getTime() <= Date.now();
// }
// function resetActiveByType(user: any, type: StoreItemType) {
//   if (type === "account_color") {
//     user.accountColor = "#2BCB00";
//   }
//   if (type === "badge") {
//     user.badgeKey = "";
//     user.badgeName = "";
//     user.badgeValue = "";
//     if (user.features) {
//       user.features.badge = null;
//     }
//   }
//   if (type === "image_badge") {
//     user.badgeImageKey = "";
//     user.badgeImageName = "";
//     user.badgeImageUrl = "";
//   }
//   if (type === "lottie_badge") {
//     user.badgeLottieKey = "";
//     user.badgeLottieName = "";
//     user.badgeLottieUrl = "";
//   }
//   if (type === "verification") {
//     user.verificationType = "none";
//   }
// }
// function applyItemToUser(user: any, item: any) {
//   if (item.type === "account_color") {
//     user.accountColor = item.value;
//   }
//   if (item.type === "badge") {
//     user.badgeKey = item.key;
//     user.badgeName = item.name;
//     user.badgeValue = item.value;
//     if (user.features) {
//       user.features.badge = item.value;
//     }
//   }
//   if (item.type === "image_badge") {
//     user.badgeImageKey = item.key;
//     user.badgeImageName = item.name;
//     user.badgeImageUrl = item.value;
//   }
//   if (item.type === "lottie_badge") {
//     user.badgeLottieKey = item.key;
//     user.badgeLottieName = item.name;
//     user.badgeLottieUrl = item.value;
//   }
//   if (item.type === "verification") {
//     user.verificationType = item.value;
//   }
// }
// function removeExpiredItemsAndFixActive(user: any) {
//   const inventory = user.inventory || [];
//   const validInventory = inventory.filter((item: any) => {
//     return !isExpired(item.expiresAt);
//   });
//   const removedTypes = new Set<string>();
//   for (const item of inventory) {
//     if (isExpired(item.expiresAt)) {
//       removedTypes.add(item.type);
//     }
//   }
//   user.inventory = validInventory;
//   for (const type of removedTypes) {
//     const stillActive = validInventory.find(
//       (item: any) => item.type === type && item.isActive === true
//     );
//     if (!stillActive) {
//       resetActiveByType(user, type as StoreItemType);
//     }
//   }
// }
// export async function listStoreItemsService(userId: string) {
//   const user = await UserModel.findOne({ userId });
//   if (!user) {
//     return {
//       ok: false as const,
//       reason: "user_not_found",
//     };
//   }
//   removeExpiredItemsAndFixActive(user);
//   await user.save();
//   return {
//     ok: true as const,
//     points: user.points,
//     items: STORE_ITEMS,
//     inventory: user.inventory || [],
//     user: sanitizeUser(user),
//   };
// }
// export async function buyStoreItemService(input: {
//   userId: string;
//   itemId: string;
// }) {
//   const { userId, itemId } = input;
//   const item = findStoreItem(itemId);
//   if (!item) {
//     return {
//       ok: false as const,
//       reason: "item_not_found",
//     };
//   }
//   const user = await UserModel.findOne({ userId });
//   if (!user) {
//     return {
//       ok: false as const,
//       reason: "user_not_found",
//     };
//   }
//   removeExpiredItemsAndFixActive(user);
//   if (user.points < item.price) {
//     return {
//       ok: false as const,
//       reason: "not_enough_points",
//     };
//   }
//   /*
//     مهم:
//     عند شراء عنصر من نفس النوع:
//     - نحذف القديم من نفس النوع
//     - نضيف الجديد
//     - نفعله مباشرة
//     - يبدأ 30 يوم من وقت الشراء الجديد
//     - نخصم النقاط
//   */
//   user.inventory = (user.inventory || []).filter(
//     (owned: any) => owned.type !== item.type
//   );
//   resetActiveByType(user, item.type);
//   const expiresAt = addDays(item.durationDays);
//   user.points -= item.price;
//   const newInventoryItem = {
//     itemId: item.itemId,
//     type: item.type,
//     key: item.key,
//     name: item.name,
//     value: item.value,
//     purchasedAt: new Date(),
//     expiresAt,
//     isActive: true,
//   };
//   user.inventory.push(newInventoryItem);
//   applyItemToUser(user, item);
//   await user.save();
//   return {
//     ok: true as const,
//     points: user.points,
//     item,
//     activeItem: newInventoryItem,
//     inventory: user.inventory,
//     user: sanitizeUser(user),
//   };
// }
// export async function activateStoreItemService(input: {
//   userId: string;
//   itemId: string;
// }) {
//   const { userId, itemId } = input;
//   const user = await UserModel.findOne({ userId });
//   if (!user) {
//     return {
//       ok: false as const,
//       reason: "user_not_found",
//     };
//   }
//   removeExpiredItemsAndFixActive(user);
//   const owned = (user.inventory || []).find(
//     (item: any) => item.itemId === itemId
//   );
//   if (!owned) {
//     await user.save();
//     return {
//       ok: false as const,
//       reason: "item_not_owned",
//     };
//   }
//   if (isExpired(owned.expiresAt)) {
//     user.inventory = (user.inventory || []).filter(
//       (item: any) => item.itemId !== itemId
//     );
//     resetActiveByType(user, owned.type);
//     await user.save();
//     return {
//       ok: false as const,
//       reason: "item_expired",
//     };
//   }
//   for (const item of user.inventory) {
//     if (item.type === owned.type) {
//       item.isActive = false;
//     }
//   }
//   owned.isActive = true;
//   applyItemToUser(user, owned);
//   await user.save();
//   return {
//     ok: true as const,
//     item: owned,
//     inventory: user.inventory,
//     user: sanitizeUser(user),
//   };
// }
// /*
//   للتجربة فقط.
//   بعد الدفع الحقيقي اجعل إضافة النقاط من admin أو webhook الدفع فقط.
// */
// export async function addUserPointsService(input: {
//   userId: string;
//   amount: number;
// }) {
//   const { userId, amount } = input;
//   if (!Number.isFinite(amount) || amount <= 0) {
//     return {
//       ok: false as const,
//       reason: "invalid_points_amount",
//     };
//   }
//   const user = await UserModel.findOneAndUpdate(
//     { userId },
//     {
//       $inc: {
//         points: Math.floor(amount),
//       },
//     },
//     {
//       new: true,
//     }
//   );
//   if (!user) {
//     return {
//       ok: false as const,
//       reason: "user_not_found",
//     };
//   }
//   return {
//     ok: true as const,
//     points: user.points,
//     user: sanitizeUser(user),
//   };
// }
const User_model_1 = require("../../models/User.model");
const store_items_1 = require("./store.items");
function sanitizeUser(user) {
    const obj = user.toObject ? user.toObject() : user;
    const { password, __v, ...safeUser } = obj;
    return {
        ...safeUser,
        _id: String(obj._id),
        mongoId: String(obj._id),
    };
}
function addDays(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
}
function isExpired(expiresAt) {
    if (!expiresAt)
        return false;
    return new Date(expiresAt).getTime() <= Date.now();
}
function isSameStoreGroup(typeA, typeB) {
    return (0, store_items_1.getStoreItemGroup)(typeA) === (0, store_items_1.getStoreItemGroup)(typeB);
}
/*
  يعطل عناصر نفس المجموعة فقط بدون حذفها من المخزون.

  مثال:
  badge / image_badge / lottie_badge
  كلهم badge_group، لذلك عند تفعيل واحد منهم يتم تعطيل الباقي.
*/
function deactivateInventoryGroup(user, type) {
    user.inventory = user.inventory || [];
    for (const item of user.inventory) {
        const itemType = item.type;
        if (isSameStoreGroup(itemType, type)) {
            item.isActive = false;
        }
    }
}
/*
  يمسح القيم الظاهرة على اليوزر حسب المجموعة.
  لا يحذف أي شيء من inventory.

  مهم:
  لو النوع badge / image_badge / lottie_badge
  نمسح الثلاثة من بيانات العرض حتى لا يظهر لوتي وصورة وإيموجي معًا.
*/
function resetActiveByType(user, type) {
    if (type === "account_color") {
        user.accountColor = "#2BCB00";
        return;
    }
    if ((0, store_items_1.isBadgeStoreItemType)(type)) {
        user.badgeKey = "";
        user.badgeName = "";
        user.badgeValue = "";
        user.badgeImageKey = "";
        user.badgeImageName = "";
        user.badgeImageUrl = "";
        user.badgeLottieKey = "";
        user.badgeLottieName = "";
        user.badgeLottieUrl = "";
        if (user.features) {
            user.features.badge = null;
        }
        return;
    }
    if (type === "verification") {
        user.verificationType = "none";
        return;
    }
}
/*
  يطبق العنصر المختار على بيانات اليوزر الظاهرة.
  المخزون لا يتأثر هنا.
*/
function applyItemToUser(user, item) {
    const itemType = item.type;
    /*
      قبل تطبيق أي بادج، نمسح باقي أنواع البادجات من بيانات العرض.
      لكن لا نحذفهم من inventory.
    */
    if ((0, store_items_1.isBadgeStoreItemType)(itemType)) {
        resetActiveByType(user, itemType);
    }
    if (itemType === "account_color") {
        user.accountColor = item.value;
        return;
    }
    if (itemType === "badge") {
        user.badgeKey = item.key;
        user.badgeName = item.name;
        user.badgeValue = item.value;
        if (user.features) {
            user.features.badge = item.value;
        }
        return;
    }
    if (itemType === "image_badge") {
        user.badgeImageKey = item.key;
        user.badgeImageName = item.name;
        user.badgeImageUrl = item.value;
        return;
    }
    if (itemType === "lottie_badge") {
        user.badgeLottieKey = item.key;
        user.badgeLottieName = item.name;
        user.badgeLottieUrl = item.value;
        return;
    }
    if (itemType === "verification") {
        user.verificationType = item.value;
        return;
    }
}
/*
  يحذف المنتهي فقط.
  لا يحذف العناصر بسبب التبديل.
  ويصلح حالة active لو كان عندك بيانات قديمة فيها أكثر من بادج active.
*/
function removeExpiredItemsAndFixActive(user) {
    const inventory = user.inventory || [];
    const validInventory = inventory.filter((item) => {
        return !isExpired(item.expiresAt);
    });
    const removedTypes = new Set();
    for (const item of inventory) {
        if (isExpired(item.expiresAt)) {
            removedTypes.add(item.type);
        }
    }
    user.inventory = validInventory;
    /*
      لو عنصر منتهي كان هو النشط، نفحص هل يوجد عنصر آخر نشط من نفس المجموعة.
      لو لا يوجد، نمسح أثره من بيانات اليوزر.
    */
    for (const removedType of removedTypes) {
        const stillActive = validInventory.find((item) => {
            const itemType = item.type;
            return (isSameStoreGroup(itemType, removedType) &&
                item.isActive === true);
        });
        if (!stillActive) {
            resetActiveByType(user, removedType);
        }
    }
    /*
      إصلاح بيانات قديمة:
      لو أكثر من بادج active، نخلي آخر واحد فقط active.
      الباقي يظل في المخزون لكن isActive = false.
    */
    const activeBadges = validInventory.filter((item) => {
        const itemType = item.type;
        return (0, store_items_1.isBadgeStoreItemType)(itemType) && item.isActive === true;
    });
    if (activeBadges.length > 1) {
        for (const item of activeBadges) {
            item.isActive = false;
        }
        const lastActiveBadge = activeBadges[activeBadges.length - 1];
        lastActiveBadge.isActive = true;
        applyItemToUser(user, lastActiveBadge);
    }
    /*
      إصلاح بيانات قديمة للألوان:
      لو أكثر من account_color active، نخلي آخر واحد فقط.
    */
    const activeColors = validInventory.filter((item) => {
        return item.type === "account_color" && item.isActive === true;
    });
    if (activeColors.length > 1) {
        for (const item of activeColors) {
            item.isActive = false;
        }
        const lastActiveColor = activeColors[activeColors.length - 1];
        lastActiveColor.isActive = true;
        applyItemToUser(user, lastActiveColor);
    }
    /*
      إصلاح بيانات قديمة للتوثيق:
      لو أكثر من verification active، نخلي آخر واحد فقط.
    */
    const activeVerifications = validInventory.filter((item) => {
        return item.type === "verification" && item.isActive === true;
    });
    if (activeVerifications.length > 1) {
        for (const item of activeVerifications) {
            item.isActive = false;
        }
        const lastActiveVerification = activeVerifications[activeVerifications.length - 1];
        lastActiveVerification.isActive = true;
        applyItemToUser(user, lastActiveVerification);
    }
}
async function listStoreItemsService(userId) {
    const user = await User_model_1.UserModel.findOne({ userId });
    if (!user) {
        return {
            ok: false,
            reason: "user_not_found",
        };
    }
    removeExpiredItemsAndFixActive(user);
    await user.save();
    return {
        ok: true,
        points: user.points,
        items: store_items_1.STORE_ITEMS,
        inventory: user.inventory || [],
        user: sanitizeUser(user),
    };
}
async function buyStoreItemService(input) {
    const { userId, itemId } = input;
    const item = (0, store_items_1.findStoreItem)(itemId);
    if (!item) {
        return {
            ok: false,
            reason: "item_not_found",
        };
    }
    const user = await User_model_1.UserModel.findOne({ userId });
    if (!user) {
        return {
            ok: false,
            reason: "user_not_found",
        };
    }
    removeExpiredItemsAndFixActive(user);
    if (user.points < item.price) {
        return {
            ok: false,
            reason: "not_enough_points",
        };
    }
    user.inventory = user.inventory || [];
    const expiresAt = addDays(item.durationDays);
    user.points -= item.price;
    /*
      هنا التعديل المهم:
      لا نحذف القديم من inventory.
      فقط نعطل عناصر نفس المجموعة.
    */
    deactivateInventoryGroup(user, item.type);
    /*
      نمسح بيانات العرض الحالية من نفس المجموعة.
      مثلًا لو كان لوتي ظاهر واخترت صورة، نمسح badgeLottieUrl من user.
    */
    resetActiveByType(user, item.type);
    /*
      لو العنصر موجود سابقًا في المخزون:
      نجدد مدته ونفعله.
      لو غير موجود:
      نضيفه للمخزون ونفعله.
    */
    const existingItem = user.inventory.find((owned) => {
        return owned.itemId === item.itemId;
    });
    let activeItem;
    if (existingItem) {
        existingItem.type = item.type;
        existingItem.key = item.key;
        existingItem.name = item.name;
        existingItem.value = item.value;
        existingItem.expiresAt = expiresAt;
        existingItem.isActive = true;
        existingItem.renewedAt = new Date();
        if (!existingItem.purchasedAt) {
            existingItem.purchasedAt = new Date();
        }
        activeItem = existingItem;
    }
    else {
        activeItem = {
            itemId: item.itemId,
            type: item.type,
            key: item.key,
            name: item.name,
            value: item.value,
            purchasedAt: new Date(),
            expiresAt,
            isActive: true,
        };
        user.inventory.push(activeItem);
    }
    applyItemToUser(user, activeItem);
    await user.save();
    return {
        ok: true,
        points: user.points,
        item,
        activeItem,
        inventory: user.inventory,
        user: sanitizeUser(user),
    };
}
async function activateStoreItemService(input) {
    const { userId, itemId } = input;
    const user = await User_model_1.UserModel.findOne({ userId });
    if (!user) {
        return {
            ok: false,
            reason: "user_not_found",
        };
    }
    removeExpiredItemsAndFixActive(user);
    user.inventory = user.inventory || [];
    const owned = user.inventory.find((item) => {
        return item.itemId === itemId;
    });
    if (!owned) {
        await user.save();
        return {
            ok: false,
            reason: "item_not_owned",
        };
    }
    if (isExpired(owned.expiresAt)) {
        /*
          نحذف فقط العنصر المنتهي.
          هذا حذف بسبب انتهاء المدة، وليس بسبب التبديل.
        */
        user.inventory = user.inventory.filter((item) => {
            return item.itemId !== itemId;
        });
        resetActiveByType(user, owned.type);
        await user.save();
        return {
            ok: false,
            reason: "item_expired",
        };
    }
    const ownedType = owned.type;
    /*
      التبديل بين عناصر المخزون:
      نعطل نفس المجموعة فقط بدون حذف.
    */
    deactivateInventoryGroup(user, ownedType);
    /*
      نمسح بيانات العرض الحالية من نفس المجموعة.
    */
    resetActiveByType(user, ownedType);
    /*
      نفعّل العنصر المطلوب.
    */
    owned.isActive = true;
    owned.activatedAt = new Date();
    applyItemToUser(user, owned);
    await user.save();
    return {
        ok: true,
        item: owned,
        inventory: user.inventory,
        user: sanitizeUser(user),
    };
}
/*
  للتجربة فقط.
  بعد الدفع الحقيقي اجعل إضافة النقاط من admin أو webhook الدفع فقط.
*/
async function addUserPointsService(input) {
    const { userId, amount } = input;
    if (!Number.isFinite(amount) || amount <= 0) {
        return {
            ok: false,
            reason: "invalid_points_amount",
        };
    }
    const user = await User_model_1.UserModel.findOneAndUpdate({ userId }, {
        $inc: {
            points: Math.floor(amount),
        },
    }, {
        new: true,
    });
    if (!user) {
        return {
            ok: false,
            reason: "user_not_found",
        };
    }
    return {
        ok: true,
        points: user.points,
        user: sanitizeUser(user),
    };
}
//# sourceMappingURL=store.service.js.map