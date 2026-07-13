"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CompanyLogo } from "@/components/shared/company-logo";

export interface CompareCompanyOption {
  slug: string;
  name: string;
  logoUrl: string | null;
  totalQuestions: number;
}

const MAX = 3;

/** Chip-based picker; selection lives in the URL so results are shareable. */
export function CompareBuilder({
  options,
  selected,
}: {
  options: CompareCompanyOption[];
  selected: string[];
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");

  function apply(slugs: string[]) {
    const params = new URLSearchParams();
    slugs.forEach((s) => params.append("c", s));
    router.push(slugs.length ? `/compare?${params}` : "/compare");
  }

  const chosen = selected
    .map((slug) => options.find((o) => o.slug === slug))
    .filter(Boolean) as CompareCompanyOption[];

  const suggestions = options
    .filter(
      (o) =>
        !selected.includes(o.slug) &&
        o.name.toLowerCase().includes(query.trim().toLowerCase())
    )
    .slice(0, 8);

  return (
    <div className="glass space-y-3 rounded-2xl p-4">
      {/* Selected chips */}
      <div className="flex flex-wrap items-center gap-2">
        {chosen.map((c) => (
          <span
            key={c.slug}
            className="flex items-center gap-2 rounded-full bg-primary py-1 pl-1 pr-2 text-sm font-medium text-primary-foreground"
          >
            <CompanyLogo name={c.name} logoUrl={c.logoUrl} size={22} />
            {c.name}
            <button
              onClick={() => apply(selected.filter((s) => s !== c.slug))}
              aria-label={`Remove ${c.name}`}
              className="rounded-full p-0.5 transition-colors hover:bg-primary-foreground/20"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        {chosen.length === 0 && (
          <span className="text-sm text-muted-foreground">
            Pick 2–3 companies to see what they ask in common.
          </span>
        )}
      </div>

      {/* Search + suggestions */}
      {selected.length < MAX && (
        <>
          <div className="flex h-10 items-center gap-2 rounded-xl border border-border px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Add a company (${selected.length}/${MAX})…`}
              aria-label="Search companies to compare"
              className="h-full w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((o) => (
              <button
                key={o.slug}
                onClick={() => {
                  apply([...selected, o.slug]);
                  setQuery("");
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium",
                  "transition-colors hover:border-foreground/30 hover:bg-accent"
                )}
              >
                <Plus className="size-3" /> {o.name}
                <span className="figure text-muted-foreground">{o.totalQuestions}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
