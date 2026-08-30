import { authenticator } from "otplib";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { encrypt, decrypt, sha256 } from "@/lib/crypto";

// Accept one 30-second step of clock drift on either side.
authenticator.options = { window: 1 };

const STEP_SECONDS = 30;

export function generateTotpSecret(): { secret: string; encrypted: string } {
  const secret = authenticator.generateSecret();
  return { secret, encrypted: encrypt(secret) };
}

export function totpUri(email: string, secret: string): string {
  return authenticator.keyuri(email, "CompanyHub", secret);
}

export function verifyTotp(token: string, encryptedSecret: string): boolean {
  return verifyTotpStep(token, encryptedSecret) !== null;
}

/**
 * Verifies a TOTP code and returns the time step it matched, so the caller can
 * store it and refuse the same code a second time. A code stays valid for about
 * 90 seconds with drift allowed, which is long enough to phish and replay.
 * Returns null when the code doesn't match.
 */
export function verifyTotpStep(token: string, encryptedSecret: string): number | null {
  try {
    const secret = decrypt(encryptedSecret);
    const delta = authenticator.checkDelta(token.replace(/\s/g, ""), secret);
    if (delta === null || delta === undefined) return null;
    return Math.floor(Date.now() / 1000 / STEP_SECONDS) + delta;
  } catch {
    return null;
  }
}

/** Strip formatting so `3f9a-c27b` and `3F9AC27B` compare equal. */
export function normalizeCode(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * 8 single-use recovery codes, 80 bits each, stored as bcrypt hashes.
 * Each one is a full 2FA bypass, so they need password-grade hashing —
 * an unsalted digest of a short code falls to an offline attack in minutes
 * if the database ever leaks.
 */
export async function generateRecoveryCodes(): Promise<{ plain: string[]; hashed: string[] }> {
  const plain = Array.from({ length: 8 }, () => {
    const hex = randomBytes(10).toString("hex");
    return `${hex.slice(0, 5)}-${hex.slice(5, 10)}-${hex.slice(10, 15)}-${hex.slice(15, 20)}`;
  });
  const hashed = await Promise.all(plain.map((c) => bcrypt.hash(normalizeCode(c), 10)));
  return { plain, hashed };
}

/**
 * Index of the matching stored hash, or -1. Caller removes it after use.
 *
 * Accepts both formats: bcrypt for codes issued now, and the earlier unsalted
 * SHA-256 so nobody who enabled 2FA before this change is locked out. The
 * legacy branch can be deleted once every user has regenerated their codes.
 */
export async function matchRecoveryCode(input: string, hashes: string[]): Promise<number> {
  const candidate = normalizeCode(input);
  const legacyDigest = sha256(candidate);

  for (let i = 0; i < hashes.length; i++) {
    const stored = hashes[i];
    if (stored.startsWith("$2")) {
      if (await bcrypt.compare(candidate, stored)) return i;
    } else if (stored === legacyDigest) {
      return i;
    }
  }
  return -1;
}
