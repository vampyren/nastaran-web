/**
 * Ambient "ॐ शान्ति" (Om Shanti — peace) column on the left edge.
 * Ported from the old project's ornament theme. Visible at xl+ only.
 * No interactivity; aria-hidden.
 */
export default function SanskritColumn({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={[
        "pointer-events-none fixed left-3.5 top-1/2 z-[5] hidden -translate-y-[46%] flex-col items-center gap-3.5 text-accent-deep opacity-[0.82] xl:flex",
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      <span
        className="leading-none text-accent-deep"
        style={{ fontFamily: "var(--font-deva)", fontSize: "56px" }}
      >
        ॐ
      </span>
      <span
        aria-hidden
        className="h-14 w-px"
        style={{
          background:
            "linear-gradient(to bottom, transparent, var(--color-accent-deep), transparent)",
          opacity: 0.5,
        }}
      />
      <span
        className="tracking-[0.04em]"
        style={{
          fontFamily: "var(--font-deva)",
          fontSize: "28px",
          writingMode: "vertical-rl",
          textOrientation: "mixed",
        }}
      >
        शान्ति
      </span>
      <span
        aria-hidden
        className="h-14 w-px"
        style={{
          background:
            "linear-gradient(to bottom, transparent, var(--color-accent-deep), transparent)",
          opacity: 0.5,
        }}
      />
      <span
        className="text-ink-muted text-[11px] uppercase"
        style={{
          writingMode: "vertical-rl",
          letterSpacing: "0.22em",
        }}
      >
        Shanti · Fred
      </span>
    </div>
  );
}
