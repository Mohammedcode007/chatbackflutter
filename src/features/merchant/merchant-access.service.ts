import { UserModel } from "../../models/User.model";
import { merchantConfig } from "./merchant.config";

export type MerchantAccessLevel =
  | "none"
  | "admin"
  | "owner";

function normalize(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

export async function getMerchantAccess(
  userId: string
): Promise<{
  allowed: boolean;
  accessLevel: MerchantAccessLevel;
  user: any | null;
}> {
  const normalizedUserId = normalize(userId);

  if (!normalizedUserId) {
    return {
      allowed: false,
      accessLevel: "none",
      user: null,
    };
  }

  const user = await UserModel.findOne({
    userId: normalizedUserId,
  }).lean();

  if (!user) {
    return {
      allowed: false,
      accessLevel: "none",
      user: null,
    };
  }

  const username = normalize((user as any).username);
  const databaseRole = normalize((user as any).platformRole || "user");

  const isEnvOwner =
    merchantConfig.ownerUserIds.includes(normalizedUserId) ||
    merchantConfig.ownerUsernames.includes(username);

  if (isEnvOwner || databaseRole === "owner") {
    return {
      allowed: true,
      accessLevel: "owner",
      user,
    };
  }

  const isEnvAdmin =
    merchantConfig.adminUserIds.includes(normalizedUserId) ||
    merchantConfig.adminUsernames.includes(username);

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

export function isMerchantOwner(
  accessLevel: MerchantAccessLevel
): boolean {
  return accessLevel === "owner";
}