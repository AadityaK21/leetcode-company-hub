import { NextResponse } from "next/server";
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

  await prisma.user.update({
    where: { id: user.id },
    data: { leetcodeUsername: parsed.data.username },
  });
  await prisma.activity.create({
    data: { userId: user.id, type: "security", meta: { event: "leetcode_connected" } },
  });

  return NextResponse.json({ ok: true, username: parsed.data.username, solvedCount });
}
