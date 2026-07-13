import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { revisionSchema } from "@/lib/validations";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const revisions = await prisma.revision.findMany({
    where: { userId: user.id },
    orderBy: { dueAt: "asc" },
    include: { question: { select: { slug: true, title: true, difficulty: true } } },
  });
  return NextResponse.json({ revisions });
}

/**
 * Spaced repetition: `schedule` starts at 1 day; each `review` doubles the
 * interval (capped at 60 days); `master` closes it out; `remove` deletes it.
 */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to schedule revisions" }, { status: 401 });

  const parsed = revisionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const { questionId, action, grade } = parsed.data;

  const key = { userId_questionId: { userId: user.id, questionId } };
  const inDays = (n: number) => new Date(Date.now() + n * 86_400_000);

  if (action === "remove") {
    await prisma.revision.deleteMany({ where: { userId: user.id, questionId } });
    return NextResponse.json({ revision: null });
  }

  if (action === "schedule") {
    const revision = await prisma.revision.upsert({
      where: key,
      create: { userId: user.id, questionId, dueAt: inDays(1), intervalDays: 1 },
      update: { status: "NEEDS_REVISION", dueAt: inDays(1), intervalDays: 1 },
    });
    return NextResponse.json({ revision });
  }

  const existing = await prisma.revision.findUnique({ where: key });
  if (!existing) return NextResponse.json({ error: "Nothing scheduled" }, { status: 404 });

  if (action === "review") {
    // Grade-aware spaced repetition:
    //   easy ×2.5 · medium ×2 · hard ×1.2 · forgot → back to 1 day.
    const multiplier = grade === "easy" ? 2.5 : grade === "hard" ? 1.2 : 2;
    const next =
      grade === "forgot"
        ? 1
        : Math.min(60, Math.max(existing.intervalDays + 1, Math.round(existing.intervalDays * multiplier)));
    const revision = await prisma.revision.update({
      where: key,
      data: {
        status: grade === "forgot" ? "NEEDS_REVISION" : "REVISED",
        intervalDays: next,
        dueAt: inDays(next),
        lastReviewedAt: new Date(),
      },
    });
    await prisma.activity.create({
      data: { userId: user.id, type: "revision", meta: { questionId } },
    });
    return NextResponse.json({ revision });
  }

  // master
  const revision = await prisma.revision.update({
    where: key,
    data: { status: "MASTERED", lastReviewedAt: new Date() },
  });
  return NextResponse.json({ revision });
}
