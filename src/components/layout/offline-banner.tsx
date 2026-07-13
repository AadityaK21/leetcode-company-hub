"use client";

import * as React from "react";
import { WifiOff } from "lucide-react";

/** Slides in when the connection drops; TanStack Query resyncs on reconnect. */
export function OfflineBanner() {
  const [offline, setOffline] = React.useState(false);

  React.useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    setOffline(!navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-xs font-medium text-amber-950"
    >
      <WifiOff className="size-3.5" />
      You&apos;re offline — actions will sync when the connection returns.
    </div>
  );
}
