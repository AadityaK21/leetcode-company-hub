import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { rateLimitShared } from "@/lib/rate-limit";
import { verifyTotp, generateRecoveryCodes } from "@/lib/two-factor";

const schema = z.object({ code: z.string().min(6).max(10) });

/**
 * Step 2: user proves their authenticator works. Only then is 2FA enabled,
 * and the single-use recovery codes are returned exactly once.
 */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await rateLimitShared(`2fa-verify:${user.id}`, 10, 10 * 60_000))) {
    return NextResponse.json({ error: "Too many attempts — slow down" }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  });
  if (!record?.twoFactorSecret) {
    return NextResponse.json({ error: "Run setup first" }, { status: 400 });
  }
  if (record.twoFactorEnabled) {
    return NextResponse.json({ error: "2FA is already enabled" }, { status: 409 });
  }

  if (!verifyTotp(parsed.data.code, record.twoFactorSecret)) {
    return NextResponse.json({ error: "That code didn't match — try the next one" }, { status: 400 });
  }

  const { plain, hashed } = await generateRecoveryCodes();
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: true, recoveryCodes: hashed },
  });
  await prisma.activity.create({
    data: { userId: user.id, type: "security", meta: { event: "2fa_enabled" } },
  });

  return NextResponse.json({ enabled: true, recoveryCodes: plain });
}
