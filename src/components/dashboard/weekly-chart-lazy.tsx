"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/** recharts is heavy — load it only on the client, only when needed. */
export const WeeklyChartLazy = dynamic(
  () => import("@/components/dashboard/weekly-chart").then((m) => m.WeeklyChart),
  { ssr: false, loading: () => <Skeleton className="h-40 w-full rounded-xl" /> }
);
