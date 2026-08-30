import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimitShared } from "@/lib/rate-limit";
import { createVerificationToken, emailEnabled, sendVerificationEmail } from "@/lib/email";

const schema = z.object({ email: z.string().email() });

/**
 * Re-sends the verification email. Always answers {ok:true} so the endpoint
 * can't be used to probe which emails have accounts.
 */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!(await rateLimitShared(`resend-verify:${ip}`, 3, 10 * 60_000))) {
    return NextResponse.json({ error: "Too many requests — try again later" }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  const email = parsed.data.email.toLowerCase();

  if (emailEnabled()) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && !user.emailVerified) {
      try {
        const token = await createVerificationToken(email);
        await sendVerificationEmail(email, token);
      } catch (err) {
        console.error("resend verification failed:", err);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
