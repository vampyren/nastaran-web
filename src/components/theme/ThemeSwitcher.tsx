"use client";

import { useEffect, useRef, useState } from "react";
import { THEMES, THEME_META, useTheme } from "./ThemeContext";

/**
 * Compact floating theme selector — bottom-right of the viewport. Reads + sets
 * the active theme via the ThemeContext. Swedish labels and short hints.
 */
export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const activeLabel = THEME_META[theme].label;

  return (
    <div
      ref={wrapperRef}
      className="pointer-events-none fixed bottom-4 right-4 z-50 max-[640px]:bottom-3 max-[640px]:right-3"
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Välj tema"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-hairline bg-[color-mix(in_srgb,var(--color-paper)_92%,white)] px-4 py-2.5 text-eyebrow uppercase tracking-[0.075em] tabular-nums font-semibold text-ink shadow-rail backdrop-blur-md transition-transform duration-200 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-[14px] w-[14px] text-copper"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3a9 9 0 0 0 0 18" />
          <circle cx="7" cy="9" r="1.2" fill="currentColor" />
          <circle cx="9" cy="15" r="1.2" fill="currentColor" />
          <circle cx="14" cy="6" r="1.2" fill="currentColor" />
        </svg>
        <span>Tema · {activeLabel}</span>
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Tema-väljare"
          className="pointer-events-auto absolute bottom-[calc(100%+10px)] right-0 w-[260px] overflow-hidden rounded-[18px] border border-hairline bg-[color-mix(in_srgb,var(--color-paper)_98%,white)] p-1.5 shadow-card backdrop-blur-md"
        >
          {THEMES.map((id) => {
            const meta = THEME_META[id];
            const active = theme === id;
            return (
              <button
                key={id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setTheme(id);
                  setOpen(false);
                }}
                className={`grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
                  active
                    ? "bg-[color-mix(in_srgb,var(--color-lavender)_50%,white)]"
                    : "hover:bg-[color-mix(in_srgb,var(--color-lavender)_30%,white)]"
                }`}
              >
                <span
                  aria-hidden
                  className="flex h-7 w-[40px] overflow-hidden rounded-[8px] border border-hairline"
                >
                  {meta.swatches.map((color, idx) => (
                    <span
                      key={idx}
                      className="flex-1"
                      style={{ background: color }}
                    />
                  ))}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-2 font-serif text-[15px] leading-none text-ink">
                    {meta.label}
                    {active ? (
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 rounded-full bg-accent-deep"
                      />
                    ) : null}
                  </span>
                  <span className="mt-1 truncate text-[11px] uppercase tracking-[0.075em] text-ink-muted">
                    {meta.hint}
                  </span>
                </span>
              </button>
            );
          })}
          <p className="mx-2 mb-1 mt-1.5 text-[11px] leading-[1.5] text-ink-muted">
            Välj <strong className="font-semibold text-ink">Nuvarande</strong>{" "}
            för det nuvarande utseendet. Övriga teman lägger till indiska motiv
            på olika sätt.
          </p>
        </div>
      ) : null}
    </div>
  );
}
