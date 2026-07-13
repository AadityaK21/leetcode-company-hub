import { cn } from "@/lib/utils";

/** Frequency as a smooth gauge bar with a tabular figure. */
export function FrequencyMeter({ value, className }: { value: number; className?: string }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <span
      className={cn("flex items-center gap-2.5", className)}
      aria-label={`Frequency ${Math.round(v)} out of 100`}
      title={`${Math.round(v)}/100`}
    >
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
        <span
          className="block h-full rounded-full bg-gradient-to-r from-lime/60 to-lime transition-[width] duration-500"
          style={{ width: `${v}%` }}
        />
      </span>
      <span className="figure w-7 text-xs text-muted-foreground">{Math.round(v)}</span>
    </span>
  );
}
