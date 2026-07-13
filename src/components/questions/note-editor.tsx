"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { formatDistanceToNow } from "date-fns";
import { History, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

interface NoteVersion {
  id: string;
  content: string;
  createdAt: string;
}

interface NoteResponse {
  note: { content: string; updatedAt: string; versions: NoteVersion[] } | null;
}

export function NoteEditor({ questionId, signedIn }: { questionId: string; signedIn: boolean }) {
  const { data, isLoading } = useQuery<NoteResponse>({
    queryKey: ["question", questionId, "note"],
    queryFn: async () => {
      const res = await fetch(`/api/notes?questionId=${questionId}`);
      if (!res.ok) throw new Error("Failed to load note");
      return res.json();
    },
    enabled: signedIn,
  });

  const [content, setContent] = React.useState<string | null>(null);
  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "saved">("idle");
  const [showHistory, setShowHistory] = React.useState(false);
  const debounced = useDebounce(content, 900);
  const loadedRef = React.useRef(false);

  // Hydrate the editor once the note loads.
  React.useEffect(() => {
    if (data && !loadedRef.current) {
      setContent(data.note?.content ?? "");
      loadedRef.current = true;
    }
  }, [data]);

  // Autosave on debounce.
  React.useEffect(() => {
    if (!signedIn || debounced == null || !loadedRef.current) return;
    if (debounced === (data?.note?.content ?? "")) return;
    let cancelled = false;
    setSaveState("saving");
    fetch("/api/notes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, content: debounced }),
    }).then((res) => {
      if (!cancelled) setSaveState(res.ok ? "saved" : "idle");
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, questionId, signedIn]);

  if (!signedIn) {
    return (
      <p className="text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-foreground underline">
          Sign in
        </Link>{" "}
        to keep markdown notes on this problem — approach, complexity, gotchas.
      </p>
    );
  }

  if (isLoading || content == null) {
    return <Skeleton className="h-40 w-full rounded-xl" />;
  }

  const versions = data?.note?.versions ?? [];

  return (
    <div className="space-y-3">
      <Tabs defaultValue="write">
        <div className="flex items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "figure text-xs text-muted-foreground transition-opacity",
                saveState === "idle" && "opacity-0"
              )}
              aria-live="polite"
            >
              {saveState === "saving" ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" /> Saving…
                </span>
              ) : (
                "Saved"
              )}
            </span>
            {versions.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setShowHistory((s) => !s)}>
                <History /> {versions.length}
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="write">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={"## Approach\n\n- Pattern: two pointers\n- Time: O(n) · Space: O(1)\n\nMarkdown supported."}
            className="min-h-40 font-mono text-sm"
            aria-label="Note content"
          />
        </TabsContent>
        <TabsContent value="preview">
          <div className="prose prose-sm min-h-40 max-w-none rounded-xl border border-border bg-card p-4 dark:prose-invert">
            {content.trim() ? (
              <ReactMarkdown>{content}</ReactMarkdown>
            ) : (
              <p className="text-muted-foreground">Nothing to preview yet.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {showHistory && versions.length > 0 && (
        <div className="space-y-2 rounded-xl border border-border p-3">
          <p className="eyebrow">Previous versions</p>
          {versions.map((v) => (
            <div key={v.id} className="flex items-start justify-between gap-3 text-sm">
              <p className="line-clamp-2 flex-1 whitespace-pre-wrap text-muted-foreground">
                {v.content || "(empty)"}
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <span className="figure text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setContent(v.content)}>
                  Restore
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
