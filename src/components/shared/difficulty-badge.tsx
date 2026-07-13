import { Badge } from "@/components/ui/badge";
import { DIFFICULTY_LABEL } from "@/lib/utils";
import type { Difficulty } from "@prisma/client";

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const variant = difficulty === "EASY" ? "easy" : difficulty === "MEDIUM" ? "medium" : "hard";
  return <Badge variant={variant}>{DIFFICULTY_LABEL[difficulty]}</Badge>;
}
