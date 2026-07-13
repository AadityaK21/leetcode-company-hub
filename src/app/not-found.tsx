import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="figure font-display text-7xl font-semibold text-lime">404</p>
      <h1 className="font-display text-2xl font-semibold">Page not found</h1>
      <p className="max-w-sm text-muted-foreground">
        This route doesn&apos;t exist — maybe the company or problem slug changed after a data sync.
      </p>
      <Button asChild variant="lime">
        <Link href="/">Back home</Link>
      </Button>
    </div>
  );
}
