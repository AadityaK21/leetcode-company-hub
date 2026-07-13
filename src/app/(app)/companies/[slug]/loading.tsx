import { Skeleton } from "@/components/ui/skeleton";

/** Instant skeleton while a company page loads. */
export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-border/70 bg-card p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
      <Skeleton className="h-12 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}
