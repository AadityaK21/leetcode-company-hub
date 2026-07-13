import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

/**
 * Kicks off a data sync. On serverless hosting the full import exceeds
 * request timeouts, so the heavy lifting lives in `npm run db:import`
 * (run locally or in a background job/cron). This endpoint validates
 * admin access and reports how to run it, keeping the panel honest.
 */
export async function POST() {
  const user = await requireUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  return NextResponse.json({
    ok: true,
    message:
      "Run `npm run db:import` from the project root (or a scheduled job) to sync the latest repository snapshot. The import rebuilds company↔question links and denormalized stats.",
  });
}
