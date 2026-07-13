"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
/* eslint-disable @next/next/no-img-element */
import { Copy, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

type Step = "closed" | "scan" | "codes" | "disable";

export function SecuritySection({
  twoFactorEnabled,
  hasPassword,
}: {
  twoFactorEnabled: boolean;
  hasPassword: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>("closed");
  const [loading, setLoading] = React.useState(false);
  const [qr, setQr] = React.useState<string | null>(null);
  const [manualKey, setManualKey] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [recoveryCodes, setRecoveryCodes] = React.useState<string[]>([]);
  const [confirmValue, setConfirmValue] = React.useState("");

  async function beginSetup() {
    setLoading(true);
    const res = await fetch("/api/2fa/setup", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error ?? "Couldn't start 2FA setup");
      return;
    }
    setQr(data.qrDataUrl);
    setManualKey(data.manualKey);
    setCode("");
    setStep("scan");
  }

  async function verify() {
    setLoading(true);
    const res = await fetch("/api/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error ?? "Verification failed");
      return;
    }
    setRecoveryCodes(data.recoveryCodes ?? []);
    setStep("codes");
    toast.success("Two-factor authentication is on");
  }

  async function disable() {
    setLoading(true);
    const res = await fetch("/api/2fa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // A 6-digit entry is treated as a TOTP code; anything else as the password.
      body: JSON.stringify(
        /^\d{6}$/.test(confirmValue.trim())
          ? { code: confirmValue.trim() }
          : { password: confirmValue }
      ),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error ?? "Couldn't disable 2FA");
      return;
    }
    toast.success("Two-factor authentication is off");
    setStep("closed");
    setConfirmValue("");
    router.refresh();
  }

  function copyCodes() {
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    toast.success("Recovery codes copied — store them somewhere safe");
  }

  function finish() {
    setStep("closed");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          Security
          {twoFactorEnabled && <Badge variant="lime">2FA on</Badge>}
        </CardTitle>
        <CardDescription>
          Two-factor authentication asks for a 6-digit code from your phone on every sign-in — a
          stolen password alone can&apos;t get in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {twoFactorEnabled ? (
          <Button variant="outline" onClick={() => setStep("disable")}>
            <ShieldOff /> Disable two-factor auth
          </Button>
        ) : (
          <Button variant="lime" onClick={beginSetup} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Enable two-factor auth
          </Button>
        )}
        {!hasPassword && !twoFactorEnabled && (
          <p className="mt-2 text-xs text-muted-foreground">
            You signed up with Google/GitHub — 2FA here protects email sign-in; your provider&apos;s
            own 2FA protects OAuth.
          </p>
        )}
      </CardContent>

      {/* Step 1: scan QR + enter first code */}
      <Dialog open={step === "scan"} onOpenChange={(o) => !o && setStep("closed")}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan with your authenticator app</DialogTitle>
            <DialogDescription>
              Google Authenticator, Authy, 1Password — any TOTP app works. Then enter the 6-digit
              code it shows to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3">
            {qr && (
              <img
                src={qr}
                alt="2FA QR code"
                width={200}
                height={200}
                className="rounded-2xl border border-border bg-white p-2"
              />
            )}
            {manualKey && (
              <p className="figure max-w-full break-all rounded-xl bg-secondary px-3 py-2 text-center text-xs">
                Can&apos;t scan? Key: {manualKey}
              </p>
            )}
            <div className="w-full space-y-1.5">
              <Label htmlFor="verify-code">6-digit code</Label>
              <Input
                id="verify-code"
                inputMode="numeric"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={verify} disabled={loading || code.trim().length < 6} variant="lime">
              {loading && <Loader2 className="animate-spin" />} Turn on 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 2: recovery codes, shown exactly once */}
      <Dialog open={step === "codes"} onOpenChange={(o) => !o && finish()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save your recovery codes</DialogTitle>
            <DialogDescription>
              Each code works once if you lose your phone. This is the only time they&apos;re shown.
            </DialogDescription>
          </DialogHeader>
          <div className="figure grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-4 text-center text-sm">
            {recoveryCodes.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={copyCodes}>
              <Copy /> Copy all
            </Button>
            <Button variant="lime" onClick={finish}>
              I&apos;ve saved them
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable: requires re-proof */}
      <Dialog open={step === "disable"} onOpenChange={(o) => !o && setStep("closed")}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable two-factor auth?</DialogTitle>
            <DialogDescription>
              Confirm with a current authenticator code{hasPassword ? " or your password" : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="disable-confirm">
              {hasPassword ? "Authenticator code or password" : "Authenticator code"}
            </Label>
            <Input
              id="disable-confirm"
              type={/^\d*$/.test(confirmValue) ? "text" : "password"}
              value={confirmValue}
              onChange={(e) => setConfirmValue(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={disable} disabled={loading || !confirmValue}>
              {loading && <Loader2 className="animate-spin" />} Disable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
