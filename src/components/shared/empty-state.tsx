import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("glass flex flex-col items-center gap-3 rounded-2xl px-6 py-16 text-center", className)}>
      <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <p className="font-display font-semibold">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}
