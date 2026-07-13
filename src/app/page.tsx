import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Hero, type HeroCompany } from "@/components/landing/hero";
import { CompanyLogo } from "@/components/shared/company-logo";
import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import { DifficultySpectrum } from "@/components/shared/difficulty-spectrum";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { getPlatformStats, getPopularCompanies, getTrendingQuestions } from "@/lib/queries";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { prisma } from "@/lib/prisma";

export const revalidate = 300;

const FAQ = [
  {
    q: "Where does the data come from?",
    a: "Question lists per company come from the open-source snehasishroy/leetcode-companywise-interview-questions repository, refreshed from LeetCode's company tags. Each question carries a frequency score and a recency bucket (30 days to all time).",
  },
  {
    q: "Is this free?",
    a: "Yes. Every feature — company explorer, sheets, progress tracking, notes, and revision — is free. Some listed questions are LeetCode Premium problems, which is marked on each row.",
  },
  {
    q: "How does revision scheduling work?",
    a: "When you flag a question for revision, it enters a spaced-repetition queue. Each successful review doubles the interval (1 → 2 → 4 → 8 days…) until you mark it mastered.",
  },
  {
    q: "Can I track sheets like Blind 75?",
    a: "Yes — Blind 75 ships built in, and topic sheets (DP, Graphs, Trees, Binary Search and more) are generated from the most frequently asked questions across all companies. Progress syncs with your global solve status.",
  },
];

export default async function LandingPage() {
  const [stats, companies, trending, sheets] = await Promise.all([
    getPlatformStats(),
    getPopularCompanies(8),
    getTrendingQuestions(6),
    prisma.studySheet.findMany({
      where: { isOfficial: true },
      take: 4,
      include: { _count: { select: { questions: true } } },
    }),
  ]);

  const statItems = [
    { label: "Companies", value: stats.companies },
    { label: "Problems", value: stats.questions },
    { label: "Topics", value: stats.topics },
    { label: "Users", value: stats.users },
    { label: "Problems solved", value: stats.solves },
  ];

  return (
    <div className="min-h-dvh">
      {/* Marketing navbar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex" aria-label="Marketing">
            <Link href="/companies" className="transition-colors hover:text-foreground">Companies</Link>
            <Link href="/problems" className="transition-colors hover:text-foreground">Problems</Link>
            <Link href="/sheets" className="transition-colors hover:text-foreground">Sheets</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <Hero
        companies={companies as HeroCompany[]}
        questionCount={stats.questions}
        companyCount={stats.companies}
      />

      {/* Stats strip */}
      <section className="border-y border-border/60 bg-card/40">
        <div className="container grid grid-cols-2 gap-y-8 py-10 sm:grid-cols-3 lg:grid-cols-5">
          {statItems.map((s) => (
            <div key={s.label} className="text-center">
              <p className="figure font-display text-3xl font-semibold"><AnimatedNumber value={s.value} /></p>
              <p className="eyebrow mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Popular companies */}
      <section className="container py-20">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="eyebrow mb-2">Popular companies</p>
            <h2 className="font-display text-3xl font-semibold tracking-tight">Prep for who&apos;s actually hiring you</h2>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/companies">View all <ArrowRight /></Link>
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {companies.map((c) => (
            <Link key={c.slug} href={`/companies/${c.slug}`} className="group">
              <Card className="h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <CompanyLogo name={c.name} logoUrl={c.logoUrl} size={40} />
                    <div className="min-w-0">
                      <p className="truncate font-display font-semibold group-hover:underline">{c.name}</p>
                      <p className="figure text-xs text-muted-foreground">{c.totalQuestions} questions</p>
                    </div>
                    <ArrowUpRight className="ml-auto size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <DifficultySpectrum easy={c.easyCount} medium={c.mediumCount} hard={c.hardCount} className="mt-4" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Trending problems */}
      <section className="border-t border-border/60 bg-card/40 py-20">
        <div className="container">
          <p className="eyebrow mb-2">Trending problems</p>
          <h2 className="mb-8 font-display text-3xl font-semibold tracking-tight">
            Asked by the most companies right now
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {trending.map((q) => (
              <Link
                key={q.slug}
                href={`/problems/${q.slug}`}
                className="glass group flex items-center gap-4 rounded-2xl p-4 transition-colors hover:bg-accent"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium group-hover:underline">{q.title}</p>
                  <p className="figure mt-0.5 text-xs text-muted-foreground">
                    asked by {q._count.companies} companies
                  </p>
                </div>
                <DifficultyBadge difficulty={q.difficulty} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Sheets */}
      <section className="container py-20">
        <p className="eyebrow mb-2">Study sheets</p>
        <h2 className="mb-8 font-display text-3xl font-semibold tracking-tight">Structured paths, tracked progress</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sheets.map((s) => (
            <Link key={s.slug} href={`/sheets/${s.slug}`} className="group">
              <Card className="h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <CardContent className="flex h-full flex-col p-5">
                  <p className="font-display font-semibold group-hover:underline">{s.title}</p>
                  <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">{s.description}</p>
                  <p className="figure mt-4 text-xs text-muted-foreground">{s._count.questions} questions</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border/60 bg-card/40 py-20">
        <div className="container max-w-2xl">
          <p className="eyebrow mb-2 text-center">FAQ</p>
          <h2 className="mb-8 text-center font-display text-3xl font-semibold tracking-tight">Common questions</h2>
          <div className="space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="glass group rounded-2xl px-5 py-4 open:bg-card">
                <summary className="cursor-pointer list-none font-medium marker:hidden">
                  {item.q}
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="container py-20">
        <p className="eyebrow mb-2">Roadmap</p>
        <h2 className="mb-8 font-display text-3xl font-semibold tracking-tight">Shipped &amp; shipping</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="glass rounded-2xl p-5">
            <p className="eyebrow mb-3 text-lime">Live now</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Company-wise questions with real frequency</li>
              <li>LeetCode account sync (verified solves)</li>
              <li>In-browser code workspace with 9 languages</li>
              <li>Spaced repetition with graded reviews</li>
              <li>Analytics, sheets, streaks &amp; achievements</li>
            </ul>
          </div>
          <div className="glass rounded-2xl p-5">
            <p className="eyebrow mb-3 text-amber-500">In progress</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Interview countdown study plans</li>
              <li>Mobile-first table layouts</li>
              <li>Shareable public profiles</li>
            </ul>
          </div>
          <div className="glass rounded-2xl p-5">
            <p className="eyebrow mb-3">Exploring</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Community discussions per question</li>
              <li>Mock-interview timer mode</li>
              <li>Contest calendar integration</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border/60 bg-primary py-20 text-primary-foreground">
        <div className="container text-center">
          <h2 className="mx-auto max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Your target company already told you what to practice.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-primary-foreground/70">
            Free, open-data, and built for the way interviews actually work.
          </p>
          <Button asChild variant="lime" size="lg" className="mt-7">
            <Link href="/login">
              Start prepping now <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-10">
        <div className="container flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            CompanyHub — built on open interview data. Not affiliated with LeetCode.
          </p>
          <nav className="flex gap-5 text-sm text-muted-foreground" aria-label="Footer">
            <Link href="/companies" className="hover:text-foreground">Companies</Link>
            <Link href="/sheets" className="hover:text-foreground">Sheets</Link>
            <a
              href="https://github.com/snehasishroy/leetcode-companywise-interview-questions"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground"
            >
              Data source
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
