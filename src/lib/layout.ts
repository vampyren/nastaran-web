// Shared layout helpers used across home/subpage components.
// Keep this thin — only utility-class chains used in 3+ places.

/** Section container width: scales from 560px to 1180px across breakpoints. */
export const SECTION_WIDTH =
  "mx-auto w-[min(100%-40px,560px)] md:w-[min(100%-96px,672px)] lg:w-[min(100%-128px,896px)] xl:w-[min(100%-192px,1180px)]";

/** Vertical padding used on each section. */
export const SECTION_PADDING = "py-14 md:py-20 lg:py-[100px] xl:py-[116px]";

/** Caps eyebrow (small uppercase label). */
export const EYEBROW =
  "text-eyebrow uppercase tracking-[0.075em] tabular-nums font-semibold";

/** Linear gradient under a section heading: accent → hairline → transparent. */
export const HAIRLINE_GRADIENT =
  "h-px w-full bg-[linear-gradient(90deg,var(--color-accent),var(--color-hairline)_34%,transparent)]";
