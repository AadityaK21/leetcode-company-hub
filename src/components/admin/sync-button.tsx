"use client";

import * as React from "react";
import { Loader2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SyncButton() {
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  async function sync() {
    setLoading(true);
    const res = await fetch("/api/admin/sync", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error ?? "Sync failed");
      return;
    }
    setMessage(data.message);
  }

  return (
    <div className="space-y-3">
      <Button onClick={sync} disabled={loading} variant="lime">
        {loading ? <Loader2 className="animate-spin" /> : <RefreshCcw />} Sync latest data
      </Button>
      {message && (
        <p className="figure rounded-xl bg-secondary p-3 text-xs text-muted-foreground">{message}</p>
      )}
    </div>
  );
}
