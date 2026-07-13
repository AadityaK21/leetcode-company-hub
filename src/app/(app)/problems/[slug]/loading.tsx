import { Skeleton } from "@/components/ui/skeleton";

/** Instant skeleton while a problem page loads. */
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-80 max-w-full" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}
