import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  easy: number;
  medium: number;
  hard: number;
  className?: string;
}

/**
 * The product's signature element: a segmented spectrum bar showing the
 * difficulty makeup of any set of questions at a glance.
 */
export function DifficultySpectrum({ easy, medium, hard, className }: Props) {
  const total = Math.max(1, easy + medium + hard);
  const seg = (n: number) => `${Math.max(n > 0 ? 2 : 0, (n / total) * 100)}%`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn("flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full", className)}
          role="img"
          aria-label={`${easy} easy, ${medium} medium, ${hard} hard`}
        >
          <div className="rounded-full bg-emerald-500" style={{ width: seg(easy) }} />
          <div className="rounded-full bg-amber-500" style={{ width: seg(medium) }} />
          <div className="rounded-full bg-rose-500" style={{ width: seg(hard) }} />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <span className="figure">{easy}E · {medium}M · {hard}H</span>
      </TooltipContent>
    </Tooltip>
  );
}
