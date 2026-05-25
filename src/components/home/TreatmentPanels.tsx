import PaisleyArch from "@/components/motifs/PaisleyArch";
import { EYEBROW } from "@/lib/layout";

type Row = readonly [string, string, string];

type Props = { rows: readonly Row[] };

export default function TreatmentPanels({ rows }: Props) {
  return (
    <div
      aria-label="Behandlingar"
      className="mt-7 border-t border-hairline lg:mt-9 lg:grid lg:grid-cols-3 lg:gap-[18px] lg:border-t-0"
    >
      {rows.map(([number, title, text]) => (
        <article
          key={title}
          className="group relative grid grid-cols-[38px_minmax(0,1fr)] items-start gap-x-4 border-b border-hairline py-[18px] lg:flex lg:flex-col lg:gap-0 lg:min-h-[260px] lg:overflow-hidden lg:rounded-[24px_24px_52px_24px] lg:border lg:border-hairline lg:bg-[color-mix(in_srgb,var(--color-paper)_82%,white)] lg:px-[22px] lg:pt-7 lg:pb-10"
        >
          <span
            aria-hidden
            className="hidden lg:absolute lg:bottom-0 lg:left-0 lg:top-0 lg:block lg:w-[6px] lg:opacity-[0.35]"
            style={{
              background: "linear-gradient(var(--color-accent), var(--color-copper))",
            }}
          />
          <span
            aria-hidden
            className={`${EYEBROW} text-copper pt-1 lg:pt-0 lg:font-serif lg:text-[34px] lg:font-medium lg:leading-none lg:tracking-[-0.01em] lg:normal-case lg:[letter-spacing:-0.01em]`}
          >
            {number}
          </span>
          <div className="lg:mt-5">
            <h3 className="mb-2 text-card-h3 leading-[var(--text-card-h3--line-height)] font-extrabold tracking-[-0.01em] text-ink lg:font-serif lg:font-medium lg:text-card-h3-md lg:leading-[var(--text-card-h3-md--line-height)] lg:tracking-normal">
              {title}
            </h3>
            <p className="text-body leading-[var(--text-body--line-height)] text-ink-muted lg:text-[16px] lg:leading-[25px]">
              {text}
            </p>
          </div>
          <PaisleyArch className="pointer-events-none hidden lg:absolute lg:bottom-[18px] lg:left-1/2 lg:block lg:h-3.5 lg:w-[64%] lg:-translate-x-1/2 lg:text-copper lg:transition-all lg:duration-200 lg:ease-out lg:group-hover:w-[82%]" />
        </article>
      ))}
    </div>
  );
}
