import { Card, CardContent } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/shared/animated-number";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  iconClassName,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  iconClassName?: string;
}) {
  return (
    <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="eyebrow">{label}</p>
          <Icon className={iconClassName ?? "size-4 text-muted-foreground"} />
        </div>
        <p className="figure mt-2 font-display text-3xl font-semibold">
          {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
        </p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
