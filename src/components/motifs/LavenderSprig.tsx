type Props = {
  className?: string;
};

// Exported for MS2+ usage. Not rendered on any MS1 route.
export default function LavenderSprig({ className }: Props) {
  const buds = [
    [74, 52],
    [96, 74],
    [66, 92],
    [108, 112],
    [58, 132],
    [118, 154],
    [52, 176],
    [108, 200],
  ] as const;

  return (
    <svg aria-hidden className={className} viewBox="0 0 180 300">
      <path
        d="M105 34C82 94 78 160 102 266"
        fill="none"
        stroke="color-mix(in srgb, var(--color-copper) 66%, var(--color-accent-deep))"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M91 210c-23 7-38 22-45 45 26-2 42-15 51-39"
        fill="none"
        stroke="color-mix(in srgb, var(--color-copper) 66%, var(--color-accent-deep))"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M104 180c23 2 41 13 53 33-25 4-43-5-57-27"
        fill="none"
        stroke="color-mix(in srgb, var(--color-copper) 66%, var(--color-accent-deep))"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {buds.map(([cx, cy], index) => (
        <ellipse
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          rx={10 - (index % 2)}
          ry="17"
          transform={`rotate(${index % 2 === 0 ? -35 : 34} ${cx} ${cy})`}
          fill="color-mix(in srgb, var(--color-accent) 74%, white)"
          stroke="color-mix(in srgb, var(--color-accent-deep) 62%, transparent)"
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}
