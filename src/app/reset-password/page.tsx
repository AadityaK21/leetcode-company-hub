"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { PasswordChecklist } from "@/components/auth/password-checklist";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const linkBroken = !token || !email;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token, password }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      toast.error(data.error ?? "Reset failed — try requesting a new link");
      return;
    }
    toast.success("Password updated — sign in with your new password");
    router.push("/login");
  }

  return (
    <Card className="glass-strong w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 font-display text-xl">
          <KeyRound className="size-5 text-lime" /> Choose a new password
        </CardTitle>
        <CardDescription>
          {linkBroken ? "This link is incomplete." : `For ${email}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {linkBroken ? (
          <p className="text-center text-sm text-muted-foreground">
            Open the link from your email again, or{" "}
            <Link href="/login" className="underline hover:text-foreground">
              request a new reset link
            </Link>
            .
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              <PasswordChecklist password={password} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              {confirm.length > 0 && password !== confirm && (
                <p className="text-xs text-rose-500">Passwords don&apos;t match</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={busy || !password || !confirm}>
              {busy && <Loader2 className="animate-spin" />} Update password
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 p-4">
      <Link href="/">
        <Logo />
      </Link>
      <React.Suspense fallback={null}>
        <ResetPasswordForm />
      </React.Suspense>
    </div>
  );
}
