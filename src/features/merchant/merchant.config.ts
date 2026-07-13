function readEnvList(value: string | undefined): string[] {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function readPositiveInteger(
  value: string | undefined,
  fallback: number
): number {
  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0 ||
    !Number.isInteger(parsed)
  ) {
    return fallback;
  }

  return parsed;
}

export const merchantConfig = {
  username: String(
    process.env.MERCHANT_USERNAME || "merchant"
  )
    .trim()
    .toLowerCase(),

  displayUsername: String(
    process.env.MERCHANT_DISPLAY_USERNAME ||
      process.env.MERCHANT_USERNAME ||
      "merchant"
  ).trim(),

  accountPassword: String(
    process.env.MERCHANT_ACCOUNT_PASSWORD || ""
  ),

  ownerUserIds: readEnvList(
    process.env.CHAT_OWNER_USER_IDS
  ),

  adminUserIds: readEnvList(
    process.env.CHAT_ADMIN_USER_IDS
  ),

  ownerUsernames: readEnvList(
    process.env.CHAT_OWNER_USERNAMES
  ),

  adminUsernames: readEnvList(
    process.env.CHAT_ADMIN_USERNAMES
  ),

  accountCreationCost: readPositiveInteger(
    process.env.ACCOUNT_CREATION_COST_POINTS,
    20000
  ),

  pointTransferMinAmount: readPositiveInteger(
    process.env.POINT_TRANSFER_MIN_AMOUNT,
    1
  ),

  pointTransferMaxAmount: readPositiveInteger(
    process.env.POINT_TRANSFER_MAX_AMOUNT,
    1000000
  ),
};

console.log("[MERCHANT_CONFIG_LOADED]", {
  username: merchantConfig.username,
  ownerUserIds: merchantConfig.ownerUserIds,
  adminUserIds: merchantConfig.adminUserIds,
  accountCreationCost:
    merchantConfig.accountCreationCost,
  pointTransferMinAmount:
    merchantConfig.pointTransferMinAmount,
  pointTransferMaxAmount:
    merchantConfig.pointTransferMaxAmount,
});