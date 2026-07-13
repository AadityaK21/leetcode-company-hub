import crypto from "crypto";
import { prisma } from "@/lib/prisma";

/** Tokens are stored hashed — a DB leak can't be replayed as a verify link. */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** True when the app can actually send email (Resend key configured). */
export function emailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export async function createVerificationToken(email: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  // One active token per address.
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: hashToken(token),
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    },
  });
  return token;
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  const url = `${base}/api/auth/verify?token=${token}&email=${encodeURIComponent(email)}`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "CompanyHub <onboarding@resend.dev>",
      to: [email],
      subject: "Verify your email — CompanyHub",
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#1d4d31">Verify your email</h2>
          <p>Welcome to CompanyHub! Click the button below to verify your email address and activate your account.</p>
          <p style="margin:28px 0">
            <a href="${url}" style="background:#1d4d31;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600">
              Verify email
            </a>
          </p>
          <p style="color:#666;font-size:13px">This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
        </div>
      `,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Resend failed (${res.status}): ${text.slice(0, 200)}`);
  }
}
