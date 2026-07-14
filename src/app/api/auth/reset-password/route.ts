import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { hashToken } from "@/lib/email";
import { strongPassword } from "@/lib/validations";

const schema = z.object({
  email: z.string().email(),
  token: z.string().min(32),
  password: strongPassword,
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`reset:${ip}`, 10, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts — try again later" }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();

  const record = await prisma.verificationToken.findFirst({
    where: { identifier: `reset:${email}`, token: hashToken(parsed.data.token) },
  });
  if (!record || record.expires < new Date()) {
    return NextResponse.json(
      { error: "This reset link is invalid or expired — request a new one" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(parsed.data.password, 12),
        failedLogins: 0,
        lockedUntil: null,
        // Clicking an emailed link proves ownership of the address.
        emailVerified: user.emailVerified ?? new Date(),
      },
    }),
    prisma.verificationToken.deleteMany({ where: { identifier: `reset:${email}` } }),
    prisma.activity.create({
      data: { userId: user.id, type: "security", meta: { event: "password_reset", ip } },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
