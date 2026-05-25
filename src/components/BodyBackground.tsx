/**
 * Page background: the 4-layer gradient + faint dot pattern + top blur veil.
 * Replaces old body::before / body::after pseudo-elements. Forced-colors-safe.
 */
export default function BodyBackground() {
  return (
    <>
      {/* Page gradient */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: "var(--bg-page)" }}
      />
      {/* Dot pattern overlay — hidden under forced-colors */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.18] forced-colors:hidden"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(138,106,165,0.18) 1.2px, transparent 1.4px), radial-gradient(circle, rgba(183,127,80,0.13) 1px, transparent 1.3px)",
          backgroundPosition: "0 0, 18px 18px",
          backgroundSize: "36px 36px",
          maskImage:
            "linear-gradient(to bottom, black, black 20%, transparent 62%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black, black 20%, transparent 62%)",
        }}
      />
      {/* Top blur veil — frosts content scrolling past the floating menu pill.
          z-55 sits above main content (z-1) and below the menu (z-60).
          Width matches the menu pill (≤ 1180px frame). Height ends just past
          the menu bottom. Mask fades the whole element (incl. backdrop blur)
          so text immediately below the menu stays sharp. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-[55] flex justify-center"
      >
        <div
          className="h-[72px] w-[min(calc(100%-32px),1180px)] md:h-[80px] lg:h-[88px]"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--color-paper) 96%, white), color-mix(in srgb, var(--color-paper) 88%, white))",
            backdropFilter: "blur(18px) saturate(1.05)",
            WebkitBackdropFilter: "blur(18px) saturate(1.05)",
            maskImage:
              "linear-gradient(180deg, black, black 55%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(180deg, black, black 55%, transparent 100%)",
          }}
        />
      </div>
    </>
  );
}
