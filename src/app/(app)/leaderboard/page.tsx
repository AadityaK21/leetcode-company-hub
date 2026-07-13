import { Crown } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { levelFromXp, formatNumber, cn } from "@/lib/utils";

export const metadata = { title: "Leaderboard — CompanyHub" };
export const revalidate = 120;

export default async function LeaderboardPage() {
  const session = await auth();
  const myId = session?.user?.id ?? null;

  const users = await prisma.user.findMany({
    where: {
      OR: [{ settings: { is: null } }, { settings: { publicProfile: true } }],
    },
    orderBy: { xp: "desc" },
    take: 25,
    select: {
      id: true,
      name: true,
      image: true,
      xp: true,
      _count: {
        select: {
          progress: { where: { status: { in: ["SOLVED", "MASTERED"] } } },
        },
      },
    },
  });

  const ranked = users.filter((u) => u.xp > 0);

  return (
    <div>
      <PageHeader
        eyebrow="Community"
        title="Leaderboard"
        description="Top solvers by XP. Easy +10 · Medium +25 · Hard +50, plus achievement bonuses."
      />

      {ranked.length === 0 ? (
        <EmptyState
          icon={Crown}
          title="No solvers yet"
          description="The first solved problem claims the top spot. It could be yours."
        />
      ) : (
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Podium */}
          {ranked.length >= 3 && (
            <div className="grid grid-cols-3 items-end gap-3">
              {[ranked[1], ranked[0], ranked[2]].map((u, i) => {
                const place = i === 1 ? 1 : i === 0 ? 2 : 3;
                return (
                  <div
                    key={u.id}
                    className={cn(
                      "glass-strong flex flex-col items-center gap-2 rounded-2xl p-4 text-center",
                      place === 1 && "pb-8 pt-6 ring-1 ring-lime/50"
                    )}
                  >
                    {place === 1 && <Crown className="size-5 text-lime" />}
                    <Avatar className={place === 1 ? "size-14" : "size-11"}>
                      <AvatarImage src={u.image ?? undefined} alt="" />
                      <AvatarFallback>{(u.name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <p className="w-full truncate text-sm font-medium">{u.name ?? "Anonymous"}</p>
                    <p className="figure text-xs text-muted-foreground">{formatNumber(u.xp)} XP</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Ranked list */}
          <div className="glass divide-y divide-border/50 rounded-2xl">
            {ranked.map((u, i) => {
              const { level } = levelFromXp(u.xp);
              const me = u.id === myId;
              return (
                <div
                  key={u.id}
                  className={cn("flex items-center gap-3 p-3.5", me && "bg-lime/10")}
                >
                  <span className="figure w-7 shrink-0 text-center text-sm font-semibold text-muted-foreground">
                    {i + 1}
                  </span>
                  <Avatar className="size-8">
                    <AvatarImage src={u.image ?? undefined} alt="" />
                    <AvatarFallback>{(u.name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {u.name ?? "Anonymous"}
                      {me && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
                    </p>
                    <p className="figure text-xs text-muted-foreground">
                      Level {level} · {u._count.progress} solved
                    </p>
                  </div>
                  <span className="figure text-sm font-semibold">{formatNumber(u.xp)} XP</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
