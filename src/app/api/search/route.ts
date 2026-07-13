import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 100) ?? "";
  if (!q) return NextResponse.json({ questions: [], companies: [], topics: [] });

  const [questions, companies, topics] = await Promise.all([
    prisma.question.findMany({
      where: { title: { contains: q, mode: "insensitive" } },
      select: { slug: true, title: true, difficulty: true },
      orderBy: { companies: { _count: "desc" } },
      take: 5,
    }),
    prisma.company.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: { slug: true, name: true, totalQuestions: true },
      orderBy: { totalQuestions: "desc" },
      take: 5,
    }),
    prisma.topic.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: { slug: true, name: true },
      take: 5,
    }),
  ]);

  return NextResponse.json({ questions, companies, topics });
}
