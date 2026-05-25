/**
 * Top frost layer that sits behind the floating nav pill. Softly blurs
 * page content scrolling into the top header zone, fading to transparent
 * via Tailwind v4 mask utilities so it never reads as a rectangular strip.
 *
 * z:40 — below nav pill (z:50), above main content (z:1).
 */
export default function HeaderFrost() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[112px] bg-paper/45 backdrop-blur-2xl mask-b-from-55% mask-b-to-100% lg:h-[132px]"
    />
  );
}
