import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { questionQuerySchema } from "@/lib/validations";

export async function GET(req: Request) {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = questionQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }
  const f = parsed.data;
  const session = await auth();
  const userId = session?.user?.id ?? null;

  // Per-user status filters require sign-in; ignore them otherwise.
  const status = userId ? f.status : undefined;

  // `topic` may be a comma-separated list of slugs; match questions carrying
  // ANY of them (OR semantics) so users can combine tags.
  const topicSlugs = f.topic
    ? f.topic.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const questionWhere: Prisma.QuestionWhereInput = {
    ...(f.q ? { title: { contains: f.q, mode: "insensitive" } } : {}),
    ...(f.difficulty ? { difficulty: f.difficulty } : {}),
    ...(topicSlugs.length ? { topics: { some: { topic: { slug: { in: topicSlugs } } } } } : {}),
    ...(f.sheet ? { sheetItems: { some: { sheet: { slug: f.sheet } } } } : {}),
    ...(status === "BOOKMARKED" ? { bookmarks: { some: { userId: userId! } } } : {}),
    ...(status === "TODO"
      ? { progress: { none: { userId: userId!, status: { in: ["ATTEMPTED", "SOLVED", "MASTERED"] } } } }
      : {}),
    ...(status && status !== "BOOKMARKED" && status !== "TODO"
      ? { progress: { some: { userId: userId!, status } } }
      : {}),
  };

  const skip = (f.page - 1) * f.pageSize;
  let rows: {
    id: string;
    slug: string;
    title: string;
    difficulty: string;
    acceptance: number | null;
    isPremium: boolean;
    leetcodeUrl: string;
    topics: string[];
    frequency: number | null;
    companiesCount: number;
  }[] = [];
  let total = 0;

  if (f.company) {
    const where: Prisma.CompanyQuestionWhereInput = {
      company: { slug: f.company },
      question: questionWhere,
      ...(f.recency === "30d" ? { inLast30Days: true } : {}),
      ...(f.recency === "3m" ? { inLast3Months: true } : {}),
      ...(f.recency === "6m" ? { inLast6Months: true } : {}),
      ...(f.recency === "1y" ? { inLastYear: true } : {}),
    };
    const orderBy: Prisma.CompanyQuestionOrderByWithRelationInput =
      f.sort === "frequency"
        ? { frequency: f.order }
        : f.sort === "acceptance"
          ? { question: { acceptance: f.order } }
          : f.sort === "difficulty"
            ? { question: { difficulty: f.order } }
            : { question: { title: f.order } };

    const [items, count] = await Promise.all([
      prisma.companyQuestion.findMany({
        where,
        orderBy,
        skip,
        take: f.pageSize,
        include: {
          question: {
            include: {
              topics: { include: { topic: true } },
              _count: { select: { companies: true } },
            },
          },
        },
      }),
      prisma.companyQuestion.count({ where }),
    ]);
    total = count;
    rows = items.map((cq) => ({
      id: cq.question.id,
      slug: cq.question.slug,
      title: cq.question.title,
      difficulty: cq.question.difficulty,
      acceptance: cq.question.acceptance,
      isPremium: cq.question.isPremium,
      leetcodeUrl: cq.question.leetcodeUrl,
      topics: cq.question.topics.map((t) => t.topic.name),
      frequency: cq.frequency,
      companiesCount: cq.question._count.companies,
    }));
  } else {
    const orderBy: Prisma.QuestionOrderByWithRelationInput =
      f.sort === "frequency"
        ? { companies: { _count: f.order } }
        : f.sort === "acceptance"
          ? { acceptance: f.order }
          : f.sort === "difficulty"
            ? { difficulty: f.order }
            : { title: f.order };

    const [items, count] = await Promise.all([
      prisma.question.findMany({
        where: questionWhere,
        orderBy,
        skip,
        take: f.pageSize,
        include: {
          topics: { include: { topic: true } },
          _count: { select: { companies: true } },
        },
      }),
      prisma.question.count({ where: questionWhere }),
    ]);
    total = count;
    rows = items.map((q) => ({
      id: q.id,
      slug: q.slug,
      title: q.title,
      difficulty: q.difficulty,
      acceptance: q.acceptance,
      isPremium: q.isPremium,
      leetcodeUrl: q.leetcodeUrl,
      topics: q.topics.map((t) => t.topic.name),
      frequency: null,
      companiesCount: q._count.companies,
    }));
  }

  // Attach the signed-in user's state for the visible page.
  let userState: Record<
    string,
    { status: string; verified: boolean; bookmarked: boolean; hasNote: boolean; revision: string | null }
  > = {};
  if (userId && rows.length > 0) {
    const ids = rows.map((r) => r.id);
    const [progress, bookmarks, notes, revisions] = await Promise.all([
      prisma.progress.findMany({ where: { userId, questionId: { in: ids } } }),
      prisma.bookmark.findMany({ where: { userId, questionId: { in: ids } } }),
      prisma.note.findMany({ where: { userId, questionId: { in: ids } }, select: { questionId: true } }),
      prisma.revision.findMany({ where: { userId, questionId: { in: ids } } }),
    ]);
    userState = Object.fromEntries(
      ids.map((id) => [
        id,
        {
          status: progress.find((p) => p.questionId === id)?.status ?? "TODO",
          verified: progress.find((p) => p.questionId === id)?.verified ?? false,
          bookmarked: bookmarks.some((b) => b.questionId === id),
          hasNote: notes.some((n) => n.questionId === id),
          revision: revisions.find((r) => r.questionId === id)?.status ?? null,
        },
      ])
    );
  }

  return NextResponse.json({
    rows: rows.map((r) => ({ ...r, user: userState[r.id] ?? null })),
    total,
    page: f.page,
    pageSize: f.pageSize,
    pageCount: Math.max(1, Math.ceil(total / f.pageSize)),
  });
}
