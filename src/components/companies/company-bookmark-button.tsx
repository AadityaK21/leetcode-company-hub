"use client";

import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuestionMutations } from "@/components/questions/use-question-mutations";

export function CompanyBookmarkButton({ companyId }: { companyId: string }) {
  const { toggleBookmark, guard } = useQuestionMutations();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => guard() && toggleBookmark.mutate({ companyId })}
      disabled={toggleBookmark.isPending}
    >
      <Bookmark /> Bookmark
    </Button>
  );
}
