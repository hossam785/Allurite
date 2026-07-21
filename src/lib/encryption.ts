import crypto from "crypto";

const getSecretKey = (): Buffer => {
  const secret =
    process.env.BACKUP_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    "fallback_backup_encryption_secret_key_allurite_crm_2026!";
  return crypto.createHash("sha256").update(secret).digest();
};

/**
 * Encrypts a plain text/JSON string using AES-256-GCM.
 * Returns a formatted payload string: "enc_v1:<iv_hex>:<authTag_hex>:<cipher_hex>"
 */
export function encryptPayload(dataString: string): string {
  const key = getSecretKey();
  const iv = crypto.randomBytes(12); // 96-bit IV for AES-GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(dataString, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `enc_v1:${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted payload string.
 * Supports fallback for legacy unencrypted JSON strings.
 */
export function decryptPayload(encryptedPayload: string): string {
  const trimmed = encryptedPayload.trim();
  if (!trimmed.startsWith("enc_v1:")) {
    // If not encrypted with v1 scheme, return raw string (backward compatibility)
    return trimmed;
  }

  const parts = trimmed.split(":");
  if (parts.length !== 4) {
    throw new Error("Invalid encrypted payload format");
  }

  const iv = Buffer.from(parts[1], "hex");
  const authTag = Buffer.from(parts[2], "hex");
  const encryptedText = parts[3];
  const key = getSecretKey();

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
