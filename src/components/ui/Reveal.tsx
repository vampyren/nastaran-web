"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  delay?: number;
  className?: string;
  /** Motion distance in px. Default 12. */
  offset?: number;
  /** Animate on mount instead of when in view. */
  onMount?: boolean;
  as?: keyof typeof motion;
} & Omit<HTMLMotionProps<"div">, "children" | "initial" | "animate" | "whileInView" | "viewport" | "transition">;

const EASE = [0.22, 1, 0.36, 1] as const;

export default function Reveal({
  children,
  delay = 0,
  className,
  offset = 12,
  onMount = false,
  as = "div",
  ...rest
}: Props) {
  const prefersReducedMotion = useReducedMotion();
  const MotionTag = motion[as] as typeof motion.div;

  if (prefersReducedMotion) {
    return (
      <MotionTag className={className} {...rest}>
        {children}
      </MotionTag>
    );
  }

  const initial = { opacity: 0, y: offset };
  const animate = { opacity: 1, y: 0 };
  const transition = { duration: 0.6, ease: EASE, delay };

  if (onMount) {
    return (
      <MotionTag
        className={className}
        initial={initial}
        animate={animate}
        transition={transition}
        {...rest}
      >
        {children}
      </MotionTag>
    );
  }

  return (
    <MotionTag
      className={className}
      initial={initial}
      whileInView={animate}
      viewport={{ once: true, amount: 0.35 }}
      transition={transition}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}
