import { redirect } from "next/navigation";
import { KeyRound, LogIn, ShieldCheck, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { SecuritySection } from "@/components/settings/security-section";
import { ProfileCard } from "@/components/settings/profile-card";
import { ConnectedAccounts } from "@/components/settings/connected-accounts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Settings — CompanyHub" };

const EVENT_META: Record<string, { icon: typeof LogIn; label: string }> = {
  login: { icon: LogIn, label: "Signed in" },
  register: { icon: UserPlus, label: "Account created" },
  security: { icon: ShieldCheck, label: "Security change" },
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/settings");

  const [settings, account, events] = await Promise.all([
    prisma.userSettings.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id },
      update: {},
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        twoFactorEnabled: true,
        passwordHash: true,
        lastLoginAt: true,
        leetcodeUsername: true,
        leetcodeSyncedAt: true,
      },
    }),
    prisma.activity.findMany({
      where: { userId: session.user.id, type: { in: ["login", "register", "security"] } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  return (
    <div className="max-w-2xl">
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Profile, appearance, security, privacy, and your data."
      />
      <div className="space-y-6">
        <ProfileCard name={session.user.name ?? ""} email={session.user.email ?? ""} />

        <ConnectedAccounts
          leetcodeUsername={account?.leetcodeUsername ?? null}
          leetcodeSyncedAt={account?.leetcodeSyncedAt?.toISOString() ?? null}
        />

        <SecuritySection
          twoFactorEnabled={account?.twoFactorEnabled ?? false}
          hasPassword={!!account?.passwordHash}
        />

        {/* Sign-in activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <KeyRound className="size-4" /> Sign-in activity
            </CardTitle>
            <CardDescription>
              Recent authentication events on your account. Sessions are stateless and expire
              automatically after 14 days.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {events.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No events recorded yet — new sign-ins will appear here.
              </p>
            )}
            {events.map((e) => {
              const meta = EVENT_META[e.type] ?? EVENT_META.login;
              const detail = e.meta as { ip?: string; event?: string } | null;
              return (
                <div key={e.id} className="flex items-center gap-3 text-sm">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-secondary">
                    <meta.icon className="size-4 text-muted-foreground" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {e.type === "security" && detail?.event === "2fa_enabled"
                        ? "Two-factor auth enabled"
                        : e.type === "security" && detail?.event === "2fa_disabled"
                          ? "Two-factor auth disabled"
                          : meta.label}
                    </p>
                    {detail?.ip && detail.ip !== "local" && (
                      <p className="figure text-xs text-muted-foreground">from {detail.ip}</p>
                    )}
                  </div>
                  <span className="figure shrink-0 text-xs text-muted-foreground">
                    {formatDistanceToNow(e.createdAt, { addSuffix: true })}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <SettingsForm
          initial={{
            dailyGoal: settings.dailyGoal,
            reducedMotion: settings.reducedMotion,
            emailNotifications: settings.emailNotifications,
            publicProfile: settings.publicProfile,
            accent: settings.accent,
            fontSize: settings.fontSize,
          }}
        />
      </div>
    </div>
  );
}
