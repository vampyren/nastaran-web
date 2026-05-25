/**
 * Top frost layer that sits behind the floating nav pill. Softly blurs
 * page content scrolling into the top header zone and fades to transparent
 * via mask-image so it never reads as a rectangular glass strip.
 *
 * z:40 — below the nav pill (z:50), above main content (z:1).
 */
export default function HeaderFrost() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[104px] bg-paper/35 backdrop-blur-xl lg:h-[132px] [mask-image:linear-gradient(to_bottom,black_0%,black_58%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_58%,transparent_100%)]"
    />
  );
}
