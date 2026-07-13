"use client";

import * as React from "react";
import { useReducedMotion } from "framer-motion";
import { formatNumber } from "@/lib/utils";

/** Counts up to `value` on mount. Falls back to a static number for reduced motion. */
export function AnimatedNumber({ value, format = true }: { value: number; format?: boolean }) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = React.useState(reduceMotion ? value : 0);

  React.useEffect(() => {
    if (reduceMotion) {
      setDisplay(value);
      return;
    }
    const duration = 700;
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(Math.round(value * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduceMotion]);

  return <>{format ? formatNumber(display) : display}</>;
}
