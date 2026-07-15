import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { QuestionTable } from "@/components/questions/question-table";
import { RandomPickButton } from "@/components/questions/random-pick-button";

export const metadata = { title: "Problems — CompanyHub" };

export default async function ProblemsPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const { topic } = await searchParams;
  const topics = await prisma.topic.findMany({
    orderBy: { questions: { _count: "desc" } },
    select: { slug: true, name: true },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Problem bank"
        title="All problems"
        description="Every question across every company, ranked by how many companies ask it."
        actions={<RandomPickButton variant="lime" />}
      />

      <QuestionTable initialTopic={topic} topicOptions={topics} />
    </div>
  );
}
