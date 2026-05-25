# Design system — current accepted visual state

This file captures the visual system of the **clean rebuild as deployed at `https://nastaran-web-clean.vercel.app`** (commit `865b34b` at the time of writing). It exists so we can preserve the accepted look during MS2 theme work and any future redesign.

> The accompanying `spec/design-spec.md` is the original design brief extracted from the old project before implementation began. **This document records what is actually shipped.**

## Color tokens

Defined in `src/app/globals.css` via `@theme`. All values verbatim — preserve before any theme work.

| Token | Hex | Role |
|---|---|---|
| `--color-paper` | `#f4eaf8` | Page background base — warm lavender |
| `--color-paper-deep` | `#e6d5ee` | Slightly deeper paper |
| `--color-lavender` | `#ead8f4` | Soft lavender panel |
| `--color-sandalwood` | `#f1e2f0` | Warm pink-cream panel (Rytm / Inför besök) |
| `--color-aubergine` | `#2a1b35` | Dark surface (Kontakt + footer) |
| `--color-aubergine-soft` | `#3a2747` | Lighter aubergine |
| `--color-ink` | `#211629` | Primary text |
| `--color-ink-muted` | `#5d5168` | Secondary text |
| `--color-hairline` | `#d9c5e7` | Default border |
| `--color-hairline-warm` | `#dfcbdc` | Border on warm panels |
| `--color-accent` | `#8a6aa5` | Primary purple |
| `--color-accent-deep` | `#6b4d87` | Deep purple |
| `--color-copper` | `#b77f50` | Copper detail (numerals, lotus on light) |
| `--color-marigold` | `#d89a4e` | Golden accent (CTAs on dark, lotus on dark) |

### Body gradient (`--bg-page`)

Four-layer composite, fixed at viewport-level:

```
radial-gradient(circle at 10% 8%, rgba(138, 106, 165, 0.24), transparent 31vw),
radial-gradient(circle at 96% 20%, rgba(183, 127, 80, 0.08), transparent 26vw),
radial-gradient(circle at 50% 76%, rgba(126, 74, 139, 0.12), transparent 38vw),
linear-gradient(180deg, #f4eaf8 0%, #eee0f5 48%, #e6d5ee 100%)
```

Rendered via `<BodyBackground />` at `-z-10`. Plus a fixed dot-pattern overlay at opacity `0.18` masked to fade by 62% from top (forced-colors safe).

## Typography

### Fonts

- Sans: **Inter** — `next/font/google`, latin + latin-ext, weight default
- Serif: **Newsreader** — `next/font/google`, latin + latin-ext, weights 400/500/600, italic + normal
- Devanagari (used by `SanskritColumn` only): system stack `"Noto Sans Devanagari", "Sanskrit Text", "Mangal", serif`

### Scale tokens (`@theme`)

| Token | Mobile | md | lg | xl |
|---|---|---|---|---|
| `--text-display` | 50/49 | 82/78 | 100/91 | 118/106 |
| `--text-h2` | 28/33 | 34/39 | — | — |
| `--text-intro` (italic serif) | 28/34 | 34/40 | — | — |
| `--text-body-lg` | 18/29 | — | — | — |
| `--text-body` | 17/27 | — | — | — |
| `--text-pull` (italic serif) | 23/31 | — | — | — |
| `--text-rhythm` (italic serif) | 29/33 | 38/42 | — | — |
| `--text-card-h3` | 17/24 (sans) | 26/29 (serif) | — | — |
| `--text-eyebrow` | 12/16 caps | — | — | — |

Headings are serif (Newsreader) at weight 500, `letter-spacing -0.018em`, `text-wrap: balance`.
Eyebrows use `tabular-nums uppercase tracking-[0.075em]` on Inter, semibold.

### Subpage display sizes

Subpage h1s use raw `clamp(46px, 8vw, 92px) / 0.96` or `clamp(44px, 7vw, 86px) / 0.98` inline (per page) because they need finer breakpoint control than the tokens provide.

## Radii (`@theme`)

| Token | Value | Use |
|---|---|---|
| `--radius-panel-soft` | 26px | Hero ritual panel (and similar) |
| `--radius-panel-flare` | 70px | Asymmetric flare on hero ritual panel |
| `--radius-page-hero` | 30px | Subpage hero corner |
| `--radius-page-hero-flare` | 90px | Subpage hero flare |
| `--radius-treatment` | 24px | Treatment cards default |
| `--radius-treatment-flare` | 52px | Treatment cards flare |

