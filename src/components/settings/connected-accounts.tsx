"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, Link2, Loader2, RefreshCcw, Unlink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export function ConnectedAccounts({
  leetcodeUsername,
  leetcodeSyncedAt,
}: {
  leetcodeUsername: string | null;
  leetcodeSyncedAt: string | null;
}) {
  const router = useRouter();
  const [username, setUsername] = React.useState("");
  const [busy, setBusy] = React.useState<"connect" | "verify" | "sync" | "disconnect" | null>(null);
  const [lastError, setLastError] = React.useState<string | null>(null);
  // Pending ownership check: code the user must paste into their LeetCode profile.
  const [pending, setPending] = React.useState<{ username: string; code: string } | null>(null);

  async function connect() {
    setBusy("connect");
    setLastError(null);
    const res = await fetch("/api/leetcode/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setLastError(data.error ?? "Connection failed");
      toast.error(data.error ?? "Connection failed");
      return;
    }
    setPending({ username: data.username, code: data.code });
  }

  async function verify() {
    setBusy("verify");
    setLastError(null);
    const res = await fetch("/api/leetcode/verify", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setLastError(data.error ?? "Verification failed");
      toast.error(data.error ?? "Verification failed");
      return;
    }
    setPending(null);
    toast.success("LeetCode account verified & linked — you can remove the code from your profile now");
    router.refresh();
    // Kick off the first sync immediately.
    void sync(true);
  }

  async function sync(silent = false) {
    setBusy("sync");
    setLastError(null);
    const res = await fetch("/api/leetcode/sync", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setLastError(data.error ?? "Sync failed");
      if (!silent) toast.error(data.error ?? "Sync failed");
      return;
    }
    if (data.imported > 0) {
      toast.success(`Imported ${data.imported} verified solve${data.imported === 1 ? "" : "s"} from LeetCode`);
    } else if (!silent) {
      toast.success("Up to date — no new solves found");
    }
    router.refresh();
  }

  async function disconnect() {
    setBusy("disconnect");
    await fetch("/api/leetcode/disconnect", { method: "POST" });
    setBusy(null);
    toast.success("LeetCode disconnected");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Link2 className="size-4" /> Connected accounts
          {leetcodeUsername && <Badge variant="lime">LeetCode linked</Badge>}
        </CardTitle>
        <CardDescription>
          Link your LeetCode profile and your recent accepted submissions sync in automatically as
          verified solves. Heads up: LeetCode&apos;s public API only shares your ~20 most recent
          accepted submissions, so history accumulates sync by sync — solve, sync, done.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {leetcodeUsername ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  leetcode.com/u/<span className="figure">{leetcodeUsername}</span>
                </p>
                <p className="figure mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  {leetcodeSyncedAt ? (
                    <>
                      <CheckCircle2 className="size-3 text-lime" />
                      Last synced {formatDistanceToNow(new Date(leetcodeSyncedAt), { addSuffix: true })}
                    </>
                  ) : (
                    "Never synced"
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="lime" size="sm" onClick={() => sync()} disabled={busy !== null}>
                  {busy === "sync" ? <Loader2 className="animate-spin" /> : <RefreshCcw />} Sync now
                </Button>
                <Button variant="ghost" size="sm" onClick={disconnect} disabled={busy !== null}>
                  {busy === "disconnect" ? <Loader2 className="animate-spin" /> : <Unlink />} Disconnect
                </Button>
              </div>
            </div>
            {lastError && (
              <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-600 dark:text-rose-400">
                Last sync failed: {lastError}
              </p>
            )}
          </>
        ) : pending ? (
          <div className="space-y-3 rounded-xl bg-secondary/60 p-4">
            <p className="text-sm font-medium">
              Verify you own <span className="figure">{pending.username}</span>
            </p>
            <ol className="list-decimal space-y-1.5 pl-4 text-sm text-muted-foreground">
              <li>
                Copy this code:{" "}
                <button
                  type="button"
                  className="figure rounded-md bg-card px-2 py-0.5 font-semibold text-foreground hover:bg-accent"
                  onClick={() => {
                    navigator.clipboard.writeText(pending.code);
                    toast.success("Code copied");
                  }}
                  title="Click to copy"
                >
                  {pending.code}
                </button>
              </li>
              <li>
                Paste it anywhere in your{" "}
                <a
                  href="https://leetcode.com/profile/"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-foreground"
                >
                  LeetCode profile summary
                </a>{" "}
                and save.
              </li>
              <li>Come back and click Verify. You can remove the code afterwards.</li>
            </ol>
            <div className="flex gap-2">
              <Button variant="lime" size="sm" onClick={verify} disabled={busy !== null}>
                {busy === "verify" ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Verify
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setPending(null)} disabled={busy !== null}>
                Cancel
              </Button>
            </div>
            {lastError && (
              <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-600 dark:text-rose-400">
                {lastError}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1 space-y-1.5">
              <Label htmlFor="lc-username">LeetCode username</Label>
              <Input
                id="lc-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. neal_wu"
                onKeyDown={(e) => e.key === "Enter" && username.trim() && connect()}
              />
            </div>
            <Button onClick={connect} disabled={!username.trim() || busy !== null}>
              {busy === "connect" ? <Loader2 className="animate-spin" /> : <Link2 />} Connect
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Silently re-syncs in the background when the last sync is stale (>6h). */
export function LeetcodeAutoSync({ staleSyncedAt }: { staleSyncedAt: string | null }) {
  const router = useRouter();
  const fired = React.useRef(false);

  React.useEffect(() => {
    if (fired.current) return;
    const stale =
      !staleSyncedAt || Date.now() - new Date(staleSyncedAt).getTime() > 6 * 60 * 60 * 1000;
    if (!stale) return;
    fired.current = true;
    fetch("/api/leetcode/sync", { method: "POST" })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        if (data.imported > 0) {
          toast.success(`Synced ${data.imported} new solve${data.imported === 1 ? "" : "s"} from LeetCode`);
          router.refresh();
        }
      })
      .catch(() => {});
  }, [staleSyncedAt, router]);

  return null;
}
