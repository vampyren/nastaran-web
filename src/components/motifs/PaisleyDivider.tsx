/**
 * Decorative horizontal paisley + lotus divider between sections.
 * Subtle ornament, accent-deep color, low opacity.
 */
export default function PaisleyDivider({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={[
        "mx-auto w-[min(80vw,720px)] py-1.5 text-accent opacity-[0.55]",
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      <svg
        aria-hidden
        viewBox="0 0 320 24"
        preserveAspectRatio="none"
        className="h-[22px] w-full"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      >
        <path d="M4 12h112" />
        <path d="M204 12h112" />
        <path d="M122 12c8-10 22-10 30 0s22 10 30 0" />
        <circle cx="152" cy="12" r="2.4" fill="currentColor" stroke="none" />
        <path d="M140 12c0-6 4-10 9-10M164 12c0-6-4-10-9-10" />
      </svg>
    </div>
  );
}
