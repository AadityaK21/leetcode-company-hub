import Link from "next/link";
import { ArrowUpRight, Layers } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const metadata = { title: "Study sheets — CompanyHub" };

export default async function SheetsPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const sheets = await prisma.studySheet.findMany({
    where: { isOfficial: true },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { questions: true } } },
  });

  const solvedBySheet: Record<string, number> = {};
  if (userId) {
    await Promise.all(
      sheets.map(async (sheet) => {
        solvedBySheet[sheet.id] = await prisma.progress.count({
          where: {
            userId,
            status: { in: ["SOLVED", "MASTERED"] },
            question: { sheetItems: { some: { sheetId: sheet.id } } },
          },
        });
      })
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Curated paths"
        title="Study sheets"
        description="Structured problem lists — Blind 75 plus topic sheets generated from real company frequency."
      />

      {sheets.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No sheets yet"
          description="Run `npm run db:seed` after the data import to create Blind 75 and the topic sheets."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sheets.map((sheet) => {
            const total = sheet._count.questions;
            const solved = solvedBySheet[sheet.id] ?? 0;
            const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
            return (
              <Link key={sheet.slug} href={`/sheets/${sheet.slug}`} className="group">
                <Card className="h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-display text-lg font-semibold group-hover:underline">
                        {sheet.title}
                      </p>
                      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">
                      {sheet.description}
                    </p>
                    <div className="mt-5">
                      <div className="figure mb-1.5 flex justify-between text-xs text-muted-foreground">
                        <span>
                          {userId ? `${solved} / ${total} solved` : `${total} questions`}
                        </span>
                        {userId && <span>{pct}%</span>}
                      </div>
                      <Progress value={pct} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
