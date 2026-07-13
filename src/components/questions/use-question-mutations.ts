"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

async function post(url: string, body: unknown, method = "POST") {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000), // fail fast on dead connections, then retry
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

/** Shared mutations for question rows and the detail page. */
export function useQuestionMutations() {
  const queryClient = useQueryClient();
  const { status: authStatus } = useSession();
  const router = useRouter();

  function guard(): boolean {
    if (authStatus !== "authenticated") {
      toast("Sign in to track your prep", {
        action: { label: "Sign in", onClick: () => router.push("/login") },
      });
      return false;
    }
    return true;
  }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["questions"] });
    queryClient.invalidateQueries({ queryKey: ["question"] });
    queryClient.invalidateQueries({ queryKey: ["revisions"] });
    queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
  };

  const setStatus = useMutation({
    mutationFn: (vars: { questionId: string; status: string }) => post("/api/progress", vars),
    onSuccess: (_, vars) => {
      invalidate();
      if (vars.status === "SOLVED") toast.success("Marked solved — nice work.");
      if (vars.status === "MASTERED") toast.success("Mastered. On to the next.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleBookmark = useMutation({
    mutationFn: (vars: { questionId?: string; companyId?: string; sheetId?: string }) =>
      post("/api/bookmarks", vars),
    onSuccess: (data) => {
      invalidate();
      toast.success(data.bookmarked ? "Bookmarked" : "Bookmark removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revise = useMutation({
    mutationFn: (vars: {
      questionId: string;
      action: "schedule" | "review" | "master" | "remove";
      grade?: "easy" | "medium" | "hard" | "forgot";
    }) =>
      post("/api/revisions", vars),
    onSuccess: (_, vars) => {
      invalidate();
      if (vars.action === "schedule") toast.success("Added to your revision queue");
      if (vars.action === "review") {
        toast.success(
          vars.grade === "forgot"
            ? "No shame — it's back in tomorrow's queue"
            : "Reviewed — next round scheduled"
        );
      }
      if (vars.action === "master") toast.success("Marked mastered");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { setStatus, toggleBookmark, revise, guard };
}
