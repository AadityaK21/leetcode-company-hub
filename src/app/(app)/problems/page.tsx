import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { QuestionTable } from "@/components/questions/question-table";
import { RandomPickButton } from "@/components/questions/random-pick-button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Problems — CompanyHub" };

export default async function ProblemsPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const { topic } = await searchParams;
  const topics = await prisma.topic.findMany({
    orderBy: { questions: { _count: "desc" } },
    take: 16,
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

      {topics.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5" aria-label="Filter by topic">
          <TopicChip href="/problems" active={!topic} label="All topics" />
          {topics.map((t) => (
            <TopicChip
              key={t.slug}
              href={`/problems?topic=${t.slug}`}
              active={topic === t.slug}
              label={t.name}
            />
          ))}
        </div>
      )}

      {/* Remount the table when the topic changes so its internal state resets */}
      <QuestionTable key={topic ?? "all"} initialTopic={topic} />
    </div>
  );
}

function TopicChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
      )}
    >
      {label}
    </Link>
  );
}
