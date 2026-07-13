import Link from "next/link";
import { GitCompareArrows, Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { CompareBuilder, type CompareCompanyOption } from "@/components/compare/compare-builder";
import { EmptyState } from "@/components/shared/empty-state";
import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import { FrequencyMeter } from "@/components/shared/frequency-meter";
import { CompanyLogo } from "@/components/shared/company-logo";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNumber } from "@/lib/utils";

export const metadata = { title: "Compare companies — CompanyHub" };

const MAX_ROWS = 60;

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string | string[] }>;
}) {
  const { c } = await searchParams;
  const requested = (Array.isArray(c) ? c : c ? [c] : []).slice(0, 3);

  const options: CompareCompanyOption[] = await prisma.company.findMany({
    orderBy: { totalQuestions: "desc" },
    select: { slug: true, name: true, logoUrl: true, totalQuestions: true },
  });

  // Only keep slugs that actually exist.
  const valid = requested.filter((slug) => options.some((o) => o.slug === slug));
  const companies = await prisma.company.findMany({
    where: { slug: { in: valid } },
    select: {
      id: true,
      slug: true,
      name: true,
      logoUrl: true,
      totalQuestions: true,
    },
  });
  // Preserve URL order.
  companies.sort((a, b) => valid.indexOf(a.slug) - valid.indexOf(b.slug));

  const comparing = companies.length >= 2;
  let common: {
    slug: string;
    title: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    isPremium: boolean;
    freq: Record<string, number>;
    combined: number;
  }[] = [];
  let commonTotal = 0;

  if (comparing) {
    const questions = await prisma.question.findMany({
      where: {
        AND: companies.map((co) => ({
          companies: { some: { companyId: co.id } },
        })),
      },
      include: {
        companies: {
          where: { companyId: { in: companies.map((co) => co.id) } },
          select: { companyId: true, frequency: true },
        },
      },
      take: 500,
    });
    commonTotal = questions.length;

    const idToSlug = new Map(companies.map((co) => [co.id, co.slug]));
    common = questions
      .map((q) => {
        const freq: Record<string, number> = {};
        let combined = 0;
        for (const cq of q.companies) {
          const slug = idToSlug.get(cq.companyId)!;
          freq[slug] = cq.frequency;
          combined += cq.frequency;
        }
        return {
          slug: q.slug,
          title: q.title,
          difficulty: q.difficulty,
          isPremium: q.isPremium,
          freq,
          combined,
        };
      })
      .sort((a, b) => b.combined - a.combined)
      .slice(0, MAX_ROWS);
  }

  const smallest = comparing
    ? Math.min(...companies.map((co) => co.totalQuestions || 1))
    : 1;
  const overlapPct = comparing ? Math.round((commonTotal / smallest) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Prep smarter"
        title="Compare companies"
        description="See the questions your target companies share — every overlap problem you solve preps you for all of them at once."
      />

      <CompareBuilder options={options} selected={valid} />

      {!comparing ? (
        <EmptyState
          icon={GitCompareArrows}
          title="Pick at least two companies"
          description="Try comparing your top targets — the overlap is usually bigger than people expect."
        />
      ) : (
        <>
          {/* Overlap stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {companies.map((co) => (
              <Card key={co.slug}>
                <CardContent className="flex items-center gap-3 p-5">
                  <CompanyLogo name={co.name} logoUrl={co.logoUrl} size={36} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{co.name}</p>
                    <p className="figure text-xs text-muted-foreground">
                      {formatNumber(co.totalQuestions)} questions
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card className="border-lime/50 bg-lime/10">
              <CardContent className="p-5">
                <p className="eyebrow">In common</p>
                <p className="figure mt-1 font-display text-3xl font-semibold">
                  {formatNumber(commonTotal)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {overlapPct}% of the smallest list overlaps
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Common questions */}
          {common.length === 0 ? (
            <EmptyState
              icon={GitCompareArrows}
              title="No overlap found"
              description="These companies don't share any tracked questions. Try a different combination."
            />
          ) : (
            <div className="glass overflow-x-auto rounded-2xl">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border/70 text-left">
                    <th className="eyebrow p-3 font-normal">Question</th>
                    <th className="eyebrow p-3 font-normal">Level</th>
                    {companies.map((co) => (
                      <th key={co.slug} className="eyebrow p-3 font-normal">
                        <span className="flex items-center gap-1.5">
                          <CompanyLogo name={co.name} logoUrl={co.logoUrl} size={18} />
                          {co.name}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {common.map((q) => (
                    <tr
                      key={q.slug}
                      className="border-b border-border/40 transition-colors last:border-0 hover:bg-accent/50"
                    >
                      <td className="max-w-[300px] p-3">
                        <span className="flex items-center gap-2">
                          <Link
                            href={`/problems/${q.slug}`}
                            className="truncate font-medium hover:underline"
                          >
                            {q.title}
                          </Link>
                          {q.isPremium && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Lock
                                  className="size-3.5 shrink-0 text-amber-500"
                                  aria-label="LeetCode Premium"
                                />
                              </TooltipTrigger>
                              <TooltipContent>LeetCode Premium</TooltipContent>
                            </Tooltip>
                          )}
                        </span>
                      </td>
                      <td className="p-3">
                        <DifficultyBadge difficulty={q.difficulty} />
                      </td>
                      {companies.map((co) => (
                        <td key={co.slug} className="p-3">
                          <FrequencyMeter value={q.freq[co.slug] ?? 0} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {commonTotal > MAX_ROWS && (
                <p className="figure border-t border-border/40 p-3 text-center text-xs text-muted-foreground">
                  Showing the top {MAX_ROWS} of {commonTotal} shared questions, ranked by combined
                  frequency.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
