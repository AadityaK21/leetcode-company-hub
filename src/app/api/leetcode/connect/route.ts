import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { verifyLeetcodeUser } from "@/lib/leetcode";

const schema = z.object({
  username: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid LeetCode username"),
});

/**
 * Step 1 of linking: prove the profile exists, then issue a one-time code the
 * user pastes into their LeetCode profile summary. /api/leetcode/verify
 * completes the link once the code is visible on the public profile.
 */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(`lc-connect:${user.id}`, 5, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts — slow down" }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid username" }, { status: 400 });

  const { exists, solvedCount } = await verifyLeetcodeUser(parsed.data.username);
  if (!exists) {
    return NextResponse.json(
      { error: "That LeetCode profile wasn't found (or LeetCode is unreachable right now)" },
      { status: 404 }
    );
  }

  const code = `companyhub-${crypto.randomBytes(4).toString("hex")}`;
  await prisma.user.update({
    where: { id: user.id },
    data: { leetcodeVerifyCode: `${parsed.data.username}|${code}` },
  });

  return NextResponse.json({
    ok: true,
    pending: true,
    username: parsed.data.username,
    code,
    solvedCount,
  });
}
