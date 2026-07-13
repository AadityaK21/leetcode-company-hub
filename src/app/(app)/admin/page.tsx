import { redirect } from "next/navigation";
import { Database, RefreshCcw, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SyncButton } from "@/components/admin/sync-button";
import { formatNumber } from "@/lib/utils";

export const metadata = { title: "Admin — CompanyHub" };

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const [companies, questions, users, lastSynced, recentUsers] = await Promise.all([
    prisma.company.count(),
    prisma.question.count(),
    prisma.user.count(),
    prisma.company.findFirst({
      orderBy: { lastSyncedAt: "desc" },
      select: { lastSyncedAt: true },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, name: true, email: true, xp: true, createdAt: true, role: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Control room"
        description="Data health and user overview. Visible to admins only."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Database} label="Companies" value={formatNumber(companies)} />
        <StatCard icon={Database} label="Questions" value={formatNumber(questions)} />
        <StatCard icon={Users} label="Users" value={formatNumber(users)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <RefreshCcw className="size-4" /> Data sync
          </CardTitle>
          <CardDescription>
            Last synced:{" "}
            {lastSynced?.lastSyncedAt
              ? lastSynced.lastSyncedAt.toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : "never — run the import"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SyncButton />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Recent signups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left">
                  <th className="eyebrow p-2 font-normal">User</th>
                  <th className="eyebrow p-2 font-normal">Role</th>
                  <th className="eyebrow p-2 font-normal">XP</th>
                  <th className="eyebrow p-2 font-normal">Joined</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((u) => (
                  <tr key={u.id} className="border-b border-border/40 last:border-0">
                    <td className="p-2">
                      <p className="font-medium">{u.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </td>
                    <td className="p-2 text-xs">{u.role}</td>
                    <td className="figure p-2">{u.xp}</td>
                    <td className="figure p-2 text-xs text-muted-foreground">
                      {u.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
