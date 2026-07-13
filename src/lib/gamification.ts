import { prisma } from "@/lib/prisma";
import { xpForDifficulty } from "@/lib/utils";
import type { Difficulty } from "@prisma/client";

/** Awards XP + activity + achievement checks after a solve. Fire-and-forget safe. */
export async function recordSolve(userId: string, questionId: string, difficulty: Difficulty) {
  const xp = xpForDifficulty(difficulty);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { xp: { increment: xp } } }),
    prisma.activity.create({
      data: { userId, type: "solved", xp, meta: { questionId, difficulty } },
    }),
  ]);
  await checkAchievements(userId, difficulty);
}

async function grant(userId: string, slug: string) {
  const achievement = await prisma.achievement.findUnique({ where: { slug } });
  if (!achievement) return;
  const created = await prisma.userAchievement
    .create({ data: { userId, achievementId: achievement.id } })
    .catch(() => null); // already earned
  if (created && achievement.xpReward > 0) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { xp: { increment: achievement.xpReward } },
      }),
      prisma.activity.create({
        data: {
          userId,
          type: "achievement",
          xp: achievement.xpReward,
          meta: { slug, title: achievement.title },
        },
      }),
    ]);
  }
}

async function checkAchievements(userId: string, difficulty: Difficulty) {
  const solved = await prisma.progress.count({
    where: { userId, status: { in: ["SOLVED", "MASTERED"] } },
  });
  if (solved >= 1) await grant(userId, "first-solve");
  if (solved >= 10) await grant(userId, "ten-solved");
  if (solved >= 50) await grant(userId, "fifty-solved");
  if (solved >= 100) await grant(userId, "hundred-solved");
  if (difficulty === "HARD") await grant(userId, "first-hard");

  const noteCount = await prisma.note.count({ where: { userId } });
  if (noteCount >= 10) await grant(userId, "note-taker");

  if ((await currentStreak(userId)) >= 7) await grant(userId, "week-streak");
}

/** Consecutive days (UTC) with at least one activity, ending today or yesterday. */
export async function currentStreak(userId: string): Promise<number> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 366);
  const rows = await prisma.activity.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { createdAt: true },
  });
  const days = new Set(rows.map((r) => r.createdAt.toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(cursor.toISOString().slice(0, 10))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
