import crypto from "crypto";

export function createId() {
  return crypto.randomBytes(12).toString("hex");
}