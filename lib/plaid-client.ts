import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

export function plaidEnvironment() {
  const value = process.env.PLAID_ENV || "sandbox";
  if (value !== "sandbox" && value !== "production")
    throw new Error("Invalid Plaid environment.");
  return value;
}
function key() {
  const value = process.env.PLAID_TOKEN_ENCRYPTION_KEY || "";
  if (!/^[a-f0-9]{64}$/i.test(value))
    throw new Error("Bank connection encryption is not configured.");
  return Buffer.from(value, "hex");
}
export function plaidConfigured() {
  try {
    key();
    plaidEnvironment();
    return !!process.env.PLAID_CLIENT_ID && !!process.env.PLAID_SECRET;
  } catch {
    return false;
  }
}
export function encryptBankToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  return Buffer.concat([
    iv,
    cipher.update(value, "utf8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]).toString("base64");
}
export function decryptBankToken(value: string) {
  const bytes = Buffer.from(value, "base64");
  if (bytes.length < 29) throw new Error("Invalid bank token.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    bytes.subarray(0, 12),
  );
  decipher.setAuthTag(bytes.subarray(-16));
  return Buffer.concat([
    decipher.update(bytes.subarray(12, -16)),
    decipher.final(),
  ]).toString("utf8");
}
export function plaidClient() {
  if (!plaidConfigured()) throw new Error("Plaid setup is incomplete.");
  return new PlaidApi(
    new Configuration({
      basePath: PlaidEnvironments[plaidEnvironment()],
      baseOptions: {
        timeout: 15000,
        headers: {
          "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
          "PLAID-SECRET": process.env.PLAID_SECRET,
          "Plaid-Version": "2020-09-14",
        },
      },
    }),
  );
}
