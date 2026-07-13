import NextAuth, { CredentialsSignin } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTotp, normalizeAndHash } from "@/lib/two-factor";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  totp: z.string().optional(),
});

/**
 * A real bcrypt hash of a random string. When the email doesn't exist we
 * still run a compare against this, so "user not found" and "wrong password"
 * take the same time — preventing account-enumeration via response timing.
 */
const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8i9OFLmrmXiEJhxqUuGyeIkyzTpOJq";

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;

/** Surfaced to the client as res.code so the UI can ask for the 2FA code. */
class TwoFactorRequired extends CredentialsSignin {
  code = "2fa_required";
}
class TwoFactorInvalid extends CredentialsSignin {
  code = "2fa_invalid";
}
class EmailUnverified extends CredentialsSignin {
  code = "email_unverified";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({ allowDangerousEmailAccountLinking: true }),
    GitHub({ allowDangerousEmailAccountLinking: true }),
    Credentials({
      credentials: { email: {}, password: {}, totp: {} },
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();

        // ——— Burst protection ———
        const ip =
          request?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
        if (!rateLimit(`login:ip:${ip}`, 20, 60_000)) return null;
        if (!rateLimit(`login:email:${email}`, 10, 60_000)) return null;

        const user = await prisma.user.findUnique({ where: { email } });

        // Timing-equalized rejection for unknown emails.
        if (!user?.passwordHash) {
          await bcrypt.compare(parsed.data.password, DUMMY_HASH);
          return null;
        }

        // Temporary lockout after repeated failures.
        if (user.lockedUntil && user.lockedUntil > new Date()) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);

        if (!valid) {
          const failed = user.failedLogins + 1;
          await prisma.user.update({
            where: { id: user.id },
            data:
              failed >= MAX_FAILED_LOGINS
                ? {
                    failedLogins: 0,
                    lockedUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60_000),
                  }
                : { failedLogins: failed },
          });
          return null;
        }

        // ——— Email must be verified before password sign-in ———
        if (!user.emailVerified) throw new EmailUnverified();

        // ——— Second factor ———
        if (user.twoFactorEnabled && user.twoFactorSecret) {
          const code = parsed.data.totp?.trim();
          if (!code) throw new TwoFactorRequired();

          let passed = verifyTotp(code, user.twoFactorSecret);

          // Fall back to a single-use recovery code.
          if (!passed && code.length >= 8) {
            const hashed = normalizeAndHash(code);
            if (user.recoveryCodes.includes(hashed)) {
              passed = true;
              await prisma.user.update({
                where: { id: user.id },
                data: { recoveryCodes: user.recoveryCodes.filter((c) => c !== hashed) },
              });
            }
          }

          if (!passed) throw new TwoFactorInvalid();
        }

        // Success: clear counters, stamp last login + audit trail (non-blocking).
        const userAgent = request?.headers?.get?.("user-agent")?.slice(0, 200) ?? null;
        Promise.all([
          prisma.user.update({
            where: { id: user.id },
            data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
          }),
          prisma.activity.create({
            data: { userId: user.id, type: "login", meta: { ip, userAgent } },
          }),
        ]).catch(() => {});

        return { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role };
      },
    }),
  ],
});

/** Convenience guard for API routes. Returns null when signed out. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user;
}
