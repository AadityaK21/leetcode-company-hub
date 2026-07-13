import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { GitCompareArrows } from "lucide-react";
import { CompanyExplorer } from "@/components/companies/company-explorer";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Companies — CompanyHub" };
export const revalidate = 300;

export default async function CompaniesPage() {
  const companies = await prisma.company.findMany({
    orderBy: { totalQuestions: "desc" },
    select: {
      slug: true,
      name: true,
      logoUrl: true,
      totalQuestions: true,
      easyCount: true,
      mediumCount: true,
      hardCount: true,
      topFrequency: true,
    },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Explorer"
        title="Companies"
        description={`${companies.length} companies with real interview question data.`}
        actions={
          <Button asChild variant="outline">
            <Link href="/compare">
              <GitCompareArrows /> Compare
            </Link>
          </Button>
        }
      />
      <Suspense>
        <CompanyExplorer companies={companies} />
      </Suspense>
    </div>
  );
}
