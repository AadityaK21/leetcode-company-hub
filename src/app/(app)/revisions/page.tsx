import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { RevisionQueue } from "@/components/revisions/revision-queue";

export const metadata = { title: "Revisions — CompanyHub" };

export default async function RevisionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/revisions");

  const revisions = await prisma.revision.findMany({
    where: { userId: session.user.id },
    orderBy: { dueAt: "asc" },
    include: { question: { select: { slug: true, title: true, difficulty: true } } },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Spaced repetition"
        title="Revision queue"
        description="Each review doubles the interval — 1, 2, 4, 8 days — until a problem sticks."
      />
      <RevisionQueue
        initial={revisions.map((r) => ({
          questionId: r.questionId,
          slug: r.question.slug,
          title: r.question.title,
          difficulty: r.question.difficulty,
          status: r.status,
          dueAt: r.dueAt.toISOString(),
          intervalDays: r.intervalDays,
        }))}
      />
    </div>
  );
}
