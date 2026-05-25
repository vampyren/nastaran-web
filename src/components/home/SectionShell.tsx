import type { ReactNode } from "react";
import SectionClose from "@/components/motifs/SectionClose";
import Reveal from "@/components/ui/Reveal";
import SectionMarker from "@/components/home/SectionMarker";
import {
  EYEBROW,
  HAIRLINE_GRADIENT,
  SECTION_PADDING,
  SECTION_WIDTH,
} from "@/lib/layout";

type Tone = "paper" | "sandalwood" | "aubergine";

type Props = {
  id: string;
  headingId: string;
  numeral: string;
  label: string;
  prelude?: string;
  heading: string;
  pullQuote?: string;
  body?: string;
  tone?: Tone;
  children?: ReactNode;
  showClose?: boolean;
};

const TONE_BG: Record<Tone, string> = {
  paper: "",
  sandalwood:
    "bg-sandalwood bg-[linear-gradient(180deg,rgba(255,255,255,0.16),transparent_34%)] border-y border-hairline-warm",
  aubergine:
    "bg-aubergine bg-[radial-gradient(circle_at_90%_10%,rgba(216,154,78,0.14),transparent_30vw),radial-gradient(circle_at_8%_90%,rgba(138,106,165,0.18),transparent_34vw)] text-[#eadff0]",
};

const HAIRLINE_TONE: Record<Tone, string> = {
  paper: HAIRLINE_GRADIENT,
  sandalwood:
    "h-px w-full bg-[linear-gradient(90deg,var(--color-copper),var(--color-hairline-warm)_38%,transparent)]",
  aubergine:
    "h-px w-full bg-[linear-gradient(90deg,var(--color-marigold),rgba(255,255,255,0.18),transparent)]",
};

const HEADING_TONE: Record<Tone, string> = {
  paper: "text-ink",
  sandalwood: "text-ink",
  aubergine: "text-paper",
};

const BODY_TONE: Record<Tone, string> = {
  paper: "text-ink-muted",
  sandalwood: "text-ink-muted",
  aubergine: "text-[#eadff0]",
};

const PULL_TONE: Record<Tone, string> = {
  paper: "text-ink",
  sandalwood: "text-ink",
  aubergine: "text-paper",
};

export default function SectionShell({
  id,
  headingId,
  numeral,
  label,
  prelude,
  heading,
  pullQuote,
  body,
  tone = "paper",
  children,
  showClose = true,
}: Props) {
  const markerTone = tone === "aubergine" ? "dark" : "default";
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={`relative scroll-mt-[76px] ${SECTION_PADDING} ${TONE_BG[tone]}`}
    >
      <div className={SECTION_WIDTH}>
        <SectionMarker number={numeral} label={label} tone={markerTone} className="mb-3" />
        <div aria-hidden className={`mb-6 ${HAIRLINE_TONE[tone]}`} />
        <Reveal>
          {prelude ? (
            <p
              className={`mb-4 ${EYEBROW} ${markerTone === "dark" ? "text-paper" : "text-accent-deep"}`}
            >
              {prelude}
            </p>
          ) : null}
          <h2
            id={headingId}
            className={`mb-4 font-serif font-medium tracking-[-0.018em] text-balance text-h2 leading-[var(--text-h2--line-height)] md:text-h2-md md:leading-[var(--text-h2-md--line-height)] ${HEADING_TONE[tone]}`}
          >
            {heading}
          </h2>
          {pullQuote ? (
            <p
              className={`mb-4 max-w-[580px] font-serif italic font-normal tracking-[-0.005em] text-pull leading-[var(--text-pull--line-height)] ${PULL_TONE[tone]}`}
            >
              {pullQuote}
            </p>
          ) : null}
          {body ? (
            <p
              className={`max-w-[600px] text-body leading-[var(--text-body--line-height)] ${BODY_TONE[tone]}`}
            >
              {body}
            </p>
          ) : null}
          {children}
        </Reveal>
        {showClose ? (
          <SectionClose
            className="mt-9"
            tone={tone === "aubergine" ? "dark" : tone === "sandalwood" ? "warm" : "default"}
          />
        ) : null}
      </div>
    </section>
  );
}
