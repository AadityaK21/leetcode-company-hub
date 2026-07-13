"use client";

import * as React from "react";
import Link from "next/link";
import { formatDistanceToNow, isPast } from "date-fns";
import { RotateCcw, Trash2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useQuestionMutations } from "@/components/questions/use-question-mutations";
import type { Difficulty } from "@prisma/client";

export interface RevisionItem {
  questionId: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  status: string;
  dueAt: string;
  intervalDays: number;
}

export function RevisionQueue({ initial }: { initial: RevisionItem[] }) {
  const [items, setItems] = React.useState(initial);
  const { revise, guard } = useQuestionMutations();

  function act(
    item: RevisionItem,
    action: "review" | "master" | "remove",
    grade?: "easy" | "medium" | "hard" | "forgot"
  ) {
    if (!guard()) return;
    // Optimistic local update.
    setItems((prev) =>
      action === "remove"
        ? prev.filter((i) => i.questionId !== item.questionId)
        : prev.map((i) => {
            if (i.questionId !== item.questionId) return i;
            if (action === "master") return { ...i, status: "MASTERED" };
            const multiplier = grade === "easy" ? 2.5 : grade === "hard" ? 1.2 : 2;
            const next =
              grade === "forgot"
                ? 1
                : Math.min(60, Math.max(i.intervalDays + 1, Math.round(i.intervalDays * multiplier)));
            return {
              ...i,
              status: grade === "forgot" ? "NEEDS_REVISION" : "REVISED",
              intervalDays: next,
              dueAt: new Date(Date.now() + next * 86_400_000).toISOString(),
            };
          })
    );
    revise.mutate({ questionId: item.questionId, action, grade });
  }

  const due = items.filter((i) => i.status !== "MASTERED" && isPast(new Date(i.dueAt)));
  const upcoming = items.filter((i) => i.status !== "MASTERED" && !isPast(new Date(i.dueAt)));
  const mastered = items.filter((i) => i.status === "MASTERED");

  if (items.length === 0) {
    return (
      <EmptyState
        icon={RotateCcw}
        title="Your queue is empty"
        description="On any problem, choose “Revise later” to schedule it. It comes back tomorrow, then at doubling intervals."
        action={
          <Button asChild variant="lime" size="sm">
            <Link href="/problems">Find problems</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <Section title={`Due now (${due.length})`} empty="Nothing due — you're ahead.">
        {due.map((item) => (
          <Row key={item.questionId} item={item} onAct={act} due />
        ))}
      </Section>

      <Section title={`Upcoming (${upcoming.length})`} empty="Nothing scheduled ahead.">
        {upcoming.map((item) => (
          <Row key={item.questionId} item={item} onAct={act} />
        ))}
      </Section>

      {mastered.length > 0 && (
        <Section title={`Mastered (${mastered.length})`} empty="">
          {mastered.map((item) => (
            <Row key={item.questionId} item={item} onAct={act} mastered />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const hasChildren = React.Children.count(children) > 0;
  return (
    <section>
      <h2 className="eyebrow mb-3">{title}</h2>
      {hasChildren ? (
        <div className="glass divide-y divide-border/50 rounded-2xl">{children}</div>
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}

const GRADES = [
  { value: "forgot", label: "Forgot", title: "Back to 1 day", className: "text-rose-500" },
  { value: "hard", label: "Hard", title: "Interval ×1.2", className: "text-amber-500" },
  { value: "medium", label: "Good", title: "Interval ×2", className: "" },
  { value: "easy", label: "Easy", title: "Interval ×2.5", className: "text-lime" },
] as const;

function Row({
  item,
  onAct,
  due,
  mastered,
}: {
  item: RevisionItem;
  onAct: (
    item: RevisionItem,
    action: "review" | "master" | "remove",
    grade?: "easy" | "medium" | "hard" | "forgot"
  ) => void;
  due?: boolean;
  mastered?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-3.5">
      <div className="min-w-0 flex-1">
        <Link href={`/problems/${item.slug}`} className="truncate text-sm font-medium hover:underline">
          {item.title}
        </Link>
        <p className="figure mt-0.5 text-xs text-muted-foreground">
          {mastered
            ? "mastered"
            : `${due ? "was due" : "due"} ${formatDistanceToNow(new Date(item.dueAt), { addSuffix: true })} · every ${item.intervalDays}d`}
        </p>
      </div>
      <DifficultyBadge difficulty={item.difficulty} />
      {due && <Badge variant="lime">Due</Badge>}
      {!mastered && (
        <div className="flex flex-wrap items-center gap-1">
          <div className="flex gap-0.5 rounded-full bg-secondary p-0.5" role="group" aria-label="How did the review go?">
            {GRADES.map((g) => (
              <button
                key={g.value}
                onClick={() => onAct(item, "review", g.value)}
                title={g.title}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors hover:bg-card hover:shadow-sm ${g.className}`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <Button size="sm" variant="ghost" onClick={() => onAct(item, "master")} aria-label="Mark mastered">
            <Trophy />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onAct(item, "remove")} aria-label="Remove from queue">
            <Trash2 />
          </Button>
        </div>
      )}
    </div>
  );
}
