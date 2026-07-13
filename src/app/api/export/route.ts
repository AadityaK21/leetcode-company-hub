import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

/** Exports the signed-in user's data (progress, notes, bookmarks, revisions) as JSON. */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [progress, notes, bookmarks, revisions, activities] = await Promise.all([
    prisma.progress.findMany({
      where: { userId: user.id },
      include: { question: { select: { slug: true, title: true } } },
    }),
    prisma.note.findMany({
      where: { userId: user.id },
      include: { question: { select: { slug: true, title: true } } },
    }),
    prisma.bookmark.findMany({ where: { userId: user.id } }),
    prisma.revision.findMany({
      where: { userId: user.id },
      include: { question: { select: { slug: true, title: true } } },
    }),
    prisma.activity.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
  ]);

  return new NextResponse(
    JSON.stringify({ exportedAt: new Date(), progress, notes, bookmarks, revisions, activities }, null, 2),
    {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="companyhub-export.json"',
      },
    }
  );
}
