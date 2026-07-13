import { authenticator } from "otplib";
import { randomBytes } from "crypto";
import { encrypt, decrypt, sha256 } from "@/lib/crypto";

// Accept one 30-second step of clock drift on either side.
authenticator.options = { window: 1 };

export function generateTotpSecret(): { secret: string; encrypted: string } {
  const secret = authenticator.generateSecret();
  return { secret, encrypted: encrypt(secret) };
}

export function totpUri(email: string, secret: string): string {
  return authenticator.keyuri(email, "CompanyHub", secret);
}

export function verifyTotp(token: string, encryptedSecret: string): boolean {
  try {
    const secret = decrypt(encryptedSecret);
    return authenticator.verify({ token: token.replace(/\s/g, ""), secret });
  } catch {
    return false;
  }
}

/** 8 single-use recovery codes like `3f9a-c27b`. Returns plaintext + hashes. */
export function generateRecoveryCodes(): { plain: string[]; hashed: string[] } {
  const plain = Array.from({ length: 8 }, () => {
    const hex = randomBytes(4).toString("hex");
    return `${hex.slice(0, 4)}-${hex.slice(4)}`;
  });
  return { plain, hashed: plain.map(normalizeAndHash) };
}

export function normalizeAndHash(code: string): string {
  return sha256(code.toLowerCase().replace(/[^a-z0-9]/g, ""));
}
