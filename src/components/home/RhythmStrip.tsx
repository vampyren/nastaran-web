import LotusRosette from "@/components/motifs/LotusRosette";
import SectionShell from "@/components/home/SectionShell";
import { home } from "@/content/home";

const { rhythm } = home;

/**
 * Section 03 — Rytm. Uses the shared SectionShell editorial spine.
 * Custom warm sandalwood + radial purple background passed via bgOverride.
 */
export default function RhythmStrip() {
  return (
    <SectionShell
      id={rhythm.sectionId}
      headingId={rhythm.headingId}
      numeral={rhythm.numeral}
      label={rhythm.label}
      heading={rhythm.heading}
      tone="sandalwood"
      bgOverride="bg-sandalwood bg-[radial-gradient(circle_at_20%_10%,rgba(138,106,165,0.08),transparent_34vw),linear-gradient(135deg,var(--color-sandalwood),#fbf3ea)] border-y border-hairline-warm"
    >
      <div
        aria-label={rhythm.wordsAriaLabel}
        className="my-7 flex flex-wrap items-center gap-3.5 font-serif italic text-ink text-rhythm leading-[var(--text-rhythm--line-height)] md:gap-4 md:text-rhythm-md md:leading-[var(--text-rhythm-md--line-height)]"
      >
        {rhythm.words.map((word, index) => (
          <div
            key={word}
            className="inline-flex items-center gap-3.5 md:gap-4"
          >
            <span>{word}</span>
            {index < rhythm.words.length - 1 ? (
              <LotusRosette className="h-4 w-4 text-copper" />
            ) : null}
          </div>
        ))}
      </div>
      <p className="max-w-[520px] text-body leading-[var(--text-body--line-height)] text-ink-muted">
        {rhythm.body}
      </p>
    </SectionShell>
  );
}
