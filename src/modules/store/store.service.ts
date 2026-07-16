
import { UserModel } from "../../models/User.model";
import {
  findStoreItem,
  STORE_ITEMS,
  StoreItemType,
  getStoreItemGroup,
  isBadgeStoreItemType,
} from "./store.items";

function sanitizeUser(user: any) {
  const obj = user.toObject ? user.toObject() : user;

  const { password, __v, ...safeUser } = obj;

  return {
    ...safeUser,
    _id: String(obj._id),
    mongoId: String(obj._id),
  };
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function isExpired(expiresAt?: Date | string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

function isSameStoreGroup(typeA: StoreItemType, typeB: StoreItemType) {
  return getStoreItemGroup(typeA) === getStoreItemGroup(typeB);
}

/*
  يعطل عناصر نفس المجموعة فقط بدون حذفها من المخزون.

  مثال:
  badge / image_badge / lottie_badge
  كلهم badge_group، لذلك عند تفعيل واحد منهم يتم تعطيل الباقي.
*/
function deactivateInventoryGroup(user: any, type: StoreItemType) {
  user.inventory = user.inventory || [];

  for (const item of user.inventory) {
    const itemType = item.type as StoreItemType;

    if (isSameStoreGroup(itemType, type)) {
      item.isActive = false;
    }
  }
}
function disableAllBadges(user: any) {
  user.inventory = user.inventory || [];

  /*
    تعطيل جميع أنواع البادجات داخل المخزون،
    مع الاحتفاظ بها لاستخدامها لاحقًا.
  */
  for (const inventoryItem of user.inventory) {
    const itemType = inventoryItem.type as StoreItemType;

    if (isBadgeStoreItemType(itemType)) {
      inventoryItem.isActive = false;
    }
  }

  /*
    مسح جميع بيانات البادجات الظاهرة من المستخدم.
  */
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
}
/*
  يمسح القيم الظاهرة على اليوزر حسب المجموعة.
  لا يحذف أي شيء من inventory.

  مهم:
  لو النوع badge / image_badge / lottie_badge
  نمسح الثلاثة من بيانات العرض حتى لا يظهر لوتي وصورة وإيموجي معًا.
*/
function resetActiveByType(user: any, type: StoreItemType) {
  if (type === "account_color") {
    user.accountColor = "#2BCB00";
    return;
  }

  if (isBadgeStoreItemType(type)) {
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
function applyItemToUser(user: any, item: any) {
  /*
    عنصر No Badge لا يتم تطبيقه كبادج عادي.
    بل يمسح جميع البادجات الحالية.
  */
  if (
    item.itemId === "badge_none" ||
    item.key === "none" ||
    item.disableBadge === true
  ) {
    disableAllBadges(user);
    return;
  }

  const itemType = item.type as StoreItemType;
  /*
    قبل تطبيق أي بادج، نمسح باقي أنواع البادجات من بيانات العرض.
    لكن لا نحذفهم من inventory.
  */
  if (isBadgeStoreItemType(itemType)) {
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
function removeExpiredItemsAndFixActive(user: any) {
  const inventory = user.inventory || [];

  const validInventory = inventory.filter((item: any) => {
    return !isExpired(item.expiresAt);
  });

  const removedTypes = new Set<StoreItemType>();

  for (const item of inventory) {
    if (isExpired(item.expiresAt)) {
      removedTypes.add(item.type as StoreItemType);
    }
  }

  user.inventory = validInventory;

  /*
    لو عنصر منتهي كان هو النشط، نفحص هل يوجد عنصر آخر نشط من نفس المجموعة.
    لو لا يوجد، نمسح أثره من بيانات اليوزر.
  */
  for (const removedType of removedTypes) {
    const stillActive = validInventory.find((item: any) => {
      const itemType = item.type as StoreItemType;

      return (
        isSameStoreGroup(itemType, removedType) &&
        item.isActive === true
      );
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
  const activeBadges = validInventory.filter((item: any) => {
    const itemType = item.type as StoreItemType;
    return isBadgeStoreItemType(itemType) && item.isActive === true;
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
  const activeColors = validInventory.filter((item: any) => {
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
  const activeVerifications = validInventory.filter((item: any) => {
    return item.type === "verification" && item.isActive === true;
  });

  if (activeVerifications.length > 1) {
    for (const item of activeVerifications) {
      item.isActive = false;
    }

    const lastActiveVerification =
      activeVerifications[activeVerifications.length - 1];

    lastActiveVerification.isActive = true;

    applyItemToUser(user, lastActiveVerification);
  }
}

export async function listStoreItemsService(userId: string) {
  const user = await UserModel.findOne({ userId });

  if (!user) {
    return {
      ok: false as const,
      reason: "user_not_found",
    };
  }

  removeExpiredItemsAndFixActive(user);
  await user.save();

  return {
    ok: true as const,
    points: user.points,
    items: STORE_ITEMS,
    inventory: user.inventory || [],
    user: sanitizeUser(user),
  };
}

export async function buyStoreItemService(input: {
  userId: string;
  itemId: string;
}) {
  const { userId, itemId } = input;

  const item = findStoreItem(itemId);

  if (!item) {
    return {
      ok: false as const,
      reason: "item_not_found",
    };
  }

  const user = await UserModel.findOne({ userId });

  if (!user) {
    return {
      ok: false as const,
      reason: "user_not_found",
    };
  }

  removeExpiredItemsAndFixActive(user);
  /*
    خيار بدون بادج مجاني ولا يُضاف إلى inventory.
    يتم فقط تعطيل جميع البادجات الحالية.
  */
  if (
    item.itemId === "badge_none" ||
    item.key === "none" ||
    item.disableBadge === true
  ) {
    disableAllBadges(user);

    await user.save();

    return {
      ok: true as const,
      points: user.points,
      item,
      activeItem: null,
      inventory: user.inventory || [],
      user: sanitizeUser(user),
    };
  }
  if (user.points < item.price) {
    return {
      ok: false as const,
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
  const existingItem = user.inventory.find((owned: any) => {
    return owned.itemId === item.itemId;
  });

  let activeItem: any;

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
  } else {
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
    ok: true as const,
    points: user.points,
    item,
    activeItem,
    inventory: user.inventory,
    user: sanitizeUser(user),
  };
}

export async function activateStoreItemService(input: {
  userId: string;
  itemId: string;
}) {
  const { userId, itemId } = input;

  const user = await UserModel.findOne({ userId });

  if (!user) {
    return {
      ok: false as const,
      reason: "user_not_found",
    };
  }

  removeExpiredItemsAndFixActive(user);

  user.inventory = user.inventory || [];

  /*
    خيار بدون بادج:
    - لا يحتاج أن يكون مملوكًا.
    - لا تتم إضافته إلى inventory.
    - لا يتم خصم نقاط.
    - يعطل كل أنواع البادجات فقط.
  */
  if (itemId === "badge_none") {
    disableAllBadges(user);

    await user.save();

    return {
      ok: true as const,
      item: {
        itemId: "badge_none",
        type: "badge",
        key: "none",
        name: "No Badge",
        value: "",
        price: 0,
        durationDays: 0,
        disableBadge: true,
      },
      activeItem: null,
      inventory: user.inventory,
      user: sanitizeUser(user),
    };
  }
if (itemId === "verification_none") {
  /*
    تعطيل جميع عناصر التوثيق الموجودة في المخزون
    مع الاحتفاظ بها حتى يمكن تفعيلها لاحقًا.
  */
  for (const inventoryItem of user.inventory) {
    if (inventoryItem.type === "verification") {
      inventoryItem.isActive = false;
    }
  }

  /*
    إزالة التوثيق الظاهر من حساب المستخدم.
  */
  user.verificationType = "none";

  await user.save();

  return {
    ok: true as const,
    item: {
      itemId: "verification_none",
      type: "verification",
      key: "none",
      name: "No Verification",
      value: "none",
      price: 0,
      durationDays: 0,
    },
    activeItem: null,
    inventory: user.inventory,
    user: sanitizeUser(user),
  };
}
  const owned = user.inventory.find((item: any) => {
    return item.itemId === itemId;
  });

  if (!owned) {
    await user.save();

    return {
      ok: false as const,
      reason: "item_not_owned",
    };
  }

  if (isExpired(owned.expiresAt)) {
    /*
      نحذف فقط العنصر المنتهي.
    */
    user.inventory = user.inventory.filter((item: any) => {
      return item.itemId !== itemId;
    });

    resetActiveByType(user, owned.type as StoreItemType);

    await user.save();

    return {
      ok: false as const,
      reason: "item_expired",
    };
  }

  const ownedType = owned.type as StoreItemType;

  /*
    نعطل العناصر التابعة لنفس المجموعة فقط.
  */
  deactivateInventoryGroup(user, ownedType);

  /*
    نمسح بيانات العرض الحالية للمجموعة.
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
    ok: true as const,
    item: owned,
    activeItem: owned,
    inventory: user.inventory,
    user: sanitizeUser(user),
  };
}
/*
  للتجربة فقط.
  بعد الدفع الحقيقي اجعل إضافة النقاط من admin أو webhook الدفع فقط.
*/
export async function addUserPointsService(input: {
  userId: string;
  amount: number;
}) {
  const { userId, amount } = input;

  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      ok: false as const,
      reason: "invalid_points_amount",
    };
  }

  const user = await UserModel.findOneAndUpdate(
    { userId },
    {
      $inc: {
        points: Math.floor(amount),
      },
    },
    {
      new: true,
    }
  );

  if (!user) {
    return {
      ok: false as const,
      reason: "user_not_found",
    };
  }

  return {
    ok: true as const,
    points: user.points,
    user: sanitizeUser(user),
  };
}