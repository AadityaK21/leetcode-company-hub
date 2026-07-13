import Link from "next/link";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import { Button } from "@/components/ui/button";
import type { Difficulty } from "@prisma/client";

/** Hero card for the deterministic problem of the day. */
export function DailyChallenge({
  question,
  solved,
}: {
  question: {
    slug: string;
    title: string;
    difficulty: Difficulty;
    companiesCount: number;
  } | null;
  solved: boolean;
}) {
  if (!question) return null;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground sm:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-lime/25 blur-3xl"
      />
      <div className="relative flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="eyebrow mb-1 flex items-center gap-1.5 text-primary-foreground/70">
            <Sparkles className="size-3.5 text-lime" /> Daily challenge
          </p>
          <p className="truncate font-display text-xl font-semibold">{question.title}</p>
          <div className="mt-2 flex items-center gap-2">
            <DifficultyBadge difficulty={question.difficulty} />
            <span className="figure text-xs text-primary-foreground/70">
              asked by {question.companiesCount} companies
            </span>
          </div>
        </div>
        {solved ? (
          <span className="flex items-center gap-2 rounded-full bg-lime/20 px-4 py-2 text-sm font-medium text-lime">
            <CheckCircle2 className="size-4" /> Done today
          </span>
        ) : (
          <Button asChild variant="lime">
            <Link href={`/problems/${question.slug}`}>Take it on</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
