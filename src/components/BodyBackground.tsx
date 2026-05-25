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
          z-55 sits above main content (z-1) and below the menu (z-60). */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-[55] h-[124px]"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--color-paper) 98%, white) 0%, color-mix(in srgb, var(--color-paper) 94%, white) 58%, color-mix(in srgb, var(--color-paper) 72%, transparent) 84%, transparent 100%)",
          backdropFilter: "blur(18px) saturate(1.05)",
          WebkitBackdropFilter: "blur(18px) saturate(1.05)",
        }}
      />
    </>
  );
}
