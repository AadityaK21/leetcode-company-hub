import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { progressSchema } from "@/lib/validations";
import { recordSolve } from "@/lib/gamification";

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to track progress" }, { status: 401 });

  const parsed = progressSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const { questionId, status } = parsed.data;

  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const previous = await prisma.progress.findUnique({
    where: { userId_questionId: { userId: user.id, questionId } },
  });

  const solvedNow = status === "SOLVED" || status === "MASTERED";
  const wasSolved = previous?.status === "SOLVED" || previous?.status === "MASTERED";

  const progress = await prisma.progress.upsert({
    where: { userId_questionId: { userId: user.id, questionId } },
    create: { userId: user.id, questionId, status, solvedAt: solvedNow ? new Date() : null },
    update: { status, ...(solvedNow && !wasSolved ? { solvedAt: new Date() } : {}) },
  });

  if (solvedNow && !wasSolved) {
    await recordSolve(user.id, questionId, question.difficulty);
  } else if (status === "ATTEMPTED" && previous?.status !== "ATTEMPTED") {
    await prisma.activity.create({
      data: { userId: user.id, type: "attempted", meta: { questionId } },
    });
  }

  return NextResponse.json({ status: progress.status });
}
