"use client";

import { Check, X } from "lucide-react";
import { PASSWORD_RULES } from "@/lib/validations";
import { cn } from "@/lib/utils";

const LABELS = ["Too weak", "Weak", "Okay", "Good", "Strong", "Very strong"] as const;

/** Live strength meter + requirement checklist under the sign-up password field. */
export function PasswordChecklist({ password }: { password: string }) {
  const met = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const score = password.length === 0 ? 0 : met;
  const color =
    score <= 2 ? "bg-rose-500" : score <= 3 ? "bg-amber-500" : score === 4 ? "bg-lime/70" : "bg-lime";

  return (
    <div className="space-y-2 pt-1">
      {/* Strength meter */}
      <div className="flex items-center gap-2">
        <div className="flex h-1.5 flex-1 gap-1" role="meter" aria-valuemin={0} aria-valuemax={5} aria-valuenow={score} aria-label="Password strength">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "flex-1 rounded-full transition-colors duration-300",
                i < score ? color : "bg-secondary"
              )}
            />
          ))}
        </div>
        <span className="figure w-20 text-right text-[11px] text-muted-foreground">
          {LABELS[score]}
        </span>
      </div>

      {/* Requirements */}
      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2" aria-live="polite">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <li
              key={rule.id}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-colors",
                ok ? "text-lime" : "text-muted-foreground"
              )}
            >
              {ok ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3" />}
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
