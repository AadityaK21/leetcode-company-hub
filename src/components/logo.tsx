import { cn } from "@/lib/utils";

/**
 * The brand mark: a bold geometric "C" — a thick ring with its mouth open
 * to the right, holding a block cursor. Flat, confident, no container tile.
 * Inherits currentColor so it adapts to any surface; cursor follows the
 * user's accent.
 */
export function LogoMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center text-foreground", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 64 64" width={size} height={size} fill="none">
        {/* 270° arc, sharp butt caps — the C */}
        <circle
          cx="32"
          cy="32"
          r="20"
          stroke="currentColor"
          strokeWidth="15"
          strokeDasharray="94.25 31.42"
          transform="rotate(45 32 32)"
        />
        {/* block cursor in the mouth */}
        <rect x="45" y="25" width="11" height="14" rx="3" fill="hsl(var(--lime))" />
      </svg>
    </span>
  );
}

export function Logo({ withWordmark = true, size = 32 }: { withWordmark?: boolean; size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} />
      {withWordmark && (
        <span className="font-display text-lg font-bold lowercase tracking-tight">
          companyhub
        </span>
      )}
    </span>
  );
}
