import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * "Pick for me": returns a random question the user hasn't solved yet,
 * optionally scoped to a company, sheet, or difficulty.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const company = params.get("company") ?? undefined;
  const sheet = params.get("sheet") ?? undefined;
  const difficulty = params.get("difficulty") ?? undefined;

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const where: Prisma.QuestionWhereInput = {
    ...(company ? { companies: { some: { company: { slug: company } } } } : {}),
    ...(sheet ? { sheetItems: { some: { sheet: { slug: sheet } } } } : {}),
    ...(difficulty && ["EASY", "MEDIUM", "HARD"].includes(difficulty)
      ? { difficulty: difficulty as "EASY" | "MEDIUM" | "HARD" }
      : {}),
    ...(userId
      ? { progress: { none: { userId, status: { in: ["SOLVED", "MASTERED"] } } } }
      : {}),
  };

  const total = await prisma.question.count({ where });
  if (total === 0) {
    return NextResponse.json({ question: null, message: "Nothing unsolved in this scope" });
  }

  const skip = Math.floor(Math.random() * total);
  const [question] = await prisma.question.findMany({
    where,
    orderBy: { id: "asc" },
    skip,
    take: 1,
    select: { slug: true, title: true, difficulty: true },
  });

  return NextResponse.json({ question });
}
