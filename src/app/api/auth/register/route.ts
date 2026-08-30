import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import { rateLimitShared } from "@/lib/rate-limit";
import {
  createVerificationToken,
  emailEnabled,
  sendVerificationEmail,
  sendDuplicateRegistrationEmail,
} from "@/lib/email";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!(await rateLimitShared(`register:${ip}`, 5, 10 * 60_000))) {
    return NextResponse.json(
      { error: "Too many attempts — try again in a few minutes" },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { name, password } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  // An existing address gets the same answer a new one does, so the signup
  // form can't be used to discover who has an account. The owner is told by
  // email instead — they're the only person entitled to know.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (emailEnabled()) {
      try {
        await sendDuplicateRegistrationEmail(email);
      } catch (err) {
        console.error("duplicate-registration notice failed:", err);
      }
      return NextResponse.json({ ok: true, verify: true }, { status: 201 });
    }
    // No mail provider (local dev): nothing to notify with, so be explicit.
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const created = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      settings: { create: {} },
    },
  });
  await prisma.activity.create({
    data: { userId: created.id, type: "register", meta: { ip } },
  });

  // Mandatory email verification when a mail provider is configured.
  // Without RESEND_API_KEY (e.g. local dev), auto-verify so nobody gets locked out.
  if (emailEnabled()) {
    try {
      const token = await createVerificationToken(email);
      await sendVerificationEmail(email, token);
      return NextResponse.json({ ok: true, verify: true }, { status: 201 });
    } catch (err) {
      console.error("verification email failed:", err);
      // Account exists but mail failed — let them use "resend" from the login screen.
      return NextResponse.json({ ok: true, verify: true, mailDelayed: true }, { status: 201 });
    }
  }

  await prisma.user.update({
    where: { id: created.id },
    data: { emailVerified: new Date() },
  });
  return NextResponse.json({ ok: true, verify: false }, { status: 201 });
}
