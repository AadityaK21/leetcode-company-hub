import { prisma } from "@/lib/prisma";

export interface PersonalBests {
  bestStreak: number;
  bestDay: { date: string | null; count: number };
  totalSolved: number;
  memberSince: Date | null;
  coachNote: string | null;
}

/**
 * Personal records + a lightweight "coach's note" derived from the user's
 * difficulty mix. All computed from Activity rows — no extra schema needed.
 */
export async function getPersonalBests(userId: string): Promise<PersonalBests> {
  const [activities, user, easy, medium, hard] = await Promise.all([
    prisma.activity.findMany({
      where: { userId, type: "solved" },
      select: { createdAt: true },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
    countSolvedByDifficulty(userId, "EASY"),
    countSolvedByDifficulty(userId, "MEDIUM"),
    countSolvedByDifficulty(userId, "HARD"),
  ]);

  // Solves per UTC day.
  const counts: Record<string, number> = {};
  for (const a of activities) {
    const key = a.createdAt.toISOString().slice(0, 10);
    counts[key] = (counts[key] ?? 0) + 1;
  }

  // Best single day.
  let bestDay: { date: string | null; count: number } = { date: null, count: 0 };
  for (const [date, count] of Object.entries(counts)) {
    if (count > bestDay.count) bestDay = { date, count };
  }

  // Best (longest-ever) streak: walk sorted unique days.
  const days = Object.keys(counts).sort();
  let bestStreak = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of days) {
    if (prev && Date.parse(day) - Date.parse(prev) === 86_400_000) run += 1;
    else run = 1;
    if (run > bestStreak) bestStreak = run;
    prev = day;
  }

  const totalSolved = easy + medium + hard;
  let coachNote: string | null = null;
  if (totalSolved >= 15) {
    const hardShare = hard / totalSolved;
    const easyShare = easy / totalSolved;
    if (hardShare < 0.08) {
      coachNote = "You're avoiding hard problems — mix in one hard per week to level up faster.";
    } else if (easyShare > 0.6) {
      coachNote = "Mostly easies lately. Push into mediums — that's where interviews live.";
    } else if (hardShare > 0.4) {
      coachNote = "Heavy on hards — impressive. Sprinkle in mediums to keep speed sharp.";
    } else {
      coachNote = "Healthy difficulty mix. Consistency beats intensity — protect the streak.";
    }
  }

  return { bestStreak, bestDay, totalSolved, memberSince: user?.createdAt ?? null, coachNote };
}

function countSolvedByDifficulty(userId: string, difficulty: "EASY" | "MEDIUM" | "HARD") {
  return prisma.question.count({
    where: {
      difficulty,
      progress: { some: { userId, status: { in: ["SOLVED", "MASTERED"] } } },
    },
  });
}
