import {
  PlatformRole,
  UserAccountType,
} from "../../models/User.model";

export const PLATFORM_ROLES: readonly PlatformRole[] = [
  "user",
  "admin",
  "owner",
];

export const USER_ACCOUNT_TYPES: readonly UserAccountType[] = [
  "none",
  "merchant",
  "dealer",
  "agent",
  "partner",
  "creator",
  "broadcaster",
  "vip",
  "business",
  "official",
  "sponsor",
  "tester",
];

export const MAX_ROOM_WELCOME_MESSAGE_LENGTH = 160;

export const MERCHANT_EDITABLE_FIELDS = [
  "platformRole",
  "accountType",
  "roomEntryMediaUrl",
  "profileEntryMediaUrl",
  "roomWelcomeMessage",
  "roomEntryEnabled",
  "profileEntryEnabled",
  "accountColor",
  "verificationType",
  "points",
  "statusMessage",
] as const;

export type MerchantEditableField =
  (typeof MERCHANT_EDITABLE_FIELDS)[number];