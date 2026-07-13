import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

const POOL_SIZE = 300;

/**
 * Deterministic "daily challenge": same question for everyone on a given UTC
 * day, drawn from the most-asked pool. No cron needed — pure date math.
 */
export const getDailyChallenge = unstable_cache(
  async () => {
    const total = Math.min(POOL_SIZE, await prisma.question.count());
    if (total === 0) return null;

    const dayNumber = Math.floor(Date.now() / 86_400_000);
    // LCG-style scramble so consecutive days don't walk the list in order.
    const index = (dayNumber * 2_654_435_761) % total;

    const [question] = await prisma.question.findMany({
      orderBy: [{ companies: { _count: "desc" } }, { id: "asc" }],
      skip: Math.abs(index),
      take: 1,
      include: { _count: { select: { companies: true } } },
    });
    return question ?? null;
  },
  ["daily-challenge"],
  { revalidate: 3600 }
);
