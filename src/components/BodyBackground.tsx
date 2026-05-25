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
          Bounded to the page frame (≤ 1180px). Radial-gradient mask fades the
          element on all four sides so it reads as a soft halo behind the menu
          pill, not a visible rectangle. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-[55] flex justify-center"
      >
        <div
          className="h-[72px] w-[min(calc(100%-32px),1180px)] md:h-[80px] lg:h-[88px]"
          style={{
            background: "color-mix(in srgb, var(--color-paper) 90%, white)",
            backdropFilter: "blur(16px) saturate(1.05)",
            WebkitBackdropFilter: "blur(16px) saturate(1.05)",
            maskImage:
              "radial-gradient(ellipse 92% 85% at center 30%, black 60%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 92% 85% at center 30%, black 60%, transparent 100%)",
          }}
        />
      </div>
    </>
  );
}
