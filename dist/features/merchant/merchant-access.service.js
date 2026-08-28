"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMerchantAccess = getMerchantAccess;
exports.isMerchantOwner = isMerchantOwner;
const User_model_1 = require("../../models/User.model");
const merchant_config_1 = require("./merchant.config");
function normalize(value) {
    return String(value || "").trim().toLowerCase();
}
async function getMerchantAccess(userId) {
    const normalizedUserId = normalize(userId);
    if (!normalizedUserId) {
        return {
            allowed: false,
            accessLevel: "none",
            user: null,
        };
    }
    const user = await User_model_1.UserModel.findOne({
        userId: normalizedUserId,
    }).lean();
    if (!user) {
        return {
            allowed: false,
            accessLevel: "none",
            user: null,
        };
    }
    const username = normalize(user.username);
    const databaseRole = normalize(user.platformRole || "user");
    const isEnvOwner = merchant_config_1.merchantConfig.ownerUserIds.includes(normalizedUserId) ||
        merchant_config_1.merchantConfig.ownerUsernames.includes(username);
    if (isEnvOwner || databaseRole === "owner") {
        return {
            allowed: true,
            accessLevel: "owner",
            user,
        };
    }
    const isEnvAdmin = merchant_config_1.merchantConfig.adminUserIds.includes(normalizedUserId) ||
        merchant_config_1.merchantConfig.adminUsernames.includes(username);
    if (isEnvAdmin || databaseRole === "admin") {
        return {
            allowed: true,
            accessLevel: "admin",
            user,
        };
    }
    return {
        allowed: false,
        accessLevel: "none",
        user,
    };
}
function isMerchantOwner(accessLevel) {
    return accessLevel === "owner";
}
//# sourceMappingURL=merchant-access.service.js.map