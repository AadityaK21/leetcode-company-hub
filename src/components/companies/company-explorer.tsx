"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, Building2, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CompanyLogo } from "@/components/shared/company-logo";
import { DifficultySpectrum } from "@/components/shared/difficulty-spectrum";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

export interface CompanyCardData {
  slug: string;
  name: string;
  logoUrl: string | null;
  totalQuestions: number;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
  topFrequency: number;
}

type SortKey = "questions" | "name" | "hard";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "questions", label: "Most questions" },
  { value: "name", label: "A → Z" },
  { value: "hard", label: "Hardest first" },
];

export function CompanyExplorer({ companies }: { companies: CompanyCardData[] }) {
  const searchParams = useSearchParams();
  const [query, setQuery] = React.useState(searchParams.get("q") ?? "");
  const [sort, setSort] = React.useState<SortKey>("questions");
  const [visible, setVisible] = React.useState(48);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = companies.filter((c) => !q || c.name.toLowerCase().includes(q));
    switch (sort) {
      case "name":
        return [...list].sort((a, b) => a.name.localeCompare(b.name));
      case "hard":
        return [...list].sort((a, b) => b.hardCount - a.hardCount);
      default:
        return [...list].sort((a, b) => b.totalQuestions - a.totalQuestions);
    }
  }, [companies, query, sort]);

  return (
    <div className="space-y-6">
      <div className="glass sticky top-16 z-20 flex flex-wrap items-center gap-2 rounded-2xl p-2">
        <div className="flex h-9 min-w-52 flex-1 items-center gap-2 px-2 sm:flex-none">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisible(48);
            }}
            placeholder={`Search ${companies.length} companies…`}
            aria-label="Search companies"
            className="h-9 border-none bg-transparent px-0 shadow-none"
          />
        </div>
        <div className="flex gap-1 rounded-full bg-secondary p-1" role="group" aria-label="Sort companies">
          {SORTS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSort(s.value)}
              aria-pressed={sort === s.value}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                sort === s.value ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <span className="figure ml-auto pr-2 text-xs text-muted-foreground">
          {filtered.length} shown
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No companies found"
          description={
            companies.length === 0
              ? "The database looks empty — run `npm run db:import` to pull the latest company data."
              : `Nothing matches “${query}”. Try a shorter search.`
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.slice(0, visible).map((c, i) => (
              <div
                key={c.slug}
                className="card-enter motion-reduce:animate-none"
                style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
              >
                <Link href={`/companies/${c.slug}`} className="group block h-full">
                  <Card className="h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3">
                        <CompanyLogo name={c.name} logoUrl={c.logoUrl} size={40} />
                        <div className="min-w-0">
                          <p className="truncate font-display font-semibold group-hover:underline">
                            {c.name}
                          </p>
                          <p className="figure text-xs text-muted-foreground">
                            {c.totalQuestions} questions
                          </p>
                        </div>
                        <ArrowUpRight className="ml-auto size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                      <DifficultySpectrum
                        easy={c.easyCount}
                        medium={c.mediumCount}
                        hard={c.hardCount}
                        className="mt-4"
                      />
                      <div className="figure mt-3 flex justify-between text-xs text-muted-foreground">
                        <span>{c.easyCount}E · {c.mediumCount}M · {c.hardCount}H</span>
                        <span>top freq {Math.round(c.topFrequency)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            ))}
          </div>
          {visible < filtered.length && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setVisible((v) => v + 48)}>
                Show more ({filtered.length - visible} remaining)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
