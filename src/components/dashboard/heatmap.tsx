import { cn } from "@/lib/utils";

/**
 * GitHub-style activity heatmap. Pure server component — a CSS grid of
 * day cells across the last 26 weeks, shaded by solve count.
 * All dates are handled in UTC to match the activity keys.
 */
export function Heatmap({ counts }: { counts: Record<string, number> }) {
  const weeks = 26;
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  // Start on the Sunday `weeks` back.
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - (weeks * 7 - 1) - start.getUTCDay());

  const columns: { date: Date; count: number }[][] = [];
  const cursor = new Date(start);
  while (cursor <= today) {
    const week: { date: Date; count: number }[] = [];
    for (let d = 0; d < 7 && cursor <= today; d++) {
      const key = cursor.toISOString().slice(0, 10);
      week.push({ date: new Date(cursor), count: counts[key] ?? 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    columns.push(week);
  }

  const level = (count: number) =>
    count === 0
      ? "bg-secondary"
      : count === 1
        ? "bg-lime/30"
        : count <= 3
          ? "bg-lime/55"
          : count <= 6
            ? "bg-lime/80"
            : "bg-lime";

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[3px]" role="img" aria-label="Solve activity for the last 26 weeks">
        {columns.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day) => (
              <div
                key={day.date.toISOString()}
                title={`${day.count} solved · ${day.date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  timeZone: "UTC",
                })}`}
                className={cn("size-[11px] rounded-[3px]", level(day.count))}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="figure mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        Less
        <span className="size-[11px] rounded-[3px] bg-secondary" />
        <span className="size-[11px] rounded-[3px] bg-lime/30" />
        <span className="size-[11px] rounded-[3px] bg-lime/55" />
        <span className="size-[11px] rounded-[3px] bg-lime/80" />
        <span className="size-[11px] rounded-[3px] bg-lime" />
        More
      </div>
    </div>
  );
}
