"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** "Pick for me" — jumps to a random unsolved problem in the current scope. */
export function RandomPickButton({
  company,
  sheet,
  variant = "outline",
}: {
  company?: string;
  sheet?: string;
  variant?: "outline" | "lime";
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function pick() {
    setLoading(true);
    const params = new URLSearchParams();
    if (company) params.set("company", company);
    if (sheet) params.set("sheet", sheet);
    try {
      const res = await fetch(`/api/questions/random?${params}`);
      const data = await res.json();
      if (data.question) {
        toast(`Rolled: ${data.question.title}`);
        router.push(`/problems/${data.question.slug}`);
      } else {
        toast.success("Everything in this scope is solved. Legend.");
      }
    } catch {
      toast.error("Couldn't pick a problem");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant={variant} size="sm" onClick={pick} disabled={loading}>
      {loading ? <Loader2 className="animate-spin" /> : <Shuffle />} Pick for me
    </Button>
  );
}
