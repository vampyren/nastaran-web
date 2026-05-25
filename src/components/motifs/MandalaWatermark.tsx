/**
 * Mandala watermark — concentric rings of dots / lines / petals.
 * Ported verbatim from the old project's SiteMotifs.tsx. Uses currentColor.
 */
type Props = {
  className?: string;
};

type RingType = "petal" | "dot" | "line";

function ring(radius: number, count: number, type: RingType) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const angle = (i * 360) / count;
    if (type === "petal") {
      items.push(
        <path
          key={`${radius}-p-${i}`}
          d={`M0 ${-radius} C${radius * 0.18} ${-radius - radius * 0.32} ${radius * 0.18} ${-radius - radius * 0.62} 0 ${-radius - radius * 0.78} C${-radius * 0.18} ${-radius - radius * 0.62} ${-radius * 0.18} ${-radius - radius * 0.32} 0 ${-radius}Z`}
          transform={`rotate(${angle})`}
        />,
      );
    } else if (type === "dot") {
      items.push(
        <circle
          key={`${radius}-d-${i}`}
          cx={0}
          cy={-radius}
          r={1.6}
          transform={`rotate(${angle})`}
        />,
      );
    } else {
      items.push(
        <line
          key={`${radius}-l-${i}`}
          x1={0}
          y1={-radius + 4}
          x2={0}
          y2={-radius - 14}
          transform={`rotate(${angle})`}
        />,
      );
    }
  }
  return items;
}

export default function MandalaWatermark({ className }: Props) {
  return (
    <svg
      aria-hidden
      viewBox="-220 -220 440 440"
      className={className}
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.1">
        <circle r="36" />
        <circle r="62" />
        <circle r="98" />
        <circle r="142" />
        <circle r="188" />
        {ring(98, 16, "line")}
        {ring(142, 24, "line")}
      </g>
      <g fill="currentColor" stroke="none">
        <circle r="6" />
        {ring(62, 12, "dot")}
        {ring(188, 32, "dot")}
      </g>
      <g fill="currentColor" stroke="none" fillOpacity="0.9">
        {ring(36, 8, "petal")}
        {ring(98, 16, "petal")}
      </g>
    </svg>
  );
}
