"use client";

import { cn } from "@/lib/utils";

export interface TopicChipOption {
  slug: string;
  name: string;
}

/**
 * Controlled, multi-select topic chips. Presentational only — the parent owns
 * the `selected` state, so toggling a chip refilters in place without any
 * navigation or reload (other filters and scroll position are preserved).
 */
export function TopicChipFilter({
  options,
  selected,
  onChange,
}: {
  options: TopicChipOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  if (options.length === 0) return null;

  const toggle = (slug: string) =>
    onChange(
      selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug]
    );

  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Filter by topic">
      <Chip active={selected.length === 0} onClick={() => onChange([])} label="All topics" />
      {options.map((t) => (
        <Chip
          key={t.slug}
          active={selected.includes(t.slug)}
          onClick={() => toggle(t.slug)}
          label={t.name}
        />
      ))}
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}
