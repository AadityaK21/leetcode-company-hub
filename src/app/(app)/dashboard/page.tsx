import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Flame,
  NotebookPen,
  RotateCcw,
  Target,
  Trophy,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { currentStreak } from "@/lib/gamification";
import { getPersonalBests } from "@/lib/insights";
import { getDailyChallenge } from "@/lib/daily";
import { PageHeader } from "@/components/shared/page-header";
import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { Heatmap } from "@/components/dashboard/heatmap";
import { LevelRing } from "@/components/dashboard/level-ring";
import { WeeklyChartLazy } from "@/components/dashboard/weekly-chart-lazy";
import { DailyChallenge } from "@/components/dashboard/daily-challenge";
import { PersonalBests } from "@/components/dashboard/personal-bests";
import {
  OnboardingDialog,
  type OnboardingCompany,
  type OnboardingSheet,
} from "@/components/dashboard/onboarding-dialog";
import { CompanyLogo } from "@/components/shared/company-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";

export const metadata = { title: "Dashboard — CompanyHub" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard");
  const userId = session.user.id;

  const since = new Date();
  since.setDate(since.getDate() - 26 * 7);

  const [user, solvedByDifficulty, bookmarks, notes, dueRevisions, activities, achievements] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, include: { settings: true } }),
      prisma.progress.groupBy({
        by: ["status"],
        where: { userId },
        _count: true,
      }),
      prisma.bookmark.count({ where: { userId } }),
      prisma.note.count({ where: { userId } }),
      prisma.revision.findMany({
        where: { userId, status: { not: "MASTERED" }, dueAt: { lte: new Date() } },
        orderBy: { dueAt: "asc" },
        take: 5,
        include: { question: { select: { slug: true, title: true, difficulty: true } } },
      }),
      prisma.activity.findMany({
        where: { userId, type: "solved", createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      prisma.userAchievement.findMany({
        where: { userId },
        include: { achievement: true },
        orderBy: { earnedAt: "desc" },
      }),
    ]);

  const solved =
    (solvedByDifficulty.find((s) => s.status === "SOLVED")?._count ?? 0) +
    (solvedByDifficulty.find((s) => s.status === "MASTERED")?._count ?? 0);
  const attempted = solvedByDifficulty.find((s) => s.status === "ATTEMPTED")?._count ?? 0;

  // Heatmap counts keyed by ISO date.
  const heatCounts: Record<string, number> = {};
  for (const a of activities) {
    const key = a.createdAt.toISOString().slice(0, 10);
    heatCounts[key] = (heatCounts[key] ?? 0) + 1;
  }

  // Last 7 days for the weekly chart.
  const weekly: { day: string; solved: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    weekly.push({
      day: d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
      solved: heatCounts[key] ?? 0,
    });
  }

  const [streak, bests, daily, targetBookmarks] = await Promise.all([
    currentStreak(userId),
    getPersonalBests(userId),
    getDailyChallenge(),
    prisma.bookmark.findMany({
      where: { userId, companyId: { not: null } },
      take: 6,
      orderBy: { createdAt: "asc" },
      include: {
        company: {
          select: { slug: true, name: true, logoUrl: true, totalQuestions: true },
        },
      },
    }),
  ]);

  const needsOnboarding = !user?.settings?.onboarded;
  let onboardingCompanies: OnboardingCompany[] = [];
  let onboardingSheets: OnboardingSheet[] = [];
  if (needsOnboarding) {
    const [topCompanies, officialSheets] = await Promise.all([
      prisma.company.findMany({
        orderBy: { totalQuestions: "desc" },
        take: 12,
        select: { id: true, slug: true, name: true, logoUrl: true, totalQuestions: true },
      }),
      prisma.studySheet.findMany({
        where: { isOfficial: true },
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { questions: true } } },
      }),
    ]);
    onboardingCompanies = topCompanies;
    onboardingSheets = officialSheets.map((sh) => ({
      slug: sh.slug,
      title: sh.title,
      description: sh.description,
      count: sh._count.questions,
    }));
  }
  const dailySolvedRecord = daily
    ? await prisma.progress.findUnique({
        where: { userId_questionId: { userId, questionId: daily.id } },
        select: { status: true },
      })
    : null;
  const dailySolved =
    dailySolvedRecord?.status === "SOLVED" || dailySolvedRecord?.status === "MASTERED";
  const todaySolved = heatCounts[new Date().toISOString().slice(0, 10)] ?? 0;
  const dailyGoal = user?.settings?.dailyGoal ?? 2;
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${firstName}`}
        description={
          todaySolved >= dailyGoal
            ? `Daily goal hit — ${todaySolved}/${dailyGoal} solved today. Keep the streak alive.`
            : `${todaySolved}/${dailyGoal} toward today's goal.`
        }
        actions={
          <Button asChild variant="lime">
            <Link href="/companies">
              Continue prepping <ArrowRight />
            </Link>
          </Button>
        }
      />

      <DailyChallenge
        question={
          daily
            ? {
                slug: daily.slug,
                title: daily.title,
                difficulty: daily.difficulty,
                companiesCount: daily._count.companies,
              }
            : null
        }
        solved={dailySolved}
      />

      {/* LeetCode auto-sync now runs app-wide from (app)/layout.tsx. */}

      {needsOnboarding && (
        <OnboardingDialog
          companies={onboardingCompanies}
          sheets={onboardingSheets}
          userName={firstName === "there" ? "" : firstName}
        />
      )}

      {targetBookmarks.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow">Your targets</span>
          {targetBookmarks.map(
            (b) =>
              b.company && (
                <Link
                  key={b.id}
                  href={`/companies/${b.company.slug}`}
                  className="glass flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-medium transition-colors hover:bg-accent"
                >
                  <CompanyLogo name={b.company.name} logoUrl={b.company.logoUrl} size={22} />
                  {b.company.name}
                </Link>
              )
          )}
        </div>
      )}

      {/* Stat row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CheckCircle2} label="Solved" value={formatNumber(solved)} hint={`${attempted} attempted`} />
        <StatCard icon={Flame} label="Streak" value={`${streak}d`} hint={streak > 0 ? "Solve daily to keep it" : "Solve one to start"} iconClassName={streak > 0 ? "size-4 text-amber-500 animate-flame motion-reduce:animate-none" : "size-4 text-muted-foreground"} />
        <StatCard icon={Bookmark} label="Bookmarks" value={bookmarks} hint="Across problems & companies" />
        <StatCard icon={NotebookPen} label="Notes" value={notes} hint="Markdown, versioned" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          {/* Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <Heatmap counts={heatCounts} />
            </CardContent>
          </Card>

          {/* Weekly chart */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">This week</CardTitle>
            </CardHeader>
            <CardContent>
              <WeeklyChartLazy data={weekly} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Level */}
          <Card>
            <CardContent className="flex items-center gap-5 p-5">
              <LevelRing xp={user?.xp ?? 0} />
              <div>
                <p className="figure font-display text-2xl font-semibold">{formatNumber(user?.xp ?? 0)} XP</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Easy +10 · Medium +25 · Hard +50
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Revision queue */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="font-display text-lg">Due for revision</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/revisions">All</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-1">
              {dueRevisions.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nothing due. Add problems with <RotateCcw className="inline size-3.5" /> “Revise later”.
                </p>
              )}
              {dueRevisions.map((r) => (
                <Link
                  key={r.id}
                  href={`/problems/${r.question.slug}`}
                  className="flex items-center justify-between gap-3 rounded-xl p-2 transition-colors hover:bg-accent"
                >
                  <span className="min-w-0 truncate text-sm font-medium">{r.question.title}</span>
                  <DifficultyBadge difficulty={r.question.difficulty} />
                </Link>
              ))}
            </CardContent>
          </Card>

          <PersonalBests bests={bests} />

          {/* Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Achievements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {achievements.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  <Target className="mr-1 inline size-3.5" />
                  Solve your first problem to unlock your first badge.
                </p>
              )}
              {achievements.slice(0, 5).map((ua) => (
                <div key={ua.id} className="flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-lime/15">
                    <Trophy className="size-4 text-lime" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{ua.achievement.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{ua.achievement.description}</p>
                  </div>
                  <Badge variant="secondary" className="capitalize">{ua.achievement.tier.toLowerCase()}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
