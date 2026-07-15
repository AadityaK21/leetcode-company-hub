"use client";

import * as React from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  ArrowUpDown,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FileCode2,
  Lock,
  MoreHorizontal,
  NotebookPen,
  ShieldCheck,
  RotateCcw,
  SearchX,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import { FrequencyMeter } from "@/components/shared/frequency-meter";
import { EmptyState } from "@/components/shared/empty-state";
import { useDebounce } from "@/hooks/use-debounce";
import { useQuestionMutations } from "@/components/questions/use-question-mutations";
import type { Difficulty } from "@prisma/client";

export interface QuestionRow {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  acceptance: number | null;
  isPremium: boolean;
  leetcodeUrl: string;
  topics: string[];
  frequency: number | null;
  companiesCount: number;
  user: { status: string; verified: boolean; bookmarked: boolean; hasNote: boolean; revision: string | null } | null;
}

interface QuestionsResponse {
  rows: QuestionRow[];
  total: number;
  page: number;
  pageCount: number;
}

interface Props {
  company?: string;
  sheet?: string;
  /** Comma-separated topic slugs to pre-filter by (driven by the chip row / URL). */
  initialTopic?: string;
  showRecency?: boolean;
}

const DIFFICULTIES = ["", "EASY", "MEDIUM", "HARD"] as const;
const STATUSES = [
  { value: "", label: "Any status" },
  { value: "TODO", label: "To do" },
  { value: "ATTEMPTED", label: "Attempted" },
  { value: "SOLVED", label: "Solved" },
  { value: "MASTERED", label: "Mastered" },
  { value: "BOOKMARKED", label: "Bookmarked" },
] as const;
const RECENCY = [
  { value: "", label: "All time" },
  { value: "30d", label: "30 days" },
  { value: "3m", label: "3 months" },
  { value: "6m", label: "6 months" },
  { value: "1y", label: "1 year" },
] as const;

