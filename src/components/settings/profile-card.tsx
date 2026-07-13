"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileCard({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [value, setValue] = React.useState(name);
  const [saving, setSaving] = React.useState(false);
  const dirty = value.trim() !== name && value.trim().length >= 2;

  async function save() {
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: value.trim() }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Couldn't update your profile");
      return;
    }
    toast.success("Profile updated");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">Profile</CardTitle>
        <CardDescription>{email}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1 space-y-1.5">
          <Label htmlFor="profile-name">Display name</Label>
          <Input
            id="profile-name"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={60}
          />
        </div>
        <Button onClick={save} disabled={!dirty || saving}>
          {saving && <Loader2 className="animate-spin" />} Save
        </Button>
      </CardContent>
    </Card>
  );
}
