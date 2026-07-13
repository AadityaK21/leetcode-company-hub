import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { SheetSections, type SheetSection } from "@/components/sheets/sheet-sections";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sheet = await prisma.studySheet.findUnique({ where: { slug }, select: { title: true } });
  return { title: sheet ? `${sheet.title} — CompanyHub` : "Sheet — CompanyHub" };
}

export default async function SheetPage({ params }: Props) {
  const { slug } = await params;
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const sheet = await prisma.studySheet.findUnique({
    where: { slug },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { question: true },
      },
    },
  });
  if (!sheet) notFound();

  const questionIds = sheet.questions.map((sq) => sq.questionId);
  const progress = userId
    ? await prisma.progress.findMany({
        where: { userId, questionId: { in: questionIds } },
        select: { questionId: true, status: true },
      })
    : [];
  const statusById = new Map(progress.map((p) => [p.questionId, p.status]));

  // Group by section, preserving insertion order.
  const sectionMap = new Map<string, SheetSection>();
  for (const sq of sheet.questions) {
    const key = sq.section ?? "Problems";
    if (!sectionMap.has(key)) sectionMap.set(key, { title: key, questions: [] });
    sectionMap.get(key)!.questions.push({
      id: sq.question.id,
      slug: sq.question.slug,
      title: sq.question.title,
      difficulty: sq.question.difficulty,
      isPremium: sq.question.isPremium,
      leetcodeUrl: sq.question.leetcodeUrl,
      solved:
        statusById.get(sq.questionId) === "SOLVED" || statusById.get(sq.questionId) === "MASTERED",
    });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Study sheet"
        title={sheet.title}
        description={sheet.description ?? undefined}
      />
      <SheetSections sections={Array.from(sectionMap.values())} signedIn={!!userId} />
    </div>
  );
}
