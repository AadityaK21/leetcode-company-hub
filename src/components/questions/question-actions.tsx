"use client";

import * as React from "react";
import { Bookmark, Check, RotateCcw, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useQuestionMutations } from "@/components/questions/use-question-mutations";

const STATUS_STEPS = [
  { value: "TODO", label: "To do" },
  { value: "ATTEMPTED", label: "Attempted" },
  { value: "SOLVED", label: "Solved" },
  { value: "MASTERED", label: "Mastered" },
] as const;

export function QuestionActions({
  questionId,
  initialStatus,
  initialBookmarked,
  initialRevision,
}: {
  questionId: string;
  initialStatus: string;
  initialBookmarked: boolean;
  initialRevision: string | null;
}) {
  const { setStatus, toggleBookmark, revise, guard } = useQuestionMutations();
  const [status, setLocalStatus] = React.useState(initialStatus);
  const [bookmarked, setBookmarked] = React.useState(initialBookmarked);
  const [revision, setRevision] = React.useState(initialRevision);

  function updateStatus(next: string) {
    if (!guard()) return;
    setLocalStatus(next); // optimistic
    setStatus.mutate(
      { questionId, status: next },
      { onError: () => setLocalStatus(status) }
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Status stepper */}
      <div className="flex gap-1 rounded-full bg-secondary p-1" role="group" aria-label="Progress status">
        {STATUS_STEPS.map((s) => (
          <button
            key={s.value}
            onClick={() => updateStatus(s.value)}
            aria-pressed={status === s.value}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              status === s.value
                ? s.value === "SOLVED" || s.value === "MASTERED"
                  ? "bg-lime text-lime-foreground shadow-sm"
                  : "bg-card shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {s.value === "SOLVED" && <Check className="size-3" />}
            {s.value === "MASTERED" && <Trophy className="size-3" />}
            {s.label}
          </button>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          if (!guard()) return;
          setBookmarked((b) => !b);
          toggleBookmark.mutate({ questionId }, { onError: () => setBookmarked(bookmarked) });
        }}
      >
        <Bookmark className={cn(bookmarked && "fill-lime text-lime")} />
        {bookmarked ? "Bookmarked" : "Bookmark"}
      </Button>

      {revision && revision !== "MASTERED" ? (
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              guard() &&
              revise.mutate({ questionId, action: "review", grade: "medium" }, { onSuccess: () => setRevision("REVISED") })
            }
          >
            <RotateCcw /> Reviewed
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              guard() &&
              revise.mutate({ questionId, action: "remove" }, { onSuccess: () => setRevision(null) })
            }
          >
            Remove
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            guard() &&
            revise.mutate(
              { questionId, action: "schedule" },
              { onSuccess: () => setRevision("NEEDS_REVISION") }
            )
          }
        >
          <RotateCcw /> Revise later
        </Button>
      )}
    </div>
  );
}
