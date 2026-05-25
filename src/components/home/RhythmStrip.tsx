import LotusRosette from "@/components/motifs/LotusRosette";
import SectionClose from "@/components/motifs/SectionClose";
import Reveal from "@/components/ui/Reveal";
import SectionMarker from "@/components/home/SectionMarker";
import { home } from "@/content/home";

const { rhythm } = home;

export default function RhythmStrip() {
  return (
    <section
      id={rhythm.sectionId}
      aria-labelledby={rhythm.headingId}
      className="relative z-[1] scroll-mt-[76px] border-y border-hairline-warm bg-[radial-gradient(circle_at_20%_10%,rgba(138,106,165,0.08),transparent_34vw),linear-gradient(135deg,var(--color-sandalwood),#fbf3ea)] px-5 py-16 sm:px-6 md:px-7 lg:py-[86px]"
    >
      <div className="mx-auto w-[min(100%,680px)] text-center">
        <Reveal>
          <div className="flex justify-center">
            <SectionMarker number={rhythm.numeral} label={rhythm.label} />
          </div>
          <h2
            id={rhythm.headingId}
            className="mt-3 font-serif font-medium tracking-[-0.018em] text-balance text-ink text-h2 leading-[var(--text-h2--line-height)] md:text-h2-md md:leading-[var(--text-h2-md--line-height)]"
          >
            {rhythm.heading}
          </h2>
          <div
            aria-label={rhythm.wordsAriaLabel}
            className="my-7 grid gap-3.5 font-serif italic text-ink text-rhythm leading-[var(--text-rhythm--line-height)] md:flex md:items-center md:justify-center md:gap-4 md:text-rhythm-md md:leading-[var(--text-rhythm-md--line-height)]"
          >
            {rhythm.words.map((word, index) => (
              <div
                key={word}
                className="inline-flex items-center justify-center gap-3.5 md:gap-4"
              >
                <span>{word}</span>
                {index < rhythm.words.length - 1 ? (
                  <LotusRosette className="h-4 w-4 text-copper" />
                ) : null}
              </div>
            ))}
          </div>
          <p className="mx-auto max-w-[520px] text-body leading-[var(--text-body--line-height)] text-ink-muted">
            {rhythm.body}
          </p>
          <div className="mt-9 flex justify-center">
            <SectionClose tone="warm" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
