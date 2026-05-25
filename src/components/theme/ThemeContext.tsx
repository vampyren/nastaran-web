"use client";

import { useCallback, useSyncExternalStore } from "react";

export const THEMES = ["nuvarande", "ornament", "elementen", "bage"] as const;
export type ThemeId = (typeof THEMES)[number];

export const DEFAULT_THEME: ThemeId = "nuvarande";
export const THEME_STORAGE_KEY = "nastaran-theme";

export const THEME_META: Record<
  ThemeId,
  { label: string; hint: string; swatches: [string, string, string] }
> = {
  nuvarande: {
    label: "Nuvarande",
    hint: "Det nuvarande utseendet",
    swatches: ["#ead8f4", "#8a6aa5", "#b77f50"],
  },
  ornament: {
    label: "Ornament",
    hint: "Mandala · paisley · sanskrit",
    swatches: ["#e6d5ee", "#6b4d87", "#f4eaf8"],
  },
  elementen: {
    label: "Elementen",
    hint: "Pancha Mahabhuta · de fem elementen",
    swatches: ["#f4eaf8", "#d89a4e", "#b77f50"],
  },
  bage: {
    label: "Båge",
    hint: "Jharokha · arkitektonisk båge",
    swatches: ["#ead8f4", "#2a1b35", "#8a6aa5"],
  },
};

function isTheme(value: unknown): value is ThemeId {
  return (
    typeof value === "string" &&
    (THEMES as readonly string[]).includes(value)
  );
}

/**
 * The active theme lives outside React in `document.documentElement.dataset.theme`
 * so that the inline boot script can set it before hydration. We subscribe to
 * changes via a tiny listener list and expose the value through
 * `useSyncExternalStore` — this is React's recommended pattern for reading
 * from a non-React source while keeping hydration consistent.
 */
let listeners: Array<() => void> = [];

function subscribe(cb: () => void) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

function getSnapshot(): ThemeId {
  if (typeof document === "undefined") return DEFAULT_THEME;
  const v = document.documentElement.dataset.theme;
  return isTheme(v) ? v : DEFAULT_THEME;
}

function getServerSnapshot(): ThemeId {
  return DEFAULT_THEME;
}

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setTheme = useCallback((next: ThemeId) => {
    if (!isTheme(next)) return;
    if (typeof document !== "undefined") {
      if (next === DEFAULT_THEME) {
        delete document.documentElement.dataset.theme;
      } else {
        document.documentElement.dataset.theme = next;
      }
    }
    try {
      if (next === DEFAULT_THEME) {
        window.localStorage.removeItem(THEME_STORAGE_KEY);
      } else {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      }
    } catch {
      /* ignore — private mode, quota, etc. */
    }
    listeners.forEach((l) => l());
  }, []);

  return { theme, setTheme };
}
