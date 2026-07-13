import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { CompanyLogo } from "@/components/shared/company-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Analytics — CompanyHub" };

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/analytics");
  const userId = session.user.id;

  const solvedFilter = {
    progress: { some: { userId, status: { in: ["SOLVED", "MASTERED"] as ("SOLVED" | "MASTERED")[] } } },
  };

  const [totalSolved, byDifficulty, topTopics, targetBookmarks] = await Promise.all([
    prisma.question.count({ where: solvedFilter }),
    Promise.all(
      (["EASY", "MEDIUM", "HARD"] as const).map(async (difficulty) => ({
        difficulty,
        solved: await prisma.question.count({ where: { ...solvedFilter, difficulty } }),
        total: await prisma.question.count({ where: { difficulty } }),
      }))
    ),
    prisma.topic.findMany({
      orderBy: { questions: { _count: "desc" } },
      take: 10,
      select: { slug: true, name: true, _count: { select: { questions: true } } },
    }),
    prisma.bookmark.findMany({
      where: { userId, companyId: { not: null } },
      include: { company: true },
      take: 6,
    }),
  ]);

  // Solved-per-topic for the top topics.
  const topicStats = await Promise.all(
    topTopics.map(async (t) => ({
      ...t,
      solved: await prisma.question.count({
        where: { ...solvedFilter, topics: { some: { topic: { slug: t.slug } } } },
      }),
    }))
  );

  // Readiness per target company: share of its questions you've solved.
  const readiness = await Promise.all(
    targetBookmarks
      .filter((b) => b.company)
      .map(async (b) => ({
        company: b.company!,
        solved: await prisma.question.count({
          where: { ...solvedFilter, companies: { some: { companyId: b.company!.id } } },
        }),
      }))
  );

  const strongest = [...topicStats].sort((a, b) => b.solved / Math.max(1, b._count.questions) - a.solved / Math.max(1, a._count.questions))[0];
  const weakest = [...topicStats].filter((t) => t._count.questions >= 10).sort((a, b) => a.solved / Math.max(1, a._count.questions) - b.solved / Math.max(1, b._count.questions))[0];

  if (totalSolved === 0) {
    return (
      <div>
        <PageHeader eyebrow="Insights" title="Analytics" description="Your strengths, gaps, and company readiness." />
        <EmptyState
          icon={BarChart3}
          title="No data yet"
          description="Solve a few problems and this page turns into your personal readiness report."
          action={
            <Button asChild variant="lime" size="sm">
              <Link href="/problems">Start solving</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        description={
          strongest && weakest
            ? `Strongest: ${strongest.name}. Biggest gap: ${weakest.name}.`
            : "Your strengths, gaps, and company readiness."
        }
      />

      {/* Difficulty coverage */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Difficulty coverage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {byDifficulty.map((d) => {
            const pct = d.total ? Math.round((d.solved / d.total) * 100) : 0;
            const color =
              d.difficulty === "EASY"
                ? "bg-emerald-500"
                : d.difficulty === "MEDIUM"
                  ? "bg-amber-500"
                  : "bg-rose-500";
            return (
              <div key={d.difficulty}>
                <div className="figure mb-1.5 flex justify-between text-xs">
                  <span className="font-medium">
                    {d.difficulty[0] + d.difficulty.slice(1).toLowerCase()}
                  </span>
                  <span className="text-muted-foreground">
                    {d.solved} / {d.total} · {pct}%
                  </span>
                </div>
                <Progress value={pct} indicatorClassName={color} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Topic strength */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Topic strength</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topicStats.map((t) => {
              const pct = t._count.questions ? Math.round((t.solved / t._count.questions) * 100) : 0;
              return (
                <Link key={t.slug} href={`/problems?topic=${t.slug}`} className="group block">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium group-hover:underline">{t.name}</span>
                    <span className="figure text-muted-foreground">
                      {t.solved}/{t._count.questions}
                    </span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {/* Company readiness */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Company readiness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {readiness.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Bookmark your target companies (or pick them in onboarding) to track readiness here.
              </p>
            )}
            {readiness.map(({ company, solved }) => {
              const pct = company.totalQuestions
                ? Math.round((solved / company.totalQuestions) * 100)
                : 0;
              return (
                <Link key={company.slug} href={`/companies/${company.slug}`} className="group block">
                  <div className="mb-1 flex items-center gap-2 text-xs">
                    <CompanyLogo name={company.name} logoUrl={company.logoUrl} size={18} />
                    <span className="font-medium group-hover:underline">{company.name}</span>
                    <span
                      className={cn(
                        "figure ml-auto",
                        pct >= 60 ? "text-lime" : pct >= 25 ? "text-amber-500" : "text-muted-foreground"
                      )}
                    >
                      {solved}/{company.totalQuestions} · {pct}%
                    </span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </Link>
              );
            })}
            {readiness.length > 0 && (
              <p className="pt-1 text-xs text-muted-foreground">
                Readiness = share of a company&apos;s tracked questions you&apos;ve solved. Frequency-weighted prep beats raw coverage — start from the top of each company&apos;s list.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
