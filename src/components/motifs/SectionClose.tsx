import LotusRosette from "./LotusRosette";
import PaisleyArch from "./PaisleyArch";

type Props = {
  className?: string;
  tone?: "default" | "warm" | "dark";
};

export default function SectionClose({ className, tone = "default" }: Props) {
  const color =
    tone === "warm"
      ? "text-copper"
      : tone === "dark"
        ? "text-marigold"
        : "text-copper";

  return (
    <div
      aria-hidden
      className={`mt-9 flex items-center gap-2.5 ${color} ${className ?? ""}`.trim()}
    >
      <PaisleyArch className="h-[13px] w-[62px] -scale-x-100" />
      <LotusRosette className="h-[15px] w-[15px]" />
      <PaisleyArch className="h-[13px] w-[62px]" />
    </div>
  );
}
