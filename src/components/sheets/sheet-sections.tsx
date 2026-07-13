"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ChevronDown, ExternalLink, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuestionMutations } from "@/components/questions/use-question-mutations";
import type { Difficulty } from "@prisma/client";

export interface SheetQuestion {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  isPremium: boolean;
  leetcodeUrl: string;
  solved: boolean;
}

export interface SheetSection {
  title: string;
  questions: SheetQuestion[];
}

export function SheetSections({
  sections,
  signedIn,
}: {
  sections: SheetSection[];
  signedIn: boolean;
}) {
  // Local optimistic solve-state, keyed by question id.
  const [solvedMap, setSolvedMap] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.flatMap((s) => s.questions.map((q) => [q.id, q.solved])))
  );
  const { setStatus, guard } = useQuestionMutations();

  const totals = React.useMemo(() => {
    const all = sections.flatMap((s) => s.questions);
    const solved = all.filter((q) => solvedMap[q.id]).length;
    return { solved, total: all.length };
  }, [sections, solvedMap]);

  function toggle(question: SheetQuestion) {
    if (!guard()) return;
    const next = !solvedMap[question.id];
    setSolvedMap((m) => ({ ...m, [question.id]: next }));
    setStatus.mutate(
      { questionId: question.id, status: next ? "SOLVED" : "TODO" },
      { onError: () => setSolvedMap((m) => ({ ...m, [question.id]: !next })) }
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall progress */}
      <div className="glass-strong rounded-2xl p-5">
        <div className="figure mb-2 flex justify-between text-sm">
          <span className="text-muted-foreground">Overall progress</span>
          <span className="font-semibold">
            {totals.solved} / {totals.total}
            {signedIn ? "" : " · sign in to track"}
          </span>
        </div>
        <Progress value={totals.total ? (totals.solved / totals.total) * 100 : 0} className="h-2.5" />
      </div>

      {sections.map((section, i) => {
        const solved = section.questions.filter((q) => solvedMap[q.id]).length;
        const pct = section.questions.length
          ? Math.round((solved / section.questions.length) * 100)
          : 0;
        return (
          <details key={section.title} className="glass group rounded-2xl" open={i === 0}>
            <summary className="flex cursor-pointer list-none items-center gap-4 p-5 marker:hidden">
              <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              <div className="min-w-0 flex-1">
                <p className="font-display font-semibold">
                  Step {i + 1} · {section.title}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <Progress value={pct} className="h-1.5 max-w-64 flex-1" />
                  <span className="figure text-xs text-muted-foreground">
                    {solved}/{section.questions.length}
                  </span>
                </div>
              </div>
              {pct === 100 && (
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-lime text-lime-foreground">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
              )}
            </summary>

            <div className="border-t border-border/60 px-3 pb-3">
              {section.questions.map((q) => {
                const isSolved = solvedMap[q.id];
                return (
                  <div
                    key={q.id}
                    className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-accent/60"
                  >
                    <button
                      aria-label={isSolved ? `Mark ${q.title} unsolved` : `Mark ${q.title} solved`}
                      onClick={() => toggle(q)}
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-md border transition-all",
                        isSolved
                          ? "border-lime bg-lime text-lime-foreground"
                          : "border-border hover:border-foreground/40"
                      )}
                    >
                      {isSolved && <Check className="size-3.5 animate-check-pop motion-reduce:animate-none" strokeWidth={3} />}
                    </button>

                    <Link
                      href={`/problems/${q.slug}`}
                      className={cn(
                        "min-w-0 flex-1 truncate text-sm font-medium hover:underline",
                        isSolved && "text-muted-foreground line-through decoration-border"
                      )}
                    >
                      {q.title}
                    </Link>

                    {q.isPremium && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Lock className="size-3.5 shrink-0 text-amber-500" aria-label="Premium" />
                        </TooltipTrigger>
                        <TooltipContent>LeetCode Premium</TooltipContent>
                      </Tooltip>
                    )}
                    <DifficultyBadge difficulty={q.difficulty} />
                    <a
                      href={q.leetcodeUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open ${q.title} on LeetCode`}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  </div>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}
