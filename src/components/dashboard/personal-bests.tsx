import { Award, CalendarDays, Flame, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PersonalBests as Bests } from "@/lib/insights";

export function PersonalBests({ bests }: { bests: Bests }) {
  const rows = [
    {
      icon: Flame,
      label: "Longest streak",
      value: bests.bestStreak > 0 ? `${bests.bestStreak} days` : "—",
    },
    {
      icon: Award,
      label: "Best day",
      value: bests.bestDay.count > 0 ? `${bests.bestDay.count} solved` : "—",
      hint: bests.bestDay.date
        ? new Date(bests.bestDay.date + "T00:00:00Z").toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          })
        : undefined,
    },
    {
      icon: CalendarDays,
      label: "Member since",
      value: bests.memberSince
        ? bests.memberSince.toLocaleDateString("en-US", { month: "short", year: "numeric" })
        : "—",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">Personal bests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-secondary">
              <r.icon className="size-4 text-muted-foreground" />
            </span>
            <span className="flex-1 text-sm text-muted-foreground">{r.label}</span>
            <span className="figure text-sm font-semibold">
              {r.value}
              {r.hint && <span className="ml-1 font-normal text-muted-foreground">· {r.hint}</span>}
            </span>
          </div>
        ))}

        {bests.coachNote && (
          <div className="flex gap-2.5 rounded-xl bg-lime/10 p-3">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-lime" />
            <p className="text-xs leading-relaxed">{bests.coachNote}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
