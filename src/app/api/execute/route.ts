import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  language: z.enum(["python", "javascript", "typescript", "java", "cpp", "go", "rust", "csharp", "kotlin"]),
  code: z.string().min(1).max(60_000),
  stdin: z.string().max(10_000).optional(),
});

type Lang = z.infer<typeof schema>["language"];

interface ExecResult {
  compile: { stdout: string; stderr: string; code: number | null } | null;
  run: { stdout: string; stderr: string; code: number | null; signal: string | null };
  version?: string;
}

/**
 * Providers (the public Piston API went whitelist-only in Feb 2026):
 * - Wandbox (wandbox.org) — free, no key. Handles interpreted + most compiled langs.
 * - Compiler Explorer (godbolt.org) — free, no key. Handles Java/Kotlin/C#,
 *   which Wandbox lacks or where its fixed `prog.*` filename breaks `public class Main`.
 */
const WANDBOX: Partial<Record<Lang, string>> = {
  python: "cpython-3.13.8",
  javascript: "nodejs-20.17.0",
  typescript: "typescript-5.6.2",
  cpp: "gcc-13.2.0",
  go: "go-1.23.2",
  rust: "rust-1.82.0",
};

const GODBOLT: Partial<Record<Lang, { id: string; lang: string }>> = {
  java: { id: "java2102", lang: "java" },
  kotlin: { id: "kotlinc2220", lang: "kotlin" },
  csharp: { id: "dotnet80csharpcoreclr", lang: "csharp" },
};

async function runWandbox(compiler: string, code: string, stdin: string): Promise<ExecResult> {
  const res = await fetch("https://wandbox.org/api/compile.json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ compiler, code, stdin }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`wandbox ${res.status}`);
  const data = await res.json();

  const compilerOut = data.compiler_output ?? "";
  const compilerErr = data.compiler_error ?? "";
  const status = data.status != null && data.status !== "" ? parseInt(String(data.status), 10) : null;
  const ranNothing = !data.program_output && !data.program_error;

  return {
    compile:
      compilerOut || compilerErr
        ? {
            stdout: compilerOut,
            stderr: compilerErr,
            // Wandbox has no separate compile exit code — infer failure.
            code: compilerErr && status !== 0 && ranNothing ? 1 : 0,
          }
        : null,
    run: {
      stdout: data.program_output ?? "",
      stderr: data.program_error ?? "",
      code: Number.isFinite(status) ? status : null,
      signal: data.signal ?? null,
    },
  };
}

async function runGodbolt(
  cfg: { id: string; lang: string },
  code: string,
  stdin: string
): Promise<ExecResult> {
  const res = await fetch(`https://godbolt.org/api/compiler/${cfg.id}/compile`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      source: code,
      lang: cfg.lang,
      allowStoreCodeDebug: false,
      options: {
        userArguments: "",
        executeParameters: { args: [], stdin },
        compilerOptions: { executorRequest: true, skipAsm: true },
        filters: { execute: true },
        tools: [],
        libraries: [],
      },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`godbolt ${res.status}`);
  const data = await res.json();

  const joinLines = (arr?: { text: string }[]) => (arr ?? []).map((l) => l.text).join("\n");

  return {
    compile: data.buildResult
      ? {
          stdout: joinLines(data.buildResult.stdout),
          stderr: joinLines(data.buildResult.stderr),
          code: data.buildResult.code ?? 0,
        }
      : null,
    run: {
      stdout: joinLines(data.stdout),
      stderr: joinLines(data.stderr),
      code: data.code ?? null,
      signal: null,
    },
  };
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to run code" }, { status: 401 });
  if (!rateLimit(`execute:${user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many runs — wait a moment" }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const { language, code } = parsed.data;
  const stdin = parsed.data.stdin ?? "";

  const started = Date.now();
  try {
    const wandbox = WANDBOX[language];
    const result = wandbox
      ? await runWandbox(wandbox, code, stdin)
      : await runGodbolt(GODBOLT[language]!, code, stdin);

    return NextResponse.json({
      ...result,
      language,
      wallTimeMs: Date.now() - started,
    });
  } catch {
    return NextResponse.json(
      { error: "Execution timed out or the runner is unreachable — try again" },
      { status: 504 }
    );
  }
}
