import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "light" | "dark";

type Props = {
  href: string;
  children: ReactNode;
  variant?: Variant;
  className?: string;
} & Omit<ComponentProps<typeof Link>, "href" | "children" | "className">;

const VARIANTS: Record<Variant, string> = {
  light:
    "border-accent/40 bg-aubergine text-paper shadow-cta hover:-translate-y-px",
  dark: "border-marigold/70 bg-marigold text-aubergine shadow-cta hover:-translate-y-px",
};

export default function TextCTA({
  href,
  children,
  variant = "light",
  className,
  ...rest
}: Props) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex min-h-[46px] items-center justify-center gap-2 self-start",
        "rounded-full border px-[18px] py-3",
        "text-[15px] font-extrabold tracking-[-0.01em]",
        "transition-transform duration-200 ease-out",
        "focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4",
        "max-[560px]:w-full",
        VARIANTS[variant],
        className ?? "",
      ]
        .join(" ")
        .trim()}
      {...rest}
    >
      {children}
    </Link>
  );
}
