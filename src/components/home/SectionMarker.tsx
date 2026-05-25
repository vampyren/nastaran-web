import LotusRosette from "@/components/motifs/LotusRosette";

type Tone = "default" | "dark";

type Props = {
  number: string;
  label: string;
  /** "dark" for aubergine sections; "default" for paper/sandalwood. */
  tone?: Tone;
  className?: string;
};

const TONES: Record<Tone, { text: string; lotus: string }> = {
  default: { text: "text-accent-deep", lotus: "text-copper" },
  dark: { text: "text-paper", lotus: "text-marigold" },
};

/**
 * Single consistent section marker used across the Home page sections.
 * Renders: 🪷 NN / LABEL — small caps, copper lotus, accent-deep text.
 * On dark sections, switches to paper + marigold lotus.
 */
export default function SectionMarker({
  number,
  label,
  tone = "default",
  className,
}: Props) {
  const t = TONES[tone];
  return (
    <p
      className={[
        "inline-flex items-center gap-2 text-eyebrow uppercase tracking-[0.075em] tabular-nums font-semibold",
        t.text,
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      <LotusRosette className={`h-3.5 w-3.5 ${t.lotus}`} />
      <span>{number}</span>
      <span aria-hidden>/</span>
      <span>{label}</span>
    </p>
  );
}
