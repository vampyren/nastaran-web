import type { ReactNode } from "react";
import LotusRosette from "@/components/motifs/LotusRosette";
import SectionClose from "@/components/motifs/SectionClose";
import Reveal from "@/components/ui/Reveal";
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
  index?: string;
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
    "bg-[linear-gradient(180deg,rgba(255,255,255,0.16),transparent_34%),var(--color-sandalwood)] border-y border-hairline-warm",
  aubergine:
    "bg-[radial-gradient(circle_at_90%_10%,rgba(216,154,78,0.14),transparent_30vw),radial-gradient(circle_at_8%_90%,rgba(138,106,165,0.18),transparent_34vw),var(--color-aubergine)] text-[#eadff0]",
};

const RAIL_TONE: Record<Tone, string> = {
  paper: "text-ink-muted",
  sandalwood: "text-ink-muted",
  aubergine: "text-[#eadff0]",
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
  index,
  prelude,
  heading,
  pullQuote,
  body,
  tone = "paper",
  children,
  showClose = true,
}: Props) {
  const railColor = RAIL_TONE[tone];
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={`relative scroll-mt-[76px] ${SECTION_PADDING} ${TONE_BG[tone]}`}
    >
      <div className={`${SECTION_WIDTH} lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-x-14 lg:items-start`}>
        <div
          aria-hidden
          className={`${railColor} lg:row-span-3`}
        >
          <span
            className="hidden font-serif font-medium tracking-[-0.02em] text-copper lg:block"
            style={{
              fontSize: "clamp(64px, 7vw, 96px)",
              lineHeight: 0.86,
            }}
          >
            {numeral}
          </span>
          <span className={`inline-flex items-center gap-2 ${EYEBROW} lg:mt-4`}>
            <LotusRosette className="h-3.5 w-3.5 text-copper" />
            {label}
          </span>
          {index ? (
            <span className={`mt-2 block ${EYEBROW} lg:hidden`}>{index}</span>
          ) : null}
        </div>
        <div aria-hidden className={`mt-3 mb-6 ${HAIRLINE_TONE[tone]} lg:mt-3 lg:mb-0`} />
        <div className="lg:row-span-3 lg:pt-5">
          <Reveal>
            {prelude ? (
              <p className={`mb-4 ${EYEBROW} text-accent-deep`}>{prelude}</p>
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
      </div>
    </section>
  );
}
