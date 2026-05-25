import { EYEBROW } from "@/lib/layout";

type Row = readonly [string, string];

type Props = {
  rows: readonly Row[];
  importantLabel: string;
};

export default function InformationLedger({ rows, importantLabel }: Props) {
  return (
    <dl className="mt-7 border-t border-hairline">
      {rows.map(([term, description]) => {
        const isImportant = term === importantLabel;
        return (
          <div
            key={term}
            className="grid gap-2 border-b border-hairline py-[18px] md:grid-cols-[132px_minmax(0,1fr)] md:items-baseline md:gap-x-6"
          >
            <dt className={`${EYEBROW} text-copper m-0`}>{term}</dt>
            <dd
              className={`m-0 font-serif italic text-[18px] leading-[27px] text-ink ${
                isImportant ? "border-l border-copper pl-3.5" : ""
              }`}
            >
              {description}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
