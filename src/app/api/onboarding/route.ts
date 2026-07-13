import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const schema = z.object({
  skip: z.boolean().optional(),
  companyIds: z.array(z.string().cuid()).max(5).optional(),
  dailyGoal: z.number().int().min(1).max(50).optional(),
  sheetSlug: z.string().max(100).nullable().optional(),
});

/** Persists the first-run wizard: bookmarks targets, sets the goal, marks onboarded. */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const { skip, companyIds = [], dailyGoal, sheetSlug } = parsed.data;

  if (!skip) {
    // Bookmark target companies (idempotent).
    for (const companyId of companyIds) {
      const exists = await prisma.bookmark.findFirst({
        where: { userId: user.id, companyId },
        select: { id: true },
      });
      if (!exists) {
        await prisma.bookmark.create({
          data: { userId: user.id, companyId, folder: "targets" },
        });
      }
    }

    // Bookmark the chosen starting sheet.
    if (sheetSlug) {
      const sheet = await prisma.studySheet.findUnique({
        where: { slug: sheetSlug },
        select: { id: true },
      });
      if (sheet) {
        const exists = await prisma.bookmark.findFirst({
          where: { userId: user.id, sheetId: sheet.id },
          select: { id: true },
        });
        if (!exists) {
          await prisma.bookmark.create({ data: { userId: user.id, sheetId: sheet.id } });
        }
      }
    }
  }

  await prisma.userSettings.upsert({
    where: { userId: user.id },
    create: { userId: user.id, onboarded: true, ...(dailyGoal ? { dailyGoal } : {}) },
    update: { onboarded: true, ...(dailyGoal && !skip ? { dailyGoal } : {}) },
  });

  return NextResponse.json({ ok: true });
}
