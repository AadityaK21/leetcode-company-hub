"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CompanyLogo } from "@/components/shared/company-logo";

export interface OnboardingCompany {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  totalQuestions: number;
}

export interface OnboardingSheet {
  slug: string;
  title: string;
  description: string | null;
  count: number;
}

const GOALS = [1, 2, 3, 5, 8];

export function OnboardingDialog({
  companies,
  sheets,
  userName,
}: {
  companies: OnboardingCompany[];
  sheets: OnboardingSheet[];
  userName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(true);
  const [step, setStep] = React.useState(0);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [goal, setGoal] = React.useState(2);
  const [sheet, setSheet] = React.useState<string | null>(sheets[0]?.slug ?? null);
  const [saving, setSaving] = React.useState(false);

  function toggleCompany(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : prev.length >= 5 ? prev : [...prev, id]
    );
  }

  async function finish(skip = false) {
    setSaving(true);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        skip ? { skip: true } : { companyIds: selected, dailyGoal: goal, sheetSlug: sheet }
      ),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Couldn't save your setup — you can adjust everything in Settings");
    } else if (!skip) {
      toast.success("You're set. Your targets are bookmarked and your goal is live.");
    }
    setOpen(false);
    router.refresh();
  }

  const steps = [
    {
      title: `Welcome${userName ? `, ${userName}` : ""} — who are you prepping for?`,
      description: "Pick up to 5 target companies. We'll bookmark them so they're one tap away.",
      body: (
        <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1 scrollbar-thin sm:grid-cols-3">
          {companies.map((c) => {
            const active = selected.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleCompany(c.id)}
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-2 rounded-2xl border p-2.5 text-left text-sm font-medium transition-all",
                  active ? "border-foreground/35 bg-accent" : "border-border hover:border-foreground/30"
                )}
              >
                <CompanyLogo name={c.name} logoUrl={c.logoUrl} size={26} />
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                {active && <Check className="size-3.5 shrink-0 text-lime" strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      ),
      canContinue: true, // selecting none is fine
    },
    {
      title: "How many problems a day?",
      description: "A goal you can actually keep beats an ambitious one you abandon. 2–3 is the sweet spot.",
      body: (
        <div className="flex gap-2">
          {GOALS.map((n) => (
            <button
              key={n}
              onClick={() => setGoal(n)}
              aria-pressed={goal === n}
              className={cn(
                "figure flex-1 rounded-2xl border py-4 text-xl font-semibold transition-all",
                goal === n ? "border-foreground/35 bg-accent" : "border-border hover:border-foreground/30"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      ),
      canContinue: true,
    },
    {
      title: "Pick a starting path",
      description: "A structured sheet keeps you moving. You can switch or add more anytime.",
      body: (
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
          {sheets.map((s) => {
            const active = sheet === s.slug;
            return (
              <button
                key={s.slug}
                onClick={() => setSheet(active ? null : s.slug)}
                aria-pressed={active}
                className={cn(
                  "flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-all",
                  active ? "border-foreground/35 bg-accent" : "border-border hover:border-foreground/30"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{s.title}</p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{s.description}</p>
                </div>
                <span className="figure shrink-0 text-xs text-muted-foreground">{s.count} Qs</span>
              </button>
            );
          })}
        </div>
      ),
      canContinue: true,
    },
  ];

  const current = steps[step];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && finish(true)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          {/* Step dots */}
          <div className="mb-1 flex gap-1.5" aria-label={`Step ${step + 1} of ${steps.length}`}>
            {steps.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === step ? "w-6 bg-lime" : "w-1.5 bg-secondary"
                )}
              />
            ))}
          </div>
          <DialogTitle className="font-display">{current.title}</DialogTitle>
          <DialogDescription>{current.description}</DialogDescription>
        </DialogHeader>

        {current.body}

        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={() => finish(true)} disabled={saving}>
            Skip for now
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} disabled={saving}>
                Back
              </Button>
            )}
            {step < steps.length - 1 ? (
              <Button variant="lime" onClick={() => setStep(step + 1)}>
                Continue
              </Button>
            ) : (
              <Button variant="lime" onClick={() => finish(false)} disabled={saving}>
                {saving && <Loader2 className="animate-spin" />} Finish setup
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
