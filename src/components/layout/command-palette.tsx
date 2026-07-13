"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  Building2,
  FileCode2,
  Hash,
  LayoutDashboard,
  ListChecks,
  Moon,
  Search,
  Settings,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useUiStore } from "@/stores/ui-store";
import { useDebounce } from "@/hooks/use-debounce";

interface SearchResults {
  questions: { slug: string; title: string; difficulty: string }[];
  companies: { slug: string; name: string; totalQuestions: number }[];
  topics: { slug: string; name: string }[];
}

export function CommandPalette() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const { commandOpen, setCommandOpen } = useUiStore();
  const [query, setQuery] = React.useState("");
  const debounced = useDebounce(query, 120);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !isTyping(e))) {
        e.preventDefault();
        setCommandOpen(true);
      }
    }
    function isTyping(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [setCommandOpen]);

  const { data } = useQuery<SearchResults>({
    queryKey: ["search", debounced],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(debounced)}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: commandOpen && debounced.length > 0,
    // Keep old results on screen while the next ones load — no flicker.
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  function go(path: string) {
    setCommandOpen(false);
    setQuery("");
    router.push(path);
  }

  return (
    <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
      <DialogContent hideClose className="top-[20%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <Command shouldFilter={false} className="w-full">
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search questions, companies, topics…"
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="eyebrow rounded border border-border px-1.5 py-0.5">esc</kbd>
          </div>
          <Command.List className="scrollbar-thin max-h-[320px] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              {debounced ? "No matches. Try a different term." : "Type to search everything."}
            </Command.Empty>

            {data?.questions && data.questions.length > 0 && (
              <Command.Group heading="Questions" className="[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                {data.questions.map((q) => (
                  <Item key={q.slug} onSelect={() => go(`/problems/${q.slug}`)}>
                    <FileCode2 className="size-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{q.title}</span>
                    <span className="figure text-xs text-muted-foreground">{q.difficulty.toLowerCase()}</span>
                  </Item>
                ))}
              </Command.Group>
            )}
            {data?.companies && data.companies.length > 0 && (
              <Command.Group heading="Companies" className="[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                {data.companies.map((c) => (
                  <Item key={c.slug} onSelect={() => go(`/companies/${c.slug}`)}>
                    <Building2 className="size-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="figure text-xs text-muted-foreground">{c.totalQuestions} qs</span>
                  </Item>
                ))}
              </Command.Group>
            )}
            {data?.topics && data.topics.length > 0 && (
              <Command.Group heading="Topics" className="[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                {data.topics.map((t) => (
                  <Item key={t.slug} onSelect={() => go(`/problems?topic=${t.slug}`)}>
                    <Hash className="size-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{t.name}</span>
                  </Item>
                ))}
              </Command.Group>
            )}

            <Command.Group heading="Go to" className="[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
              <Item onSelect={() => go("/dashboard")}><LayoutDashboard className="size-4 text-muted-foreground" /> Dashboard</Item>
              <Item onSelect={() => go("/companies")}><Building2 className="size-4 text-muted-foreground" /> Companies</Item>
              <Item onSelect={() => go("/sheets")}><ListChecks className="size-4 text-muted-foreground" /> Study sheets</Item>
              <Item onSelect={() => go("/settings")}><Settings className="size-4 text-muted-foreground" /> Settings</Item>
            </Command.Group>
            <Command.Group heading="Theme" className="[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
              <Item onSelect={() => { setTheme("light"); setCommandOpen(false); }}><Sun className="size-4 text-muted-foreground" /> Light mode</Item>
              <Item onSelect={() => { setTheme("dark"); setCommandOpen(false); }}><Moon className="size-4 text-muted-foreground" /> Dark mode</Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function Item({ children, onSelect }: { children: React.ReactNode; onSelect: () => void }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm aria-selected:bg-accent"
    >
      {children}
    </Command.Item>
  );
}
