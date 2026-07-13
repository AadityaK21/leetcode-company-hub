import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  language: z.enum(["python", "javascript", "typescript", "java", "cpp", "go", "rust", "csharp", "kotlin"]),
  code: z.string().min(1).max(60_000),
  stdin: z.string().max(10_000).optional(),
});

/** Maps our language ids to Piston runtimes. */
const RUNTIME: Record<string, { language: string; file: string }> = {
  python: { language: "python", file: "main.py" },
  javascript: { language: "javascript", file: "main.js" },
  typescript: { language: "typescript", file: "main.ts" },
  java: { language: "java", file: "Main.java" },
  cpp: { language: "c++", file: "main.cpp" },
  go: { language: "go", file: "main.go" },
  rust: { language: "rust", file: "main.rs" },
  csharp: { language: "csharp", file: "Main.cs" },
  kotlin: { language: "kotlin", file: "Main.kt" },
};

/**
 * Proxies code execution to the public Piston API (emkc.org) so the browser
 * never hits it cross-origin. Piston is free but rate-limited (~5 req/s
 * globally) — we add our own per-user limit on top.
 */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to run code" }, { status: 401 });
  if (!rateLimit(`execute:${user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many runs — wait a moment" }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const runtime = RUNTIME[parsed.data.language];

  const started = Date.now();
  try {
    const res = await fetch("https://emkc.org/api/v2/piston/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: runtime.language,
        version: "*",
        files: [{ name: runtime.file, content: parsed.data.code }],
        stdin: parsed.data.stdin ?? "",
        run_timeout: 10_000,
        compile_timeout: 15_000,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Runner unavailable (${res.status}). ${text.slice(0, 200)}` },
        { status: 502 }
      );
    }
    const data = await res.json();
    return NextResponse.json({
      compile: data.compile
        ? { stdout: data.compile.stdout ?? "", stderr: data.compile.stderr ?? "", code: data.compile.code }
        : null,
      run: {
        stdout: data.run?.stdout ?? "",
        stderr: data.run?.stderr ?? "",
        code: data.run?.code ?? null,
        signal: data.run?.signal ?? null,
      },
      language: data.language,
      version: data.version,
      wallTimeMs: Date.now() - started,
    });
  } catch {
    return NextResponse.json(
      { error: "Execution timed out or the runner is unreachable" },
      { status: 504 }
    );
  }
}
