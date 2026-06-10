import { UserModel } from "../../models/User.model";
import { findStoreItem, STORE_ITEMS, StoreItemType } from "./store.items";

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

function resetActiveByType(user: any, type: StoreItemType) {
  if (type === "account_color") {
    user.accountColor = "#2BCB00";
  }

  if (type === "badge") {
    user.badgeKey = "";
    user.badgeName = "";
    user.badgeValue = "";

    if (user.features) {
      user.features.badge = null;
    }
  }

  if (type === "verification") {
    user.verificationType = "none";
  }
}

function applyItemToUser(user: any, item: any) {
  if (item.type === "account_color") {
    user.accountColor = item.value;
  }

  if (item.type === "badge") {
    user.badgeKey = item.key;
    user.badgeName = item.name;
    user.badgeValue = item.value;

    if (user.features) {
      user.features.badge = item.value;
    }
  }

  if (item.type === "verification") {
    user.verificationType = item.value;
  }
}

function removeExpiredItemsAndFixActive(user: any) {
  const inventory = user.inventory || [];

  const validInventory = inventory.filter((item: any) => {
    return !isExpired(item.expiresAt);
  });

  const removedTypes = new Set<string>();

  for (const item of inventory) {
    if (isExpired(item.expiresAt)) {
      removedTypes.add(item.type);
    }
  }

  user.inventory = validInventory;

  for (const type of removedTypes) {
    const stillActive = validInventory.find(
      (item: any) => item.type === type && item.isActive === true
    );

    if (!stillActive) {
      resetActiveByType(user, type as StoreItemType);
    }
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

  if (user.points < item.price) {
    return {
      ok: false as const,
      reason: "not_enough_points",
    };
  }

  /*
    مهم:
    عند شراء عنصر من نفس النوع:
    - نحذف القديم من نفس النوع
    - نضيف الجديد
    - نفعله مباشرة
    - يبدأ 30 يوم من وقت الشراء الجديد
    - نخصم النقاط
  */
  user.inventory = (user.inventory || []).filter(
    (owned: any) => owned.type !== item.type
  );

  resetActiveByType(user, item.type);

  const expiresAt = addDays(item.durationDays);

  user.points -= item.price;

  const newInventoryItem = {
    itemId: item.itemId,
    type: item.type,
    key: item.key,
    name: item.name,
    value: item.value,
    purchasedAt: new Date(),
    expiresAt,
    isActive: true,
  };

  user.inventory.push(newInventoryItem);

  applyItemToUser(user, item);

  await user.save();

  return {
    ok: true as const,
    points: user.points,
    item,
    activeItem: newInventoryItem,
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

  const owned = (user.inventory || []).find(
    (item: any) => item.itemId === itemId
  );

  if (!owned) {
    await user.save();

    return {
      ok: false as const,
      reason: "item_not_owned",
    };
  }

  if (isExpired(owned.expiresAt)) {
    user.inventory = (user.inventory || []).filter(
      (item: any) => item.itemId !== itemId
    );

    resetActiveByType(user, owned.type);

    await user.save();

    return {
      ok: false as const,
      reason: "item_expired",
    };
  }

  for (const item of user.inventory) {
    if (item.type === owned.type) {
      item.isActive = false;
    }
  }

  owned.isActive = true;

  applyItemToUser(user, owned);

  await user.save();

  return {
    ok: true as const,
    item: owned,
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