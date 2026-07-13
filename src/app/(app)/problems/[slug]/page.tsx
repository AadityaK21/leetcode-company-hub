import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import { FrequencyMeter } from "@/components/shared/frequency-meter";
import { CompanyLogo } from "@/components/shared/company-logo";
import { QuestionActions } from "@/components/questions/question-actions";
import { NoteEditor } from "@/components/questions/note-editor";
import { CodeWorkspace } from "@/components/questions/code-workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const q = await prisma.question.findUnique({ where: { slug }, select: { title: true } });
  return { title: q ? `${q.title} — CompanyHub` : "Problem — CompanyHub" };
}

export default async function ProblemPage({ params }: Props) {
  const { slug } = await params;
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const question = await prisma.question.findUnique({
    where: { slug },
    include: {
      topics: { include: { topic: true } },
      companies: {
        include: { company: true },
        orderBy: { frequency: "desc" },
        take: 24,
      },
      _count: { select: { companies: true } },
    },
  });
  if (!question) notFound();

  const [userState, related] = await Promise.all([
    userId
      ? Promise.all([
          prisma.progress.findUnique({
            where: { userId_questionId: { userId, questionId: question.id } },
          }),
          prisma.bookmark.findFirst({ where: { userId, questionId: question.id } }),
          prisma.revision.findUnique({
            where: { userId_questionId: { userId, questionId: question.id } },
          }),
        ])
      : Promise.resolve([null, null, null] as const),
    question.topics[0]
      ? prisma.question.findMany({
          where: {
            id: { not: question.id },
            topics: { some: { topicId: question.topics[0].topicId } },
          },
          orderBy: { companies: { _count: "desc" } },
          take: 5,
          select: { slug: true, title: true, difficulty: true },
        })
      : Promise.resolve([]),
  ]);
  const [progress, bookmark, revision] = userState;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-6">
        {/* Header */}
        <div className="glass-strong rounded-3xl p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <DifficultyBadge difficulty={question.difficulty} />
                {question.isPremium && (
                  <Badge variant="medium">
                    <Lock className="mr-1 size-3" /> Premium
                  </Badge>
                )}
              </div>
              <h1 className="font-display text-3xl font-semibold tracking-tight">{question.title}</h1>
              <p className="figure mt-2 text-sm text-muted-foreground">
                {question.acceptance != null && `${question.acceptance.toFixed(1)}% acceptance · `}
                asked by {question._count.companies}{" "}
                {question._count.companies === 1 ? "company" : "companies"}
              </p>
            </div>
            <Button asChild variant="lime">
              <a href={question.leetcodeUrl} target="_blank" rel="noreferrer">
                Solve on LeetCode <ExternalLink />
              </a>
            </Button>
          </div>

          {question.topics.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {question.topics.map((t) => (
                <Link
                  key={t.topic.slug}
                  href={`/problems?topic=${t.topic.slug}`}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                >
                  {t.topic.name}
                </Link>
              ))}
            </div>
          )}

          <div className="mt-6">
            <QuestionActions
              questionId={question.id}
              initialStatus={progress?.status ?? "TODO"}
              initialBookmarked={!!bookmark}
              initialRevision={revision?.status ?? null}
            />
          </div>
        </div>

        {/* Code workspace */}
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-display text-lg font-semibold">Workspace</h2>
            <p className="text-xs text-muted-foreground">
              Scratch, run, iterate — then submit on LeetCode
            </p>
          </div>
          <CodeWorkspace slug={question.slug} signedIn={!!userId} />
        </div>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Your notes</CardTitle>
          </CardHeader>
          <CardContent>
            <NoteEditor questionId={question.id} signedIn={!!userId} />
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Who asks this</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {question.companies.length === 0 && (
              <p className="text-sm text-muted-foreground">No company data yet.</p>
            )}
            {question.companies.map((cq) => (
              <Link
                key={cq.companyId}
                href={`/companies/${cq.company.slug}`}
                className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-accent"
              >
                <CompanyLogo name={cq.company.name} logoUrl={cq.company.logoUrl} size={28} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{cq.company.name}</span>
                <FrequencyMeter value={cq.frequency} />
              </Link>
            ))}
          </CardContent>
        </Card>

        {related.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Related problems</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/problems/${r.slug}`}
                  className="flex items-center justify-between gap-3 rounded-xl p-2 transition-colors hover:bg-accent"
                >
                  <span className="min-w-0 truncate text-sm font-medium">{r.title}</span>
                  <DifficultyBadge difficulty={r.difficulty} />
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
