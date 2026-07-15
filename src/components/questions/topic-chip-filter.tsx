"use client";

import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface TopicChipOption {
  slug: string;
  name: string;
}

/**
 * Always-visible, multi-select topic chips. The selection lives in the URL
 * (`?topic=slug1,slug2`) so it's shareable and the server component can read it
 * back to filter the question list. Toggling a chip adds/removes that tag.
 */
export function TopicChipFilter({
  options,
  selected,
}: {
  options: TopicChipOption[];
  selected: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  function navigate(next: string[]) {
    const query = next.length ? `?topic=${next.join(",")}` : "";
    router.push(`${pathname}${query}`, { scroll: false });
  }

  function toggle(slug: string) {
    navigate(
      selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug]
    );
  }

  if (options.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap gap-1.5" aria-label="Filter by topic">
      <Chip active={selected.length === 0} onClick={() => navigate([])} label="All topics" />
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
