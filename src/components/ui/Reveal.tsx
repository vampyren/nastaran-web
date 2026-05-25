import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /** Animation delay in seconds. */
  delay?: number;
  as?: "div" | "section" | "aside";
};

/**
 * SSR-safe fade+rise wrapper. Uses a CSS @keyframes rule defined in
 * globals.css — no Framer Motion `initial`, so no `opacity: 0` lands in the
 * SSR HTML. The reduced-motion override in globals.css cuts the duration to
 * effectively zero, so motion-averse users see content render immediately.
 */
export default function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: Props) {
  const style = delay ? { animationDelay: `${delay}s` } : undefined;
  return (
    <Tag className={`nw-rise ${className ?? ""}`.trim()} style={style}>
      {children}
    </Tag>
  );
}
