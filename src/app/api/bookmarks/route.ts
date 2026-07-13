import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { bookmarkSchema } from "@/lib/validations";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      question: { select: { slug: true, title: true, difficulty: true } },
      company: { select: { slug: true, name: true, totalQuestions: true, logoUrl: true } },
      sheet: { select: { slug: true, title: true } },
    },
  });
  return NextResponse.json({ bookmarks });
}

/** Toggles a bookmark on/off for a question, company, or sheet. */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to bookmark" }, { status: 401 });

  const parsed = bookmarkSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const { questionId, companyId, sheetId, folder } = parsed.data;

  const existing = await prisma.bookmark.findFirst({
    where: {
      userId: user.id,
      questionId: questionId ?? null,
      companyId: companyId ?? null,
      sheetId: sheetId ?? null,
    },
  });

  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } });
    return NextResponse.json({ bookmarked: false });
  }

  await prisma.bookmark.create({
    data: { userId: user.id, questionId, companyId, sheetId, folder },
  });
  await prisma.activity.create({
    data: { userId: user.id, type: "bookmark", meta: { questionId, companyId, sheetId } },
  });
  return NextResponse.json({ bookmarked: true });
}
