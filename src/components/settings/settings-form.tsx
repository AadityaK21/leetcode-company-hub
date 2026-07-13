"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { Download, Laptop, Loader2, Moon, Sun, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SettingsValues {
  dailyGoal: number;
  reducedMotion: boolean;
  emailNotifications: boolean;
  publicProfile: boolean;
  accent: string;
  fontSize: string;
}

const ACCENTS = [
  { value: "lime", label: "Lime", swatch: "bg-[hsl(76,82%,46%)]" },
  { value: "blue", label: "Blue", swatch: "bg-[hsl(217,91%,55%)]" },
  { value: "violet", label: "Violet", swatch: "bg-[hsl(262,83%,58%)]" },
  { value: "rose", label: "Rose", swatch: "bg-[hsl(347,77%,50%)]" },
] as const;

const FONT_SIZES = [
  { value: "sm", label: "Compact" },
  { value: "md", label: "Default" },
  { value: "lg", label: "Comfort" },
] as const;

export function SettingsForm({ initial }: { initial: SettingsValues }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [values, setValues] = React.useState(initial);
  const [deleting, setDeleting] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  async function patch(next: Partial<SettingsValues>) {
    const merged = { ...values, ...next };
    setValues(merged); // optimistic
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!res.ok) {
      setValues(values);
      toast.error("Couldn't save that setting");
      return;
    }
    // Accent/font/motion are applied by the server-loaded PreferencesApplier.
    if ("accent" in next || "fontSize" in next || "reducedMotion" in next) {
      router.refresh();
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    const res = await fetch("/api/account", { method: "DELETE" });
    if (!res.ok) {
      setDeleting(false);
      toast.error("Couldn't delete your account");
      return;
    }
    await signOut({ redirect: false });
    router.push("/");
    router.refresh();
  }

  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Laptop },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Appearance</CardTitle>
          <CardDescription>Theme applies instantly across the app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex gap-2" role="group" aria-label="Theme">
            {themes.map((t) => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                aria-pressed={mounted && theme === t.value}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1.5 rounded-2xl border p-4 text-sm font-medium transition-all",
                  mounted && theme === t.value
                    ? "border-foreground/35 bg-accent"
                    : "border-border hover:border-foreground/30"
                )}
              >
                <t.icon className="size-4" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Accent */}
          <div className="space-y-2">
            <Label>Accent color</Label>
            <div className="flex gap-2" role="group" aria-label="Accent color">
              {ACCENTS.map((a) => (
                <button
                  key={a.value}
                  onClick={() => patch({ accent: a.value })}
                  aria-pressed={values.accent === a.value}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1.5 rounded-2xl border p-3 text-xs font-medium transition-all",
                    values.accent === a.value
                      ? "border-foreground/40"
                      : "border-border hover:border-foreground/30"
                  )}
                >
                  <span className={cn("size-5 rounded-full", a.swatch)} />
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font size */}
          <div className="space-y-2">
            <Label>Text size</Label>
            <div className="flex gap-2" role="group" aria-label="Text size">
              {FONT_SIZES.map((f) => (
                <button
                  key={f.value}
                  onClick={() => patch({ fontSize: f.value })}
                  aria-pressed={values.fontSize === f.value}
                  className={cn(
                    "flex-1 rounded-2xl border py-3 text-sm font-medium transition-all",
                    values.fontSize === f.value
                      ? "border-foreground/35 bg-accent"
                      : "border-border hover:border-foreground/30"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="reduced-motion">Reduced motion</Label>
              <p className="text-xs text-muted-foreground">Minimize animations and transitions.</p>
            </div>
            <Switch
              id="reduced-motion"
              checked={values.reducedMotion}
              onCheckedChange={(v) => patch({ reducedMotion: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Daily goal</CardTitle>
          <CardDescription>Problems per day — shown on your dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2" role="group" aria-label="Daily goal">
            {[1, 2, 3, 5, 8].map((n) => (
              <button
                key={n}
                onClick={() => patch({ dailyGoal: n })}
                aria-pressed={values.dailyGoal === n}
                className={cn(
                  "figure flex-1 rounded-2xl border py-3 text-lg font-semibold transition-all",
                  values.dailyGoal === n
                    ? "border-foreground/35 bg-accent"
                    : "border-border hover:border-foreground/30"
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Privacy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="public-profile">Show me on the leaderboard</Label>
              <p className="text-xs text-muted-foreground">
                Turn off to hide your name and XP from other users entirely.
              </p>
            </div>
            <Switch
              id="public-profile"
              checked={values.publicProfile}
              onCheckedChange={(v) => patch({ publicProfile: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-notif">Email updates</Label>
              <p className="text-xs text-muted-foreground">
                Occasional summaries of due revisions. (Delivery wiring is left to your mail provider.)
              </p>
            </div>
            <Switch
              id="email-notif"
              checked={values.emailNotifications}
              onCheckedChange={(v) => patch({ emailNotifications: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Your data</CardTitle>
          <CardDescription>Export everything, or delete your account permanently.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <a href="/api/export" download>
              <Download /> Export JSON
            </a>
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 /> Delete account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete your account?</DialogTitle>
                <DialogDescription>
                  This permanently removes your profile, progress, notes, bookmarks, and revision
                  history. There is no undo.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="destructive" onClick={deleteAccount} disabled={deleting}>
                  {deleting && <Loader2 className="animate-spin" />} Yes, delete everything
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
