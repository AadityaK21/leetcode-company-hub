import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { fetchProfileSummary } from "@/lib/leetcode";

/**
 * Step 2 of linking: check that the code from /api/leetcode/connect now
 * appears in the LeetCode profile summary — proof the account is theirs.
 */
export async function POST() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(`lc-verify:${user.id}`, 10, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts — slow down" }, { status: 429 });
  }

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { leetcodeVerifyCode: true },
  });
  const [username, code] = (record?.leetcodeVerifyCode ?? "").split("|");
  if (!username || !code) {
    return NextResponse.json(
      { error: "No pending verification — enter your username first" },
      { status: 400 }
    );
  }

  const summary = await fetchProfileSummary(username);
  if (summary === null) {
    return NextResponse.json(
      { error: "Couldn't read that profile — LeetCode may be unreachable, try again" },
      { status: 502 }
    );
  }

  if (!summary.includes(code)) {
    return NextResponse.json(
      {
        error:
          "Code not found in your profile summary yet. Paste it, save your LeetCode profile, then try again (it can take a minute to appear).",
      },
      { status: 422 }
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { leetcodeUsername: username, leetcodeVerifyCode: null },
  });
  await prisma.activity.create({
    data: { userId: user.id, type: "security", meta: { event: "leetcode_verified" } },
  });

  return NextResponse.json({ ok: true, username });
}