export function QuestionTable({ company, sheet, initialTopic, showRecency }: Props) {
  const [q, setQ] = React.useState("");
  const [difficulty, setDifficulty] = React.useState<string>("");
  const [status, setStatus] = React.useState<string>("");
  const [recency, setRecency] = React.useState<string>("");
  const [topics] = React.useState<string[]>(
    initialTopic ? initialTopic.split(",").filter(Boolean) : []
  );
  const [sort, setSort] = React.useState<"frequency" | "acceptance" | "difficulty" | "title">(
    "frequency"
  );
  const [order, setOrder] = React.useState<"asc" | "desc">("desc");
  const [page, setPage] = React.useState(1);
  const debouncedQ = useDebounce(q, 300);

  const params = new URLSearchParams();
  if (company) params.set("company", company);
  if (sheet) params.set("sheet", sheet);
  if (topics.length) params.set("topic", topics.join(","));
  if (debouncedQ) params.set("q", debouncedQ);
  if (difficulty) params.set("difficulty", difficulty);
  if (status) params.set("status", status);
  if (recency) params.set("recency", recency);
  params.set("sort", sort);
  params.set("order", order);
  params.set("page", String(page));

  const { data, isLoading, isError, refetch } = useQuery<QuestionsResponse>({
    queryKey: ["questions", params.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/questions?${params}`);
      if (!res.ok) throw new Error("Failed to load questions");
      return res.json();
    },
    placeholderData: keepPreviousData,
  });

  // The current data source ships no topic tags — hide the column when empty.
  const hasTopics = React.useMemo(
    () => (data?.rows ?? []).some((r) => r.topics.length > 0),
    [data]
  );

  function toggleSort(next: typeof sort) {
    if (sort === next) setOrder(order === "desc" ? "asc" : "desc");
    else {
      setSort(next);
      setOrder("desc");
    }
    setPage(1);
  }

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Sticky filter bar */}
      <div className="glass sticky top-16 z-20 flex flex-wrap items-center gap-2 rounded-2xl p-2">
        <Input
          value={q}
          onChange={(e) => resetPage(setQ)(e.target.value)}
          placeholder="Filter by name…"
          aria-label="Filter questions by name"
          className="h-9 w-full border-none bg-transparent shadow-none sm:w-52"
        />
        <FilterPills
          value={difficulty}
          onChange={resetPage(setDifficulty)}
          options={DIFFICULTIES.map((d) => ({
            value: d,
            label: d === "" ? "Any level" : d[0] + d.slice(1).toLowerCase(),
          }))}
        />
        <FilterSelect value={status} onChange={resetPage(setStatus)} options={STATUSES} label="Status" />
        {showRecency && (
          <FilterSelect value={recency} onChange={resetPage(setRecency)} options={RECENCY} label="Asked in" />
        )}
        {data && (
          <span className="figure ml-auto pr-2 text-xs text-muted-foreground">
            {data.total} results
          </span>
        )}
      </div>

      {/* Table */}
      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border/70 text-left">
              <Th className="w-10">
                <span className="sr-only">Solved</span>
              </Th>
              <Th sortable onSort={() => toggleSort("title")} active={sort === "title"}>
                Question
              </Th>
              <Th sortable onSort={() => toggleSort("difficulty")} active={sort === "difficulty"}>
                Level
              </Th>
              {company && (
                <Th sortable onSort={() => toggleSort("frequency")} active={sort === "frequency"}>
                  Frequency
                </Th>
              )}
              <Th sortable onSort={() => toggleSort("acceptance")} active={sort === "acceptance"}>
                Acceptance
              </Th>
              {hasTopics && <Th>Topics</Th>}
              <Th className="w-28 text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border/40 last:border-0">
                  <td className="p-3"><Skeleton className="size-5 rounded-md" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-56" /></td>
                  <td className="p-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                  {company && <td className="p-3"><Skeleton className="h-4 w-20" /></td>}
                  <td className="p-3"><Skeleton className="h-4 w-12" /></td>
                  {hasTopics && <td className="p-3"><Skeleton className="h-4 w-32" /></td>}
                  <td className="p-3"><Skeleton className="ml-auto h-8 w-20" /></td>
                </tr>
              ))}

            {!isLoading &&
              data?.rows.map((row) => (
                <Row key={row.id} row={row} showFrequency={!!company} showTopics={hasTopics} />
              ))}
          </tbody>
        </table>

        {!isLoading && data?.rows.length === 0 && (
          <EmptyState
            icon={SearchX}
            title="No questions match"
            description="Try clearing a filter or searching a different term. If the database is empty, run the data import first."
            className="m-4 border-none bg-transparent"
          />
        )}
        {isError && (
          <EmptyState
            icon={FileCode2}
            title="Couldn't load questions"
            description="The request failed. Check your connection and try again."
            action={<Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>}
            className="m-4 border-none bg-transparent"
          />
        )}
      </div>

      {/* Pagination */}
      {data && data.pageCount > 1 && (
        <div className="flex items-center justify-between">
          <p className="figure text-xs text-muted-foreground">
            Page {data.page} of {data.pageCount}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({
  children,
  className,
  sortable,
  active,
  onSort,
}: {
  children: React.ReactNode;
  className?: string;
  sortable?: boolean;
  active?: boolean;
  onSort?: () => void;
}) {
  return (
    <th className={cn("eyebrow p-3 font-normal", className)}>
      {sortable ? (
        <button
          onClick={onSort}
          className={cn(
            "inline-flex items-center gap-1 transition-colors hover:text-foreground",
            active && "text-foreground"
          )}
        >
          {children}
          <ArrowUpDown className="size-3" />
        </button>
      ) : (
        children
      )}
    </th>
  );
}

function Row({
  row,
  showFrequency,
  showTopics,
}: {
  row: QuestionRow;
  showFrequency: boolean;
  showTopics: boolean;
}) {
  const { setStatus, toggleBookmark, revise, guard } = useQuestionMutations();
  const solved = row.user?.status === "SOLVED" || row.user?.status === "MASTERED";

  return (
    <tr className="group border-b border-border/40 transition-colors last:border-0 hover:bg-accent/50">
      <td className="p-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              aria-label={solved ? "Mark as not solved" : "Mark as solved"}
              onClick={() =>
                guard() &&
                setStatus.mutate({ questionId: row.id, status: solved ? "TODO" : "SOLVED" })
              }
              className={cn(
                "flex size-5 items-center justify-center rounded-md border transition-all",
                solved
                  ? "border-lime bg-lime text-lime-foreground"
                  : "border-border hover:border-foreground/40"
              )}
            >
              {solved && <Check className="size-3.5 animate-check-pop motion-reduce:animate-none" strokeWidth={3} />}
            </button>
          </TooltipTrigger>
          <TooltipContent>{solved ? "Solved — click to undo" : "Mark solved"}</TooltipContent>
        </Tooltip>
      </td>

      <td className="max-w-[320px] p-3">
        <div className="flex items-center gap-2">
          <a
            href={row.leetcodeUrl}
            target="_blank"
            rel="noreferrer"
            className={cn("truncate font-medium hover:underline", solved && "text-muted-foreground")}
          >
            {row.title}
          </a>
          {row.isPremium && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Lock className="size-3.5 shrink-0 text-amber-500" aria-label="LeetCode Premium" />
              </TooltipTrigger>
              <TooltipContent>LeetCode Premium</TooltipContent>
            </Tooltip>
          )}
          {row.user?.hasNote && <NotebookPen className="size-3.5 shrink-0 text-muted-foreground" aria-label="Has note" />}
          {row.user?.verified && (
            <Tooltip>
              <TooltipTrigger asChild>
                <ShieldCheck className="size-3.5 shrink-0 text-lime" aria-label="Verified via LeetCode" />
              </TooltipTrigger>
              <TooltipContent>Verified — synced from LeetCode</TooltipContent>
            </Tooltip>
          )}
          {row.user?.status === "MASTERED" && <Badge variant="lime">Mastered</Badge>}
        </div>
        <p className="figure mt-0.5 text-xs text-muted-foreground">
          asked by {row.companiesCount} {row.companiesCount === 1 ? "company" : "companies"}
        </p>
      </td>

      <td className="p-3"><DifficultyBadge difficulty={row.difficulty} /></td>

      {showFrequency && (
        <td className="p-3"><FrequencyMeter value={row.frequency ?? 0} /></td>
      )}

      <td className="figure p-3 text-muted-foreground">
        {row.acceptance != null ? `${row.acceptance.toFixed(1)}%` : "—"}
      </td>

      {showTopics && (
        <td className="max-w-[200px] p-3">
          <span className="line-clamp-1 text-xs text-muted-foreground">
            {row.topics.slice(0, 3).join(" · ") || "—"}
          </span>
        </td>
      )}

      <td className="p-3">
        <div className="flex items-center justify-end gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={row.user?.bookmarked ? "Remove bookmark" : "Bookmark"}
                onClick={() => guard() && toggleBookmark.mutate({ questionId: row.id })}
              >
                <Bookmark className={cn("size-4", row.user?.bookmarked && "fill-lime text-lime")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{row.user?.bookmarked ? "Bookmarked" : "Bookmark"}</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" aria-label="More actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{row.title}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/problems/${row.slug}`}><NotebookPen /> Details &amp; notes</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={row.leetcodeUrl} target="_blank" rel="noreferrer">
                  <ExternalLink /> Open on LeetCode
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => guard() && revise.mutate({ questionId: row.id, action: "schedule" })}
              >
                <RotateCcw /> {row.user?.revision ? "Reset revision" : "Add to revision"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => guard() && setStatus.mutate({ questionId: row.id, status: "MASTERED" })}
              >
                <Check /> Mark mastered
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(row.leetcodeUrl);
                  toast.success("Link copied");
                }}
              >
                <Copy /> Copy link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
}

function FilterPills({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <div className="flex gap-1 rounded-full bg-secondary p-1" role="group" aria-label="Difficulty filter">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            value === o.value ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
  label: string;
}) {
  const current = options.find((o) => o.value === value) ?? options[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full">
          {value ? current.label : label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {options.map((o) => (
          <DropdownMenuItem key={o.value} onClick={() => onChange(o.value)}>
            {o.label}
            {value === o.value && <Check className="ml-auto size-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
