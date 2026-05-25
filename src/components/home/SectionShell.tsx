import type { ReactNode } from "react";
import LotusRosette from "@/components/motifs/LotusRosette";
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
  /** Optional ornament rendered before prelude/heading (e.g. the big lotus on Kontakt). */
  leadOrnament?: ReactNode;
  /** Optional override for the background. If absent, derived from tone. */
  bgOverride?: string;
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

const RAIL_NUMERAL_TONE: Record<Tone, string> = {
  paper: "text-copper",
  sandalwood: "text-copper",
  aubergine: "text-paper",
};

const RAIL_LABEL_TONE: Record<Tone, string> = {
  paper: "text-ink-muted",
  sandalwood: "text-ink-muted",
  aubergine: "text-paper",
};

const RAIL_LOTUS_TONE: Record<Tone, string> = {
  paper: "text-copper",
  sandalwood: "text-copper",
  aubergine: "text-marigold",
};

const DIVIDER_TONE: Record<Tone, string> = {
  paper:
    "bg-[color-mix(in_srgb,var(--color-hairline)_72%,transparent)]",
  sandalwood:
    "bg-[color-mix(in_srgb,var(--color-hairline-warm)_72%,transparent)]",
  aubergine: "bg-white/15",
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
  leadOrnament,
  bgOverride,
  children,
  showClose = true,
}: Props) {
  const markerTone = tone === "aubergine" ? "dark" : "default";
  const preludeColor = markerTone === "dark" ? "text-paper" : "text-accent-deep";
  const sectionBg = bgOverride ?? TONE_BG[tone];

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={`relative scroll-mt-[76px] ${SECTION_PADDING} ${sectionBg}`}
    >
      <div className={SECTION_WIDTH}>
        {/* Mobile/tablet (< lg): compact marker above the content. */}
        <div className="lg:hidden">
          <SectionMarker
            number={numeral}
            label={label}
            tone={markerTone}
            className="mb-3"
          />
          <div aria-hidden className={`mb-6 ${HAIRLINE_TONE[tone]}`} />
        </div>

        {/* Desktop (lg+): editorial spine layout — 220px rail + 1px vertical
            divider + content column. */}
        <div className="lg:grid lg:grid-cols-[220px_1px_minmax(0,1fr)] lg:items-start lg:gap-x-[28px]">
          {/* Rail: big serif numeral + lotus + label + bottom hairline */}
          <div className="hidden lg:block lg:pt-2">
            <span
              className={`block font-serif font-medium tracking-[-0.02em] ${RAIL_NUMERAL_TONE[tone]}`}
              style={{
                fontSize: "clamp(64px, 7vw, 96px)",
                lineHeight: 0.86,
              }}
            >
              {numeral}
            </span>
            <span
              className={`mt-4 inline-flex items-center gap-2 ${EYEBROW} ${RAIL_LABEL_TONE[tone]}`}
            >
              <LotusRosette
                className={`h-3.5 w-3.5 ${RAIL_LOTUS_TONE[tone]}`}
              />
              {label}
            </span>
            <div aria-hidden className={`mt-4 ${HAIRLINE_TONE[tone]}`} />
          </div>

          {/* Vertical divider between rail and content */}
          <div
            aria-hidden
            className={`hidden lg:block lg:my-12 lg:self-stretch ${DIVIDER_TONE[tone]}`}
          />

          {/* Content column */}
          <div className="lg:pt-2">
            <Reveal>
              {leadOrnament ? <div className="mb-4">{leadOrnament}</div> : null}
              {prelude ? (
                <p className={`mb-4 ${EYEBROW} ${preludeColor}`}>{prelude}</p>
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
                tone={
                  tone === "aubergine"
                    ? "dark"
                    : tone === "sandalwood"
                      ? "warm"
                      : "default"
                }
              />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
