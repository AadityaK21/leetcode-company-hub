import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { unstable_cache } from "next/cache";

export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Cached headline numbers for the landing page. */
export const getPlatformStats = unstable_cache(
  async () => {
    const [companies, questions, users, solves, topics] = await Promise.all([
      prisma.company.count(),
      prisma.question.count(),
      prisma.user.count(),
      prisma.progress.count({ where: { status: { in: ["SOLVED", "MASTERED"] } } }),
      prisma.topic.count(),
    ]);
    return { companies, questions, users, solves, topics };
  },
  ["platform-stats"],
  { revalidate: 300 }
);

export const getPopularCompanies = unstable_cache(
  async (take = 8) =>
    prisma.company.findMany({
      orderBy: { totalQuestions: "desc" },
      take,
    }),
  ["popular-companies"],
  { revalidate: 300 }
);

export const getTrendingQuestions = unstable_cache(
  async (take = 6) =>
    prisma.question.findMany({
      orderBy: { companies: { _count: "desc" } },
      take,
      include: { _count: { select: { companies: true } } },
    }),
  ["trending-questions"],
  { revalidate: 300 }
);

export async function getCompanyTopicDistribution(companyId: string) {
  // Return every topic this company asks (ordered by frequency) so the chip
  // filter can offer all of them; the "most asked" display just slices the top.
  const rows = await prisma.$queryRaw<{ name: string; slug: string; count: bigint }[]>`
    SELECT t."name", t."slug", COUNT(*)::bigint AS count
    FROM "CompanyQuestion" cq
    JOIN "QuestionTopic" qt ON qt."questionId" = cq."questionId"
    JOIN "Topic" t ON t."id" = qt."topicId"
    WHERE cq."companyId" = ${companyId}
    GROUP BY t."name", t."slug"
    ORDER BY count DESC
    LIMIT 50
  `;
  return rows.map((r) => ({ name: r.name, slug: r.slug, count: Number(r.count) }));
}