Note: many panels use inline `style={{ borderRadius: "..." }}` with literal values because the asymmetric corners are tone-specific and need direction-aware mapping.

## Shadows (`@theme`)

| Token | Value | Use |
|---|---|---|
| `--shadow-rail` | `0 18px 54px rgba(54, 34, 62, 0.08)` | Top nav pill |
| `--shadow-cta` | `0 14px 34px rgba(54, 34, 62, 0.12)` | Primary CTA pill |
| `--shadow-card` | `0 28px 80px rgba(54, 34, 62, 0.12)` | Featured cards, gallery arrows |

## Spacing / layout rhythm

Section content uses a width helper (`src/lib/layout.ts`):

```ts
SECTION_WIDTH = "mx-auto w-[min(100%-40px,560px)]
                 md:w-[min(100%-96px,672px)]
                 lg:w-[min(100%-128px,896px)]
                 xl:w-[min(100%-192px,1180px)]"

SECTION_PADDING = "py-14 md:py-20 lg:py-[100px] xl:py-[116px]"
```

Subpages use a slightly different wrapper at the page level: `mx-auto w-[min(100%-32px,1180px)] md:w-[min(100%-64px,1180px)] xl:w-[min(100%-96px,1180px)]`. Outer frame max is `1180px` everywhere.

### Global content safe-area

`src/app/layout.tsx` wraps `{children}` in `pt-[96px] lg:pt-[112px]` so all routes start below the fixed-floating nav.

### Hero layout breakpoint

3-column editorial grid kicks in at `xl:` (≥ 1280 px) only. Below xl the hero stacks: copy first, ritual image panel below. This was deliberately raised from `lg:` because at 1024–1279 px the 100 px `text-display-lg` h1 was cramped in a ~324 px content column.

### Asymmetric panel radii used in components

- Hero ritual panel: `26px 26px 70px 26px` (flare bottom-right)
- Treatment cards (lg+): `24px 24px 52px 24px`
- Om-mig "about-letter": `30px 30px 30px 90px` (flare bottom-left)
- Om-mig portrait card outer: `30px 90px 30px 30px` (flare top-right)
- Om-mig portrait frame: `999px 999px 38px 38px` (arch top)
- Berättelser story slots: `24px 24px 46px 24px`
- Berättelser ceremony cards: `28px 28px 70px 28px`
- Kontakt hero / safety note: `30px` all corners (symmetric)
- Kontakt form section + flow: `28px` all corners

## Header / nav behavior

**Architecture:** outer fixed wrapper (no visual styling, `pointer-events-none`) holds a centered floating rail pill.

- Wrapper: `pointer-events-none fixed inset-x-0 top-3 z-50 px-4 lg:top-4`
- Rail (the visible pill): `pointer-events-auto relative mx-auto flex h-[52px] max-w-[1180px] items-center justify-between gap-3.5 overflow-hidden rounded-[22px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(244,234,248,0.88))] px-3.5 shadow-rail ring-1 ring-inset ring-white/40 backdrop-blur-xl sm:px-4 md:h-[60px] md:px-[22px] lg:h-16 lg:px-[26px]`
- Internal glossy highlight strip clipped by `overflow-hidden`
- Mobile menu panel: fixed at `top-[72px] z-50`, separate from the wrapper so its `pointer-events-auto` works

**HeaderFrost layer** (`src/components/HeaderFrost.tsx`) at `z-40`, between content and pill:

```
pointer-events-none fixed inset-x-0 top-0 z-40
h-[112px] bg-paper/45 backdrop-blur-2xl
mask-b-from-55% mask-b-to-100% lg:h-[132px]
```

The Tailwind v4 `mask-b-*` utilities compose to a vertical fade (solid → transparent), so the frost has no visible rectangular edge.

**Scroll-spy on `/`** uses window scroll events + `getBoundingClientRect` to set `aria-current="page"` on the active nav link.

## Page-level visual structure

| Route | Layout |
|---|---|
| `/` | Hero · PaisleyDivider · 4 SectionShell sections (Behandlingar, Rytm, Inför besök, Praktiskt) · PaisleyDivider · ContactTeaser (aubergine) · SiteFooter |
| `/om-mig` | About-letter + portrait card (2-col editorial at md+) · approach split section · values ledger |
| `/berattelser` | Stories intro band · gallery section with `GalleryCarousel` (seamless loop) · 3-slot story grid |
| `/kontakt` | Hero (with email side-card) · contact form section · flow ordered list · dark aubergine safety note |
| `/testimonials` | `redirect("/berattelser")` |
| `/_not-found` | Next.js default (no SiteHeader, no HeaderFrost) |

