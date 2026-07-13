import Link from "next/link";
import { redirect } from "next/navigation";
import { Bookmark as BookmarkIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import { CompanyLogo } from "@/components/shared/company-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Bookmarks — CompanyHub" };

export default async function BookmarksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/bookmarks");

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      question: { select: { slug: true, title: true, difficulty: true } },
      company: {
        select: { slug: true, name: true, logoUrl: true, totalQuestions: true },
      },
      sheet: { select: { slug: true, title: true } },
    },
  });

  const questionBookmarks = bookmarks.filter((b) => b.question);
  const companyBookmarks = bookmarks.filter((b) => b.company);
  const sheetBookmarks = bookmarks.filter((b) => b.sheet);

  return (
    <div>
      <PageHeader
        eyebrow="Saved"
        title="Bookmarks"
        description="Problems, companies, and sheets you've saved for later."
      />

      {bookmarks.length === 0 ? (
        <EmptyState
          icon={BookmarkIcon}
          title="Nothing bookmarked yet"
          description="Tap the bookmark icon on any problem row or company page and it'll show up here."
          action={
            <Button asChild variant="lime" size="sm">
              <Link href="/companies">Browse companies</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {questionBookmarks.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="font-display text-lg">
                  Problems <span className="figure text-sm text-muted-foreground">({questionBookmarks.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-1 sm:grid-cols-2">
                {questionBookmarks.map((b) => (
                  <Link
                    key={b.id}
                    href={`/problems/${b.question!.slug}`}
                    className="flex items-center justify-between gap-3 rounded-xl p-2.5 transition-colors hover:bg-accent"
                  >
                    <span className="min-w-0 truncate text-sm font-medium">{b.question!.title}</span>
                    <DifficultyBadge difficulty={b.question!.difficulty} />
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {companyBookmarks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">Companies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {companyBookmarks.map((b) => (
                  <Link
                    key={b.id}
                    href={`/companies/${b.company!.slug}`}
                    className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-accent"
                  >
                    <CompanyLogo name={b.company!.name} logoUrl={b.company!.logoUrl} size={28} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{b.company!.name}</span>
                    <span className="figure text-xs text-muted-foreground">
                      {b.company!.totalQuestions} questions
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {sheetBookmarks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">Sheets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {sheetBookmarks.map((b) => (
                  <Link
                    key={b.id}
                    href={`/sheets/${b.sheet!.slug}`}
                    className="block rounded-xl p-2.5 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    {b.sheet!.title}
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
