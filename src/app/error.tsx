"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-display text-2xl font-semibold">Something went wrong</h1>
      <p className="max-w-sm text-muted-foreground">
        An unexpected error occurred. If the database hasn&apos;t been set up yet, run the migration
        and import steps from the README.
      </p>
      <Button onClick={reset} variant="lime">Try again</Button>
    </div>
  );
}
