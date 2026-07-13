import { levelFromXp } from "@/lib/utils";

/** SVG progress ring showing level and progress toward the next one. */
export function LevelRing({ xp }: { xp: number }) {
  const { level, current, next } = levelFromXp(xp);
  const pct = Math.min(1, current / Math.max(1, next));

  const r = 44;
  const c = 2 * Math.PI * r;

  return (
    <div className="relative size-28">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8" className="stroke-secondary" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="stroke-lime transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="figure text-2xl font-semibold">{level}</span>
        <span className="eyebrow">level</span>
      </div>
    </div>
  );
}
