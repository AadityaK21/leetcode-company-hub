"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import {
  AArrowDown,
  AArrowUp,
  Loader2,
  Maximize2,
  Minimize2,
  Play,
  TerminalSquare,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <Skeleton className="h-full min-h-72 w-full rounded-none" />,
});

const LANGUAGES = [
  { id: "python", label: "Python", monaco: "python", starter: `def solve():\n    pass\n\nif __name__ == "__main__":\n    solve()\n` },
  { id: "cpp", label: "C++", monaco: "cpp", starter: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    return 0;\n}\n` },
  { id: "java", label: "Java", monaco: "java", starter: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n\n    }\n}\n` },
  { id: "javascript", label: "JavaScript", monaco: "javascript", starter: `function solve() {\n\n}\n\nsolve();\n` },
  { id: "typescript", label: "TypeScript", monaco: "typescript", starter: `function solve(): void {\n\n}\n\nsolve();\n` },
  { id: "go", label: "Go", monaco: "go", starter: `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println()\n}\n` },
  { id: "rust", label: "Rust", monaco: "rust", starter: `fn main() {\n\n}\n` },
  { id: "csharp", label: "C#", monaco: "csharp", starter: `using System;\n\nclass Program {\n    static void Main() {\n\n    }\n}\n` },
  { id: "kotlin", label: "Kotlin", monaco: "kotlin", starter: `fun main() {\n\n}\n` },
] as const;

type LangId = (typeof LANGUAGES)[number]["id"];

interface RunResult {
  compile: { stdout: string; stderr: string; code: number | null } | null;
  run: { stdout: string; stderr: string; code: number | null; signal: string | null };
  version?: string;
  wallTimeMs: number;
}

/**
 * Scratchpad workspace on every problem page: write, run against custom
 * input, iterate — then submit on LeetCode itself. Code autosaves locally
 * per problem + language.
 */
export function CodeWorkspace({ slug, signedIn }: { slug: string; signedIn: boolean }) {
  const { resolvedTheme } = useTheme();
  const [lang, setLang] = React.useState<LangId>("python");
  const [code, setCode] = React.useState<string>("");
  const [stdin, setStdin] = React.useState("");
  const [fontSize, setFontSize] = React.useState(14);
  const [fullscreen, setFullscreen] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState<RunResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const storageKey = React.useCallback((l: LangId) => `code:${slug}:${l}`, [slug]);
  const current = LANGUAGES.find((l) => l.id === lang)!;

  // Load saved code (or the starter) when the language changes.
  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey(lang));
      setCode(saved ?? current.starter);
    } catch {
      setCode(current.starter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, slug]);

  // Autosave (debounced by the browser being cheap about small writes).
  React.useEffect(() => {
    if (!code) return;
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey(lang), code);
      } catch {
        /* storage full/unavailable — non-fatal */
      }
    }, 600);
    return () => clearTimeout(t);
  }, [code, lang, storageKey]);

  // Esc exits fullscreen.
  React.useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFullscreen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  async function run() {
    if (!signedIn) {
      toast("Sign in to run code");
      return;
    }
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang, code, stdin }),
        signal: AbortSignal.timeout(35_000),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Run failed");
        return;
      }
      setResult(data);
    } catch {
      setError("The run timed out — check your connection and try again.");
    } finally {
      setRunning(false);
    }
  }

  const compileFailed = result?.compile && result.compile.code !== 0 && result.compile.stderr;

  return (
    <div
      className={cn(
        "glass overflow-hidden rounded-2xl",
        fullscreen && "fixed inset-2 z-[70] flex flex-col rounded-2xl bg-background sm:inset-4"
      )}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-3 py-2">
        <TerminalSquare className="size-4 text-muted-foreground" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              {current.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {LANGUAGES.map((l) => (
              <DropdownMenuItem key={l.id} onClick={() => setLang(l.id)}>
                {l.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Decrease font size"
            onClick={() => setFontSize((f) => Math.max(11, f - 1))}
          >
            <AArrowDown className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Increase font size"
            onClick={() => setFontSize((f) => Math.min(22, f + 1))}
          >
            <AArrowUp className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            onClick={() => setFullscreen((f) => !f)}
          >
            {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </Button>
          <Button variant="lime" size="sm" className="h-8" onClick={run} disabled={running}>
            {running ? <Loader2 className="animate-spin" /> : <Play />} Run
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className={cn("h-80", fullscreen && "min-h-0 flex-1")}>
        <MonacoEditor
          language={current.monaco}
          value={code}
          onChange={(v) => setCode(v ?? "")}
          theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
          options={{
            fontSize,
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 12 },
            smoothScrolling: true,
            automaticLayout: true,
            tabSize: 4,
          }}
        />
      </div>

      {/* Input + output */}
      <div className="grid gap-0 border-t border-border/60 sm:grid-cols-2">
        <div className="border-b border-border/60 p-3 sm:border-b-0 sm:border-r">
          <p className="eyebrow mb-1.5">Custom input (stdin)</p>
          <Textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            placeholder="Input your program reads…"
            className="min-h-20 border-none bg-secondary/50 font-mono text-xs shadow-none"
            aria-label="Standard input"
          />
        </div>
        <div className="p-3">
          <p className="eyebrow mb-1.5 flex items-center justify-between">
            Console
            {result && (
              <span className="figure normal-case tracking-normal">
                {result.wallTimeMs}ms{result.version ? ` · v${result.version}` : ""}
                {result.run.code !== null && ` · exit ${result.run.code}`}
              </span>
            )}
          </p>
          <div
            className="min-h-20 overflow-auto rounded-xl bg-secondary/50 p-2.5 font-mono text-xs scrollbar-thin"
            aria-live="polite"
          >
            {running && <span className="text-muted-foreground">Running…</span>}
            {error && <span className="text-rose-500">{error}</span>}
            {!running && !error && !result && (
              <span className="text-muted-foreground">Output appears here. Runs on the free Piston sandbox.</span>
            )}
            {result && (
              <>
                {compileFailed && (
                  <pre className="whitespace-pre-wrap text-rose-500">{result.compile!.stderr}</pre>
                )}
                {result.run.stdout && <pre className="whitespace-pre-wrap">{result.run.stdout}</pre>}
                {result.run.stderr && (
                  <pre className="whitespace-pre-wrap text-rose-500">{result.run.stderr}</pre>
                )}
                {!compileFailed && !result.run.stdout && !result.run.stderr && (
                  <span className="text-muted-foreground">(no output)</span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
