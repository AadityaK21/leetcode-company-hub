import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { generateTotpSecret, totpUri } from "@/lib/two-factor";

/**
 * Step 1 of enabling 2FA: create a secret (stored encrypted, NOT yet enabled)
 * and return the QR code + manual key for the authenticator app.
 */
export async function POST() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(`2fa-setup:${user.id}`, 5, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts — slow down" }, { status: 429 });
  }

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, twoFactorEnabled: true },
  });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (record.twoFactorEnabled) {
    return NextResponse.json({ error: "2FA is already enabled" }, { status: 409 });
  }

  const { secret, encrypted } = generateTotpSecret();
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorSecret: encrypted, twoFactorEnabled: false },
  });

  const uri = totpUri(record.email, secret);
  const qrDataUrl = await QRCode.toDataURL(uri, { margin: 1, width: 240 });

  return NextResponse.json({ qrDataUrl, manualKey: secret });
}
