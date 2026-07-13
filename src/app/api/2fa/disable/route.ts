import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTotp } from "@/lib/two-factor";

const schema = z.object({
  password: z.string().optional(),
  code: z.string().optional(),
});

/**
 * Disabling 2FA requires proving identity again: a current TOTP code, or the
 * account password for OAuth-less accounts. Prevents a hijacked session from
 * silently stripping the second factor.
 */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(`2fa-disable:${user.id}`, 5, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts — slow down" }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { twoFactorEnabled: true, twoFactorSecret: true, passwordHash: true },
  });
  if (!record?.twoFactorEnabled) {
    return NextResponse.json({ error: "2FA is not enabled" }, { status: 400 });
  }

  const byCode =
    parsed.data.code && record.twoFactorSecret
      ? verifyTotp(parsed.data.code, record.twoFactorSecret)
      : false;
  const byPassword =
    parsed.data.password && record.passwordHash
      ? await bcrypt.compare(parsed.data.password, record.passwordHash)
      : false;

  if (!byCode && !byPassword) {
    return NextResponse.json(
      { error: "Enter a valid authenticator code (or your password) to confirm" },
      { status: 403 }
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null, recoveryCodes: [] },
  });
  await prisma.activity.create({
    data: { userId: user.id, type: "security", meta: { event: "2fa_disabled" } },
  });

  return NextResponse.json({ enabled: false });
}
