import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { noteSchema } from "@/lib/validations";

const MAX_VERSIONS = 15;

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const questionId = new URL(req.url).searchParams.get("questionId");
  if (!questionId) return NextResponse.json({ error: "questionId required" }, { status: 400 });

  const note = await prisma.note.findUnique({
    where: { userId_questionId: { userId: user.id, questionId } },
    include: { versions: { orderBy: { createdAt: "desc" }, take: 10 } },
  });
  return NextResponse.json({ note });
}

/** Upserts a note; previous content is kept as a version (capped at 15). */
export async function PUT(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to take notes" }, { status: 401 });

  const parsed = noteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const { questionId, content } = parsed.data;

  const existing = await prisma.note.findUnique({
    where: { userId_questionId: { userId: user.id, questionId } },
  });

  const note = await prisma.note.upsert({
    where: { userId_questionId: { userId: user.id, questionId } },
    create: { userId: user.id, questionId, content },
    update: { content },
  });

  if (existing && existing.content !== content) {
    await prisma.noteVersion.create({ data: { noteId: note.id, content: existing.content } });
    // Prune history beyond the newest MAX_VERSIONS entries.
    const excess = await prisma.noteVersion.findMany({
      where: { noteId: note.id },
      orderBy: { createdAt: "desc" },
      skip: MAX_VERSIONS,
      select: { id: true },
    });
    if (excess.length > 0) {
      await prisma.noteVersion.deleteMany({ where: { id: { in: excess.map((v) => v.id) } } });
    }
  }

  if (!existing) {
    await prisma.activity.create({ data: { userId: user.id, type: "note", meta: { questionId } } });
  }

  return NextResponse.json({ updatedAt: note.updatedAt });
}
