import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`search:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Slow down" }, { status: 429 });
  }

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
