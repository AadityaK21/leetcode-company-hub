"use client";

import * as React from "react";

/**
 * Applies stored user preferences (accent, font size, reduced motion) to the
 * document root. Rendered by the app layout with server-loaded settings.
 */
export function PreferencesApplier({
  accent,
  fontSize,
  reducedMotion,
}: {
  accent: string;
  fontSize: string;
  reducedMotion: boolean;
}) {
  React.useEffect(() => {
    const root = document.documentElement;
    if (accent && accent !== "lime") root.dataset.accent = accent;
    else delete root.dataset.accent;

    if (fontSize && fontSize !== "md") root.dataset.fontsize = fontSize;
    else delete root.dataset.fontsize;

    root.classList.toggle("app-reduce-motion", reducedMotion);

    return () => {
      delete root.dataset.accent;
      delete root.dataset.fontsize;
      root.classList.remove("app-reduce-motion");
    };
  }, [accent, fontSize, reducedMotion]);

  return null;
}
