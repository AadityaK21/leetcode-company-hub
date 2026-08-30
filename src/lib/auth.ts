import NextAuth, { CredentialsSignin } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { rateLimitShared } from "@/lib/rate-limit";
import { verifyTotpStep, matchRecoveryCode } from "@/lib/two-factor";

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
/** How often a live token re-checks role + sessionVersion against the database. */
const REVALIDATE_MS = 5 * 60_000;

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
  callbacks: {
    ...authConfig.callbacks,
    /**
     * The edge config stamps the token at sign-in only, which means a role
     * change never lands and a password reset never logs anyone out. Here we
     * have Prisma, so we re-read both at most once every REVALIDATE_MS.
     */
    async jwt({ token, user }) {
      if (user?.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, sessionVersion: true },
        });
        token.id = user.id;
        token.role = dbUser?.role ?? "USER";
        token.sv = dbUser?.sessionVersion ?? 0;
        token.checkedAt = Date.now();
        return token;
      }

      // Read defensively: the JWT payload is loosely typed, so narrow rather
      // than assume the shape we wrote on the previous pass.
      const tokenId = typeof token.id === "string" ? token.id : null;
      const checkedAt = typeof token.checkedAt === "number" ? token.checkedAt : 0;
      const stampedVersion = typeof token.sv === "number" ? token.sv : 0;

      if (!tokenId) return token;
      if (Date.now() - checkedAt < REVALIDATE_MS) return token;

      const fresh = await prisma.user.findUnique({
        where: { id: tokenId },
        select: { role: true, sessionVersion: true },
      });

      // Account deleted, or every session revoked since this token was issued.
      if (!fresh || fresh.sessionVersion !== stampedVersion) return null;

      token.role = fresh.role;
      token.checkedAt = Date.now();
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "USER" | "ADMIN") ?? "USER";
      }
      return session;
    },
  },
  providers: [
    Google({ allowDangerousEmailAccountLinking: false }),
    GitHub({ allowDangerousEmailAccountLinking: false }),
    Credentials({
      credentials: { email: {}, password: {}, totp: {} },
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();

        // ——— Burst protection ———
        const ip =
          request?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
        if (!(await rateLimitShared(`login:ip:${ip}`, 20, 60_000))) return null;
        if (!(await rateLimitShared(`login:email:${email}`, 10, 60_000))) return null;

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

          let passed = false;
          const step = verifyTotpStep(code, user.twoFactorSecret);

          if (step !== null) {
            // Refuse a code that was already spent — the 90-second validity
            // window is otherwise a free replay for anyone who captured it.
            if (user.lastTotpStep !== null && step <= user.lastTotpStep) {
              throw new TwoFactorInvalid();
            }
            passed = true;
            await prisma.user.update({
              where: { id: user.id },
              data: { lastTotpStep: step },
            });
          } else if (code.length >= 8) {
            // Fall back to a single-use recovery code.
            const idx = await matchRecoveryCode(code, user.recoveryCodes);
            if (idx >= 0) {
              passed = true;
              await prisma.user.update({
                where: { id: user.id },
                data: { recoveryCodes: user.recoveryCodes.filter((_, i) => i !== idx) },
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
