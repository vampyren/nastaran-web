import type { ReactNode } from "react";

type Tone = "paper" | "lavender" | "sandalwood" | "aubergine";
type Flare = "br" | "bl" | "tr" | "tl" | "none";

type Props = {
  children: ReactNode;
  tone?: Tone;
  /** Asymmetric flared corner direction. */
  flare?: Flare;
  /** Use the larger page-hero radii (30/90) instead of the panel radii (26/70). */
  size?: "panel" | "page-hero";
  className?: string;
  as?: "div" | "section" | "aside" | "article";
};

const TONES: Record<Tone, string> = {
  paper: "bg-[color-mix(in_srgb,var(--color-paper)_82%,white)] border-hairline text-ink",
  lavender: "bg-lavender border-hairline text-accent-deep",
  sandalwood: "bg-sandalwood border-hairline-warm text-ink",
  aubergine: "bg-aubergine border-white/10 text-paper",
};

function radiusFor(size: "panel" | "page-hero", flare: Flare) {
  const base = size === "page-hero" ? "30px" : "26px";
  const big = size === "page-hero" ? "90px" : "70px";
  switch (flare) {
    case "br":
      return `${base} ${base} ${big} ${base}`;
    case "bl":
      return `${base} ${base} ${base} ${big}`;
    case "tr":
      return `${base} ${big} ${base} ${base}`;
    case "tl":
      return `${big} ${base} ${base} ${base}`;
    default:
      return base;
  }
}

export default function Panel({
  children,
  tone = "paper",
  flare = "br",
  size = "panel",
  className,
  as = "div",
}: Props) {
  const Tag = as;
  const style = { borderRadius: radiusFor(size, flare) };
  return (
    <Tag
      className={[
        "relative overflow-hidden border",
        TONES[tone],
        className ?? "",
      ]
        .join(" ")
        .trim()}
      style={style}
    >
      {children}
    </Tag>
  );
}
