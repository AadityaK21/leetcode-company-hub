"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { loginSchema, registerSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { PasswordChecklist } from "@/components/auth/password-checklist";

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="currentColor"
        d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49 0-.24-.01-.89-.01-1.75-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.36 1.12 2.94.85.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05a9.36 9.36 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.28 10.28 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z"
      />
    </svg>
  );
}

export function AuthCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [oauthLoading, setOauthLoading] = React.useState<"google" | "github" | null>(null);
  const [needsTwoFactor, setNeedsTwoFactor] = React.useState(false);

  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });
  const passwordValue = registerForm.watch("password") ?? "";

  // Feedback after clicking the verification link in the email.
  React.useEffect(() => {
    const v = searchParams.get("verified");
    if (v === "1") toast.success("Email verified — you can sign in now");
    if (v === "0") toast.error("That verification link is invalid or expired — request a new one by signing in");
  }, [searchParams]);

  function resendVerification(email: string) {
    fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    toast.success("If that account needs verification, a new email is on its way");
  }

  async function onLogin(values: LoginValues) {
    const res = await signIn("credentials", { ...values, redirect: false });
    const code = (res as { code?: string } | undefined)?.code;

    if (res?.error) {
      if (code === "2fa_required") {
        setNeedsTwoFactor(true);
        toast("Enter the 6-digit code from your authenticator app");
        return;
      }
      if (code === "2fa_invalid") {
        toast.error("That code didn't match — try again, or use a recovery code");
        return;
      }
      if (code === "email_unverified") {
        toast.error("Verify your email first — check your inbox (and spam)", {
          action: { label: "Resend", onClick: () => resendVerification(values.email) },
          duration: 8000,
        });
        return;
      }
      toast.error("Invalid email or password — or too many attempts. Wait a minute and try again.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  async function onRegister(values: RegisterValues) {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not create your account");
      return;
    }
    const data = (await res.json().catch(() => ({}))) as { verify?: boolean };

    if (data.verify) {
      // Email verification required before first sign-in.
      toast.success("Account created — check your inbox to verify your email", {
        duration: 10_000,
      });
      registerForm.reset();
      return;
    }

    toast.success("Account created — signing you in…");
    await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });
    router.push(callbackUrl);
    router.refresh();
  }

  function oauth(provider: "google" | "github") {
    setOauthLoading(provider);
    signIn(provider, { callbackUrl });
  }

  return (
    <Card className="glass-strong">
      <CardHeader className="text-center">
        <CardTitle className="font-display text-xl">Welcome</CardTitle>
        <CardDescription>Track your prep across every company.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => oauth("google")} disabled={oauthLoading !== null}>
            {oauthLoading === "google" ? <Loader2 className="animate-spin" /> : <GoogleIcon />} Google
          </Button>
          <Button variant="outline" onClick={() => oauth("github")} disabled={oauthLoading !== null}>
            {oauthLoading === "github" ? <Loader2 className="animate-spin" /> : <GitHubIcon />} GitHub
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="eyebrow">or with email</span>
          <Separator className="flex-1" />
        </div>

        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="register">Create account</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="login-email">Email</Label>
                <Input id="login-email" type="email" autoComplete="email" {...loginForm.register("email")} />
                <FieldError message={loginForm.formState.errors.email?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  {...loginForm.register("password")}
                />
                <FieldError message={loginForm.formState.errors.password?.message} />
              </div>

              {needsTwoFactor && (
                <div className="space-y-1.5 rounded-xl bg-lime/10 p-3">
                  <Label htmlFor="login-totp" className="flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-lime" /> Two-factor code
                  </Label>
                  <Input
                    id="login-totp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123 456"
                    autoFocus
                    {...loginForm.register("totp")}
                  />
                  <p className="text-xs text-muted-foreground">
                    From your authenticator app — or paste a recovery code.
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
                {loginForm.formState.isSubmitting && <Loader2 className="animate-spin" />}
                {needsTwoFactor ? "Verify & sign in" : "Sign in"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="reg-name">Name</Label>
                <Input id="reg-name" autoComplete="name" {...registerForm.register("name")} />
                <FieldError message={registerForm.formState.errors.name?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-email">Email</Label>
                <Input id="reg-email" type="email" autoComplete="email" {...registerForm.register("email")} />
                <FieldError message={registerForm.formState.errors.email?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-password">Password</Label>
                <Input
                  id="reg-password"
                  type="password"
                  autoComplete="new-password"
                  {...registerForm.register("password")}
                />
                <PasswordChecklist password={passwordValue} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-confirm-password">Confirm password</Label>
                <Input
                  id="reg-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  {...registerForm.register("confirmPassword")}
                />
                <FieldError message={registerForm.formState.errors.confirmPassword?.message} />
              </div>
              <Button type="submit" className="w-full" disabled={registerForm.formState.isSubmitting}>
                {registerForm.formState.isSubmitting && <Loader2 className="animate-spin" />} Create account
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <p className="text-center text-xs text-muted-foreground">
          Protected by rate limiting, lockouts, and optional two-factor auth.
        </p>
      </CardContent>
    </Card>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-rose-500">{message}</p>;
}
