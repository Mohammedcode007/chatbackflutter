import bcrypt from "bcryptjs";

import { UserModel } from "../../models/User.model";
import { merchantConfig } from "./merchant.config";

async function generateUniqueMerchantUserId(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const userId = String(
      Math.floor(100000000 + Math.random() * 900000000)
    );

    const exists = await UserModel.exists({ userId });

    if (!exists) return userId;
  }

  throw new Error("failed_to_generate_merchant_user_id");
}

export async function ensureMerchantAccount() {
  const username = merchantConfig.username;

  let merchant = await UserModel.findOne({ username });

  if (merchant) {
    /*
      ضمان بقاء خصائص الحساب صحيحة حتى لو كان قديمًا.
    */
    let changed = false;

    if (merchant.platformRole !== "owner") {
      merchant.platformRole = "owner";
      changed = true;
    }

    if (merchant.accountType !== "merchant") {
      merchant.accountType = "merchant";
      changed = true;
    }

    if (changed) {
      await merchant.save();
    }

    console.log("[MERCHANT_ACCOUNT_READY]", {
      userId: merchant.userId,
      username: merchant.username,
    });

    return merchant;
  }

  const userId =
    await generateUniqueMerchantUserId();

  const hashedPassword = await bcrypt.hash(
    merchantConfig.accountPassword,
    12
  );

  merchant = await UserModel.create({
    userId,
    username,
    password: hashedPassword,

    platformRole: "owner",
    accountType: "merchant",

    statusMessage: "Talkin Plus Management",
    verificationType: "business",

    privateLock: true,
    roomEntryEnabled: false,
    profileEntryEnabled: false,
  });

  console.log("[MERCHANT_ACCOUNT_CREATED]", {
    userId: merchant.userId,
    username: merchant.username,
  });

  return merchant;
}