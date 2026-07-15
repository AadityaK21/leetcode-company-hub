import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { recentAcceptedSlugs, recentSubmissions } from "@/lib/leetcode";
import { recordSolve } from "@/lib/gamification";

/**
 * Pulls the user's recent submissions from LeetCode: accepted ones mark the
 * question solved (verified), non-accepted ones mark it attempted. Incremental
 * by nature — LeetCode's public API exposes only the ~20 most recent per profile.
 */
export async function POST() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Generous limit so tab-focus auto-sync + manual clicks don't false-trip;
  // the client throttles itself and LeetCode is only hit on real changes.
  if (!rateLimit(`lc-sync:${user.id}`, 20, 10 * 60_000)) {
    return NextResponse.json({ error: "Syncing too often — try again in a few minutes" }, { status: 429 });
  }

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { leetcodeUsername: true },
  });
  if (!record?.leetcodeUsername) {
    return NextResponse.json({ error: "Connect your LeetCode account first" }, { status: 400 });
  }

  const slugs = await recentAcceptedSlugs(record.leetcodeUsername);
  if (slugs === null) {
    return NextResponse.json(
      { error: "LeetCode didn't respond — it may be rate-limiting or down. Try again shortly." },
      { status: 502 }
    );
  }

  const questions = await prisma.question.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true, difficulty: true },
  });

  let imported = 0;
  for (const q of questions) {
    const existing = await prisma.progress.findUnique({
      where: { userId_questionId: { userId: user.id, questionId: q.id } },
    });
    const wasSolved = existing?.status === "SOLVED" || existing?.status === "MASTERED";

    await prisma.progress.upsert({
      where: { userId_questionId: { userId: user.id, questionId: q.id } },
      create: {
        userId: user.id,
        questionId: q.id,
        status: "SOLVED",
        verified: true,
        solvedAt: new Date(),
      },
      update: wasSolved
        ? { verified: true }
        : { status: "SOLVED", verified: true, solvedAt: new Date() },
    });

    if (!wasSolved) {
      await recordSolve(user.id, q.id, q.difficulty);
      imported += 1;
    }
  }

  // Best-effort "attempted" detection: any recent submission that wasn't
  // accepted (and isn't among the accepted slugs) marks the question ATTEMPTED,
  // but only if the user hasn't already progressed it past TODO.
  let attempted = 0;
  const subs = await recentSubmissions(record.leetcodeUsername);
  if (subs) {
    const acceptedSet = new Set(slugs);
    const attemptedSlugs = [
      ...new Set(subs.filter((s) => !s.accepted).map((s) => s.titleSlug)),
    ].filter((slug) => !acceptedSet.has(slug));

    if (attemptedSlugs.length > 0) {
      const attemptedQuestions = await prisma.question.findMany({
        where: { slug: { in: attemptedSlugs } },
        select: { id: true },
      });
      for (const q of attemptedQuestions) {
        const existing = await prisma.progress.findUnique({
          where: { userId_questionId: { userId: user.id, questionId: q.id } },
        });
        // Don't downgrade a solved/mastered/already-attempted question.
        if (existing && existing.status !== "TODO") continue;
        await prisma.progress.upsert({
          where: { userId_questionId: { userId: user.id, questionId: q.id } },
          create: { userId: user.id, questionId: q.id, status: "ATTEMPTED" },
          update: { status: "ATTEMPTED" },
        });
        attempted += 1;
      }
    }
  }

  const syncedAt = new Date();
  await prisma.user.update({
    where: { id: user.id },
    data: { leetcodeSyncedAt: syncedAt },
  });

  return NextResponse.json({
    ok: true,
    checked: slugs.length,
    matched: questions.length,
    imported,
    attempted,
    syncedAt,
  });
}
