import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/**
 * AES-256-GCM encryption for secrets at rest (e.g. TOTP seeds).
 * Key comes from ENCRYPTION_KEY, falling back to AUTH_SECRET.
 * Format: iv.ciphertext.authTag (base64url, dot-separated).
 */
function key(): Buffer {
  // Deliberately separate from AUTH_SECRET. The two have opposite lifecycles:
  // AUTH_SECRET should be rotated after any incident, while TOTP secrets must
  // stay decryptable forever. Deriving both from one value means rotating it
  // silently locks out every 2FA user. The fallback keeps existing installs
  // working; set ENCRYPTION_KEY to your current AUTH_SECRET, then AUTH_SECRET
  // becomes safe to rotate on its own.
  const secret = process.env.ENCRYPTION_KEY ?? process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("ENCRYPTION_KEY (or AUTH_SECRET) is required for encryption");
  }
  return createHash("sha256").update(secret).digest();
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [
    iv.toString("base64url"),
    encrypted.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
  ].join(".");
}

export function decrypt(payload: string): string {
  const [iv, data, tag] = payload.split(".");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(data, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}
