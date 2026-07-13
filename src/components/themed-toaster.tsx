"use client";

import { useTheme } from "next-themes";
import { Toaster } from "sonner";

/** Sonner wired to next-themes so toasts never render black-on-dark. */
export function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      richColors
      closeButton
      position="bottom-right"
      toastOptions={{
        classNames: { toast: "rounded-2xl font-sans" },
      }}
    />
  );
}
