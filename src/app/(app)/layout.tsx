import { AppShell, type PinnedCompany } from "@/components/layout/app-shell";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { PreferencesApplier } from "@/components/preferences-applier";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentStreak } from "@/lib/gamification";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const [settings, pinnedBookmarks, streak] = await Promise.all([
    userId
      ? prisma.userSettings.findUnique({
          where: { userId },
          select: { accent: true, fontSize: true, reducedMotion: true },
        })
      : null,
    userId
      ? prisma.bookmark.findMany({
          where: { userId, companyId: { not: null } },
          take: 5,
          orderBy: { createdAt: "asc" },
          include: { company: { select: { slug: true, name: true, logoUrl: true } } },
        })
      : [],
    userId ? currentStreak(userId) : 0,
  ]);

  const pinned: PinnedCompany[] = pinnedBookmarks
    .map((b) => b.company)
    .filter(Boolean) as PinnedCompany[];

  return (
    <>
      <OfflineBanner />
      <PreferencesApplier
        accent={settings?.accent ?? "lime"}
        fontSize={settings?.fontSize ?? "md"}
        reducedMotion={settings?.reducedMotion ?? false}
      />
      <AppShell pinned={pinned} streak={streak}>
        {children}
      </AppShell>
    </>
  );
}
