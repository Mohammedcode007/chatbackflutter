function readEnvList(value: string | undefined): string[] {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export const merchantConfig = {
  username: String(process.env.MERCHANT_USERNAME || "merchant")
    .trim()
    .toLowerCase(),

  displayUsername: String(
    process.env.MERCHANT_DISPLAY_USERNAME || "merchant"
  ).trim(),

  accountPassword: String(
    process.env.MERCHANT_ACCOUNT_PASSWORD ||
      "ChangeThisMerchantPassword123!"
  ),

  ownerUserIds: readEnvList(process.env.CHAT_OWNER_USER_IDS),

  adminUserIds: readEnvList(process.env.CHAT_ADMIN_USER_IDS),

  ownerUsernames: readEnvList(process.env.CHAT_OWNER_USERNAMES),

  adminUsernames: readEnvList(process.env.CHAT_ADMIN_USERNAMES),
};