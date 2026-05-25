type Props = {
  className?: string;
};

export default function BootiField({ className }: Props) {
  return (
    <svg
      aria-hidden
      className={`pointer-events-none ${className ?? ""}`.trim()}
      viewBox="0 0 200 420"
      preserveAspectRatio="none"
      fill="currentColor"
    >
      <defs>
        <pattern id="booti" width="30" height="30" patternUnits="userSpaceOnUse">
          <circle cx="6" cy="6" r="1.7" />
          <circle cx="21" cy="21" r="1.2" />
          <path d="M15 5c3 3.6 3 7 0 10-3-3-3-6.4 0-10Z" />
        </pattern>
        <linearGradient id="bootiFade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopOpacity="0" />
          <stop offset="0.16" stopOpacity="1" />
          <stop offset="0.84" stopOpacity="1" />
          <stop offset="1" stopOpacity="0" />
        </linearGradient>
        <mask id="bootiMask">
          <rect width="200" height="420" fill="url(#bootiFade)" />
        </mask>
      </defs>
      <rect width="200" height="420" fill="url(#booti)" mask="url(#bootiMask)" />
    </svg>
  );
}