## Reusable component patterns

| Component | Path | Notes |
|---|---|---|
| `BodyBackground` | `src/components/BodyBackground.tsx` | Fixed page gradient + dot overlay, `-z-10` |
| `HeaderFrost` | `src/components/HeaderFrost.tsx` | Top frost layer, `z-40`, masked |
| `SiteHeader` | `src/components/SiteHeader.tsx` | Outer fixed wrapper + inner pill, scroll-spy |
| `SiteFooter` | `src/components/SiteFooter.tsx` | Aubergine band with dot-pattern strip + lotus + © |
| `SkipLink` | `src/components/SkipLink.tsx` | Accessibility link |
| `TextCTA` | `src/components/ui/TextCTA.tsx` | Pill CTA, variants: `light` (aubergine bg), `dark` (marigold bg) |
| `Reveal` | `src/components/ui/Reveal.tsx` | Server component, applies `nw-rise` CSS animation class |
| `Panel` | `src/components/ui/Panel.tsx` | Exists but unused in home — kept for future |
| Motifs | `src/components/motifs/*` | `LotusRosette`, `PaisleyArch`, `PaisleyDivider`, `SectionClose`, `BootiField`, `LavenderSprig` (unused), `SanskritColumn` (rendered globally at xl+) |
| Home sections | `src/components/home/*` | `Hero`, `SectionShell`, `SectionMarker`, `TreatmentPanels`, `RhythmStrip`, `PreparationList`, `InformationLedger`, `ContactTeaser` |
| Subpage components | `src/components/berattelser/GalleryCarousel.tsx`, `src/components/kontakt/ContactForm.tsx` | Client components |

### `SectionShell` — the editorial spine

Used by sections 02 / 03 / 04 / 05 / 06 on home. Responsive:

- **< lg**: compact `SectionMarker` (lotus + `NN / LABEL`) + horizontal hairline above the content.
- **lg+**: 3-column grid `[220px rail | 1px vertical divider | content]`. Rail holds a big serif numeral (`clamp(64px, 7vw, 96px)` in copper / paper on aubergine), lotus + small uppercase label, and the horizontal hairline gradient. Content column has prelude, h2, pullQuote, body, children, section-close.

Tones: `paper` / `sandalwood` / `aubergine`. New props after the spine restoration: `leadOrnament?: ReactNode` (Kontakt's big marigold lotus), `bgOverride?: string` (Rytm's custom radial + linear gradient bg).

### `SectionMarker`

Single compact format used everywhere the editorial spine isn't applied (mobile/tablet of SectionShell + hero subhead, etc.):

```
🪷 NN / LABEL
```

Small uppercase, copper lotus, accent-deep text. Tone variant: `dark` swaps to paper text + marigold lotus.

## Tailwind-first implementation rules (currently followed)

1. All visual styling is **Tailwind utilities** in component JSX. No semantic CSS class systems.
2. `globals.css` is **under 90 lines** (currently 83). Contains only `@import "tailwindcss"`, the `@theme` token block, an `@layer base` reset, a `:root --bg-page` variable (multi-layer gradient that's too long for utilities), the `nw-rise` keyframe + class, and the `prefers-reduced-motion` override.
3. **No `@apply`** anywhere in MS1.
4. **No `!important`** outside the reduced-motion override.
5. **No `:not()` selector chains.**
6. **No `body::before` / `body::after` decorations** — moved to real DOM elements (`BodyBackground`, `HeaderFrost`).
7. Custom radii and gradients use `style={{...}}` inline rather than introducing one-off CSS classes.
8. Per-component `style={{}}` is allowed for things Tailwind can't express cleanly (multi-layer gradients with multiple stops, `mask-image` on certain elements, asymmetric `borderRadius` patterns).
9. Custom breakpoints beyond Tailwind defaults (`sm 640 / md 768 / lg 1024 / xl 1280`) require a PR comment justifying why. We use `max-[560px]:` and `max-[640px]:` in a few spots for the gallery/CTA cases.

## Quality gates that must stay green

- `npm run lint` (ESLint with `eslint-config-next`)
- `npm run typecheck` (`tsc --noEmit`)
- `npm run build` (`next build`)

All 6 routes prerender static.
