"use client";

import JharokhaArch from "@/components/motifs/JharokhaArch";
import MandalaWatermark from "@/components/motifs/MandalaWatermark";
import { useTheme } from "./ThemeContext";

/**
 * Global decorations that are rendered conditionally based on the active
 * theme. Returns null on the default ("nuvarande") theme so the deployed
 * look is unchanged.
 *
 * Each decoration is fixed-positioned at -z-10 sitting above the body bg
 * but below page content (z-1). aria-hidden; pointer-events-none.
 */
export default function ThemeDecorations() {
  const { theme } = useTheme();

  if (theme === "ornament") {
    return (
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <MandalaWatermark className="absolute left-[-200px] top-[60px] h-[760px] w-[760px] text-accent opacity-[0.09] max-[1100px]:left-[-260px] max-[1100px]:top-[40px] max-[1100px]:h-[620px] max-[1100px]:w-[620px] max-[1100px]:opacity-[0.08] max-[768px]:left-[-280px] max-[768px]:top-[20px] max-[768px]:h-[480px] max-[768px]:w-[480px] max-[768px]:opacity-[0.07]" />
      </div>
    );
  }

  if (theme === "bage") {
    return (
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <JharokhaArch className="absolute left-1/2 top-[90px] h-[820px] w-[720px] -translate-x-1/2 text-accent-deep opacity-[0.13] max-[1100px]:top-[70px] max-[1100px]:h-[660px] max-[1100px]:w-[560px] max-[1100px]:opacity-[0.11] max-[768px]:top-[60px] max-[768px]:h-[480px] max-[768px]:w-[380px] max-[768px]:opacity-[0.10]" />
      </div>
    );
  }

  return null;
}
