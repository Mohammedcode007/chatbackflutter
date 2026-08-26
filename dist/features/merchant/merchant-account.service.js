"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureMerchantAccount = ensureMerchantAccount;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_model_1 = require("../../models/User.model");
const merchant_config_1 = require("./merchant.config");
async function generateUniqueMerchantUserId() {
    for (let attempt = 0; attempt < 20; attempt += 1) {
        const userId = String(Math.floor(100000000 + Math.random() * 900000000));
        const exists = await User_model_1.UserModel.exists({ userId });
        if (!exists)
            return userId;
    }
    throw new Error("failed_to_generate_merchant_user_id");
}
async function ensureMerchantAccount() {
    const username = merchant_config_1.merchantConfig.username;
    let merchant = await User_model_1.UserModel.findOne({ username });
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
    const userId = await generateUniqueMerchantUserId();
    const hashedPassword = await bcryptjs_1.default.hash(merchant_config_1.merchantConfig.accountPassword, 12);
    merchant = await User_model_1.UserModel.create({
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
//# sourceMappingURL=merchant-account.service.js.map