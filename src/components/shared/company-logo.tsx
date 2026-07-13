"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function CompanyLogo({
  name,
  logoUrl,
  size = 40,
  className,
}: {
  name: string;
  logoUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (!logoUrl || failed) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl bg-primary font-display font-semibold text-primary-foreground",
          className
        )}
        style={{ width: size, height: size, fontSize: size * 0.35 }}
        aria-hidden
      >
        {initials}
      </div>
    );
  }

  return (
    <Image
      src={logoUrl}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={cn("shrink-0 rounded-xl bg-white object-contain p-1", className)}
      unoptimized
    />
  );
}
