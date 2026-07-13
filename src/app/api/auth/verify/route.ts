import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/email";

/** Landing point for the link in the verification email. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const email = (url.searchParams.get("email") ?? "").toLowerCase();
  const fail = NextResponse.redirect(new URL("/login?verified=0", url.origin));

  if (!token || !email) return fail;

  const record = await prisma.verificationToken.findFirst({
    where: { identifier: email, token: hashToken(token) },
  });
  if (!record || record.expires < new Date()) return fail;

  await prisma.$transaction([
    prisma.user.update({ where: { email }, data: { emailVerified: new Date() } }),
    prisma.verificationToken.deleteMany({ where: { identifier: email } }),
  ]);

  return NextResponse.redirect(new URL("/login?verified=1", url.origin));
}
