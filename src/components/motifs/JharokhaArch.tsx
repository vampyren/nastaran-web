/**
 * Jharokha — multi-cusp Indian palace window arch.
 * Ported verbatim from the old project's SiteMotifs.tsx. Uses currentColor.
 */
type Props = {
  className?: string;
};

export default function JharokhaArch({ className }: Props) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 400 560"
      preserveAspectRatio="xMidYMid meet"
      className={className}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* outer arch with multi-cusp top */}
        <path d="
          M28 540
          L28 240
          C28 168 60 116 110 96
          C140 70 170 50 200 50
          C230 50 260 70 290 96
          C340 116 372 168 372 240
          L372 540
        " />
        {/* cusped inner trim */}
        <path
          d="
            M52 240
            C52 178 78 132 122 116
            C146 96 172 80 200 80
            C228 80 254 96 278 116
            C322 132 348 178 348 240
          "
          strokeOpacity="0.6"
        />
        {/* inner pointed cusps along the arch */}
        <path
          d="
            M80 220
            q14 -22 30 0
            q14 -22 30 0
            q14 -22 30 0
            q14 -22 30 0
            q14 -22 30 0
            q14 -22 30 0
            q14 -22 30 0
          "
          strokeOpacity="0.4"
        />
        {/* base capitals */}
        <path d="M22 256h14M364 256h14" />
        <path d="M22 246h14M364 246h14" strokeOpacity="0.55" />
        {/* lotus key at apex */}
        <path
          d="M200 38c6 8 6 16 0 24-6-8-6-16 0-24Z"
          fill="currentColor"
          stroke="none"
          fillOpacity="0.55"
        />
        <circle cx="200" cy="50" r="2.4" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}
