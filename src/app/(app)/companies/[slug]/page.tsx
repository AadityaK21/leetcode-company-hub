import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCompanyTopicDistribution } from "@/lib/queries";
import { CompanyLogo } from "@/components/shared/company-logo";
import { DifficultySpectrum } from "@/components/shared/difficulty-spectrum";
import { QuestionTable } from "@/components/questions/question-table";
import { CompanyBookmarkButton } from "@/components/companies/company-bookmark-button";
import { RandomPickButton } from "@/components/questions/random-pick-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    topic?: string;
    q?: string;
    difficulty?: string;
    status?: string;
    recency?: string;
    sort?: string;
    order?: string;
    page?: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const company = await prisma.company.findUnique({ where: { slug }, select: { name: true } });
  return { title: company ? `${company.name} interview questions — CompanyHub` : "Company — CompanyHub" };
}

export default async function CompanyPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;

  const company = await prisma.company.findUnique({ where: { slug } });
  if (!company) notFound();

  const topics = await getCompanyTopicDistribution(company.id);
  const maxTopic = Math.max(1, ...topics.map((t) => t.count));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="glass-strong rounded-3xl p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-4">
          <CompanyLogo name={company.name} logoUrl={company.logoUrl} size={56} />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl font-semibold tracking-tight">{company.name}</h1>
            <p className="figure mt-1 text-sm text-muted-foreground">
              {formatNumber(company.totalQuestions)} tagged questions
              {company.lastSyncedAt && ` · synced ${company.lastSyncedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <RandomPickButton company={company.slug} />
            <CompanyBookmarkButton companyId={company.id} />
            <Button asChild variant="outline" size="sm">
              <a
                href={`https://leetcode.com/company/${company.slug}/`}
                target="_blank"
                rel="noreferrer"
              >
                LeetCode <ExternalLink />
              </a>
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          {/* Difficulty */}
          <div>
            <p className="eyebrow mb-3">Difficulty split</p>
            <DifficultySpectrum
              easy={company.easyCount}
              medium={company.mediumCount}
              hard={company.hardCount}
              className="h-2.5"
            />
            <div className="mt-3 flex gap-2">
              <Badge variant="easy">{company.easyCount} Easy</Badge>
              <Badge variant="medium">{company.mediumCount} Medium</Badge>
              <Badge variant="hard">{company.hardCount} Hard</Badge>
            </div>
          </div>

          {/* Topic distribution */}
          {topics.length > 0 && (
            <div>
              <p className="eyebrow mb-3">Most asked topics</p>
              <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
                {topics.slice(0, 8).map((t) => (
                  <div key={t.slug} className="flex items-center gap-2 text-xs">
                    <span className="w-28 truncate text-muted-foreground">{t.name}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-lime"
                        style={{ width: `${(t.count / maxTopic) * 100}%` }}
                      />
                    </div>
                    <span className="figure w-6 text-right text-muted-foreground">{t.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Questions (with in-table topic chips) */}
      <QuestionTable
        company={company.slug}
        showRecency
        initialTopic={sp.topic}
        topicOptions={topics}
        initialFilters={{
          q: sp.q,
          difficulty: sp.difficulty,
          status: sp.status,
          recency: sp.recency,
          sort: sp.sort,
          order: sp.order,
          page: sp.page,
        }}
      />
    </div>
  );
}
