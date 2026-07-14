import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { createResetToken, emailEnabled, sendPasswordResetEmail } from "@/lib/email";

const schema = z.object({ email: z.string().email() });

/**
 * Sends a password-reset link. Always answers {ok:true} so the endpoint
 * can't be used to probe which emails have accounts.
 */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`forgot:${ip}`, 5, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many requests — try again later" }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  const email = parsed.data.email.toLowerCase();

  if (emailEnabled()) {
    const user = await prisma.user.findUnique({ where: { email } });
    // Only accounts with a password can reset one (OAuth accounts sign in via provider).
    if (user?.passwordHash) {
      try {
        const token = await createResetToken(email);
        await sendPasswordResetEmail(email, token);
      } catch (err) {
        console.error("password reset email failed:", err);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
