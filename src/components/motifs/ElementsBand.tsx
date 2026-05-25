"use client";

import { useTheme } from "@/components/theme/ThemeContext";

const ELEMENTS = [
  { sv: "Jord", sa: "पृथ्वी", romanised: "Prithvi", line: "Grundande närvaro" },
  { sv: "Vatten", sa: "जल", romanised: "Jal", line: "Mjuk rörelse" },
  { sv: "Eld", sa: "अग्नि", romanised: "Agni", line: "Värme och liv" },
  { sv: "Luft", sa: "वायु", romanised: "Vayu", line: "Andning och rymd" },
  { sv: "Eter", sa: "आकाश", romanised: "Akasha", line: "Stillhet bortom" },
] as const;

type ElementKind = (typeof ELEMENTS)[number]["romanised"];

function ElementGlyph({ kind }: { kind: ElementKind }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (kind) {
    case "Prithvi":
      return (
        <svg viewBox="0 0 48 48" aria-hidden className="h-full w-full">
          <circle cx="24" cy="24" r="16" {...common} />
          <path d="M8 24h32M24 8v32" {...common} />
        </svg>
      );
    case "Jal":
      return (
        <svg viewBox="0 0 48 48" aria-hidden className="h-full w-full">
          <path
            d="M24 6c8 11 12 18 12 24a12 12 0 1 1-24 0c0-6 4-13 12-24Z"
            {...common}
          />
        </svg>
      );
    case "Agni":
      return (
        <svg viewBox="0 0 48 48" aria-hidden className="h-full w-full">
          <path
            d="M24 6c2 8 10 10 10 19a10 10 0 1 1-20 0c0-5 4-6 6-12 1-3 2-5 4-7Z"
            {...common}
          />
          <path
            d="M24 24c1 4 4 5 4 9a4 4 0 1 1-8 0c0-3 2-5 4-9Z"
            {...common}
          />
        </svg>
      );
    case "Vayu":
      return (
        <svg viewBox="0 0 48 48" aria-hidden className="h-full w-full">
          <path
            d="M6 16c4-4 12-4 16 0s12 4 16 0M6 26c4-4 12-4 16 0s12 4 16 0M10 36c3-3 9-3 12 0"
            {...common}
          />
        </svg>
      );
    case "Akasha":
      return (
        <svg viewBox="0 0 48 48" aria-hidden className="h-full w-full">
          <circle cx="24" cy="24" r="14" {...common} />
          <circle cx="24" cy="24" r="6" {...common} />
          <path
            d="M24 4v6M24 38v6M4 24h6M38 24h6M10 10l4 4M34 34l4 4M10 38l4-4M34 14l4-4"
            {...common}
          />
        </svg>
      );
  }
}

const DEVA_FONT = '"Noto Sans Devanagari", "Sanskrit Text", "Mangal", serif';

/**
 * Pancha Mahabhuta band — Ayurveda's five elements.
 * Rendered only when the active theme is "elementen". Otherwise null.
 */
export default function ElementsBand() {
  const { theme } = useTheme();
  if (theme !== "elementen") return null;

  return (
    <aside
      aria-label="Ayurvedas fem element"
      className="relative mx-auto my-6 max-w-[1240px] border-y border-hairline px-5 pb-[72px] pt-14 sm:px-6 lg:px-[64px]"
      style={{
        background:
          "radial-gradient(circle at 50% 0, rgba(216, 154, 78, 0.10), transparent 65%), linear-gradient(180deg, color-mix(in srgb, var(--color-paper) 92%, var(--color-marigold) 8%), var(--color-paper))",
      }}
    >
      <header className="mx-auto mb-9 max-w-[720px] text-center">
        <span className="mb-3 inline-block text-eyebrow uppercase tracking-[0.22em] text-copper">
          Pancha Mahabhuta
        </span>
        <h2 className="mb-3 font-serif text-[clamp(26px,3.2vw,38px)] leading-[1.15] text-ink">
          De fem element vi rör vid i rummet
        </h2>
        <p className="text-[16px] leading-[1.65] text-ink-muted">
          Indisk healing vilar på fem grundelement — jord, vatten, eld, luft och
          eter. De återspeglas i tempot, ljuset och beröringen under varje
          behandling.
        </p>
      </header>
      <ol className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-5 lg:gap-[clamp(12px,1.6vw,22px)]">
        {ELEMENTS.map((el) => (
          <li
            key={el.romanised}
            className="flex flex-col items-center rounded-[18px] border border-hairline px-4 pb-7 pt-6 text-center transition-transform duration-200 hover:-translate-y-px hover:shadow-card"
            style={{
              background: "color-mix(in srgb, white 64%, var(--color-paper) 36%)",
            }}
          >
            <span className="mb-3.5 block h-[52px] w-[52px] text-copper">
              <ElementGlyph kind={el.romanised} />
            </span>
            <span
              aria-hidden
              className="mb-1.5 text-[22px] leading-none text-accent-deep"
              style={{ fontFamily: DEVA_FONT }}
            >
              {el.sa}
            </span>
            <span className="font-serif text-[20px] leading-none text-ink">
              {el.sv}
            </span>
            <span className="mb-2 mt-2 text-[11px] uppercase tracking-[0.18em] text-copper">
              {el.romanised}
            </span>
            <span className="text-[13px] leading-[1.55] text-ink-muted">
              {el.line}
            </span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
