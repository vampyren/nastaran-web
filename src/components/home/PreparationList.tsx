import { EYEBROW } from "@/lib/layout";

type Row = readonly [string, string, string];

type Props = { rows: readonly Row[] };

export default function PreparationList({ rows }: Props) {
  return (
    <div
      aria-label="Inför första kontakten"
      className="mt-7 border-t border-hairline"
    >
      {rows.map(([number, title, text]) => (
        <article
          key={title}
          className="grid grid-cols-[38px_minmax(0,1fr)] items-start gap-x-4 border-b border-hairline py-[18px] md:grid-cols-[52px_minmax(0,1fr)] md:gap-x-[22px]"
        >
          <span aria-hidden className={`${EYEBROW} text-copper pt-1`}>
            {number}
          </span>
          <div>
            <h3 className="mb-2 text-card-h3 leading-[var(--text-card-h3--line-height)] font-extrabold tracking-[-0.01em] text-ink">
              {title}
            </h3>
            <p className="text-body leading-[var(--text-body--line-height)] text-ink-muted">
              {text}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
