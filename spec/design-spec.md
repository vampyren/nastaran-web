# Design spec — Nastaran clean rebuild

The design source of truth for the new project. All values were extracted directly from the original design source. No values were eyeballed.

## Visual identity

A warm lavender "paper" base with subtle radial copper/marigold blooms and a body-wide micro-dot pattern that fades out at the fold. Editorial spine layout at desktop — a 220 px label rail on the left holds an oversized serif numeral and an UPPERCASE caps eyebrow with a lotus rosette; the body copy lives in a ~620 px text column to the right; a third column reserves space for an asymmetric rounded "ritual" image panel.

Headings are a wide-tracked serif (Newsreader). Body is Inter at `17/27`. Eyebrows are tabular caps at `12px / 0.075em`. Hairlines (`#d9c5e7`) divide sections; a 1-px `accent → hairline → transparent` gradient marks each section opening. The "Kontakt" section flips the palette to deep aubergine with marigold accents.

Subpages use a card-driven layout: a "page hero" panel with an asymmetric flare radius, then editorial cards (`about-letter`, `portrait-card`, `about-ledger`, `gallery-section`, `contact-page-hero`).

**Mood, preserved exactly:** premium, calm, warm, elegant, spiritual but not loud.

## Color tokens

All hex values copied verbatim from `:root` in old `src/app/globals.css` lines 3–19.

| Role | Hex | Source line | New `@theme` token |
|---|---|---|---|
| Page background | `#f4eaf8` | `--paper` (4) | `--color-paper` |
| Paper, deeper tint | `#e6d5ee` | `--paper-deeper` (5) | `--color-paper-deep` |
| Soft lavender panel | `#ead8f4` | `--lavender-mist` (6) | `--color-lavender` |
| Warm pink-cream panel | `#f1e2f0` | `--sandalwood` (7) | `--color-sandalwood` |
| Dark surface (Kontakt) | `#2a1b35` | `--aubergine` (8) | `--color-aubergine` |
| Dark surface, lighter | `#3a2747` | `--aubergine-soft` (9) | `--color-aubergine-soft` |
| Primary text | `#211629` | `--ink` (10) | `--color-ink` |
| Secondary text | `#5d5168` | `--ink-muted` (11) | `--color-ink-muted` |
| Border (default) | `#d9c5e7` | `--hairline` (12) | `--color-hairline` |
| Border (warm panels) | `#dfcbdc` | `--hairline-warm` (13) | `--color-hairline-warm` |
| Primary purple | `#8a6aa5` | `--accent` (14) | `--color-accent` |
| Deep purple | `#6b4d87` | `--accent-deep` (15) | `--color-accent-deep` |
| Copper detail | `#b77f50` | `--copper` (16) | `--color-copper` |
| Golden accent (on dark) | `#d89a4e` | `--marigold` (17) | `--color-marigold` |

**Body background.** Multi-layer gradient (old `globals.css` lines 35–39), kept as a single CSS variable `--bg-page`:

```
radial-gradient(circle at 10% 8%, rgba(138, 106, 165, 0.24), transparent 31vw),
radial-gradient(circle at 96% 20%, rgba(183, 127, 80, 0.08), transparent 26vw),
radial-gradient(circle at 50% 76%, rgba(126, 74, 139, 0.12), transparent 38vw),
linear-gradient(180deg, #f4eaf8 0%, #eee0f5 48%, #e6d5ee 100%)
```

**Shadow tokens** (extracted from old D8/D10 polish layers):

| Token | Value | Use |
|---|---|---|
| `--shadow-rail` | `0 18px 54px rgba(54,34,62,0.08)` | Top rail pill |
| `--shadow-cta` | `0 14px 34px rgba(54,34,62,0.12)` | Primary CTA |
| `--shadow-card` | `0 28px 80px rgba(54,34,62,0.12)` | Featured panels |
| `--shadow-portrait` | `0 24px 70px rgba(14, 6, 20, 0.28)` | Portrait card |

**Radius tokens:**

| Token | Value | Use |
|---|---|---|
| `--radius-panel-soft` | `26px` | Default panel corner |
| `--radius-panel-flare` | `70px` | Asymmetric flare on hero ritual panel |
| `--radius-page-hero` | `30px` | Subpage hero corner |
| `--radius-page-hero-flare` | `90px` | Subpage hero flare |
| `--radius-treatment` | `24px` | Treatment panel default |
| `--radius-treatment-flare` | `52px` | Treatment panel flare |
| `--radius-pill` | `999px` | Pill CTA |

## Typography

**Fonts (reused exactly via `next/font/google`):**

- Sans: `Inter` (latin + latin-ext, `display=swap`) → `--font-sans`
- Serif: `Newsreader` (latin + latin-ext, weights 400/500/600, italic + normal, `display=swap`) → `--font-serif`

**Type scale:**

| Use | Mobile | md (768) | lg (1024) | xl (1440) |
|---|---|---|---|---|
| Home h1 | 50/49 | 82/78 | 100/91 | 118/106 |
| Subpage h1 | clamp(46, 8vw, 92) / 0.98 | — | — | — |
| h2 | 28/33 | 34/39 | — | — |
| Card h3 (sans) | 17/24 | — | — | — |
| Card h3 (serif variant) | — | 25–26 / 1.1 | — | — |
| Hero intro (italic serif) | 28/34 | 34/40 | — | — |
| Hero body | 18/29 | — | — | — |
| Paragraph | 17/27 | — | — | — |
| Pull quote (italic serif) | 23/31 | — | — | — |
| Rhythm words (italic serif) | 29 / 1.12 | 38 / 1.12 | — | — |
| Caps eyebrow | 12/16 · 0.075em uppercase | — | — | — |
| Section numeral (serif) | clamp(64, 7vw, 96) / 0.86 | — | — | — |

**Where each type is used:**

| Style | Used in |
|---|---|
| Headings (h1, h2) | Serif, weight 500, `letter-spacing -0.018em`, `text-wrap: balance`, ink |
| Card h3 (serif variant) | Treatment panels at md+, value/story grid cards |
| Body, dd | Sans, ink-muted |
| Quote / hero intro / rhythm words | Serif italic, ink |
| Nav | Sans, tabular caps for desktop nav numbers + label |
| Buttons (CTA) | Sans, weight 760, `letter-spacing -0.01em`, pill radius |
| Small labels (eyebrow, section-mark, rail-current, dl dt) | Sans caps, 12/16, 0.075em |

## Spacing and layout rhythm

| Breakpoint | Section width | Section padding-block |
|---|---|---|
| Mobile | `min(100% - 40px, 560px)` | 56 |
| 390 px | `min(100% - 48px, 560px)` | 56 |
| 430 px | `min(100% - 56px, 560px)` | 62 |
| md (768) | `min(100% - 96px, 672px)` | 82 |
| lg (1024) | `min(100% - 128px, 896px)` | 116 |
| xl (1440) | `min(100% - 192px, 1180px)` | 116 |

- Outer frame max: `--frame-max: 1180px` (from old D10 layer).
- Desktop spine column: 220 px label rail at lg+, with a 1-px vertical hairline at `(896 / 2) + 248 px` from the page edge.
- Hero grid (lg+): `220 / minmax(0, 1fr) / minmax(260, 330)`. (xl: `220 / minmax(0, 680) / minmax(300, 380)`.)
- Top rail: contained pill, `min(calc(100% - 32px), 1180px)`, sticky at 12 px.

**Asymmetric panel radii:**

- Hero ritual panel: `26px 26px 70px 26px`
- Page hero (subpages): `30px 30px 90px 30px`
- About letter: `30px 30px 30px 90px` (mirror)
- Treatment cards (md+): `24px 24px 52px 24px`

## Decorative / motif system

All motifs already exist as clean React SVG components in `src/app/SiteMotifs.tsx`. Reuse the path data verbatim.

**Preserved in MS1:**

| Motif | Use |
|---|---|
| `LotusRosette` | Primary brand mark — identity, footer, page kickers, section marks, contact lotus |
| `PaisleyArch` | Section dividers; decorative footer of treatment panels (md+) |
| `SectionClose` | Composed `[PaisleyArch, LotusRosette, PaisleyArch]` at section end |
| `BootiField` | Soft dot+leaf pattern inside the hero ritual panel |
| `SanskritColumn` | "ॐ शान्ति · Shanti · Fred" — fixed left-edge ambient ornament, xl+ only, opacity 0.82 |
| `PaisleyDivider` | Subtle horizontal divider between sections (hero/behandlingar, information/kontakt) |

**Preserved as available, not forced into MS1:**

| Motif | Notes |
|---|---|
| `LavenderSprig` | Drawn lavender sprig. Exported in old code but not actually rendered on Home — keep available for MS2 |

**Deferred to MS2 theme system (optional):**

- `MandalaWatermark` (theme: ornament)
- `JharokhaArch` (theme: arch)
- `ElementsBand` Pancha Mahabhuta (theme: elements)

**Note:** `SanskritColumn` and `PaisleyDivider` were originally listed as MS2-only. They were promoted into MS1 as decorative polish (not as theme infrastructure — no `data-theme` attribute, no theme switcher) after visual review showed the page needed more visual life.

**Body dot pattern.** The original design applies a faint dot grid via `body::before` under `@media (forced-colors: none)`. New project moves this to a dedicated overlay `<BodyBackground>` element in `RootLayout`, keeping the `forced-colors` safety gate.

**Top blur veil.** The original design applies a 124-px blurred fade under the top rail via `body::after`. New project moves this to a dedicated element under `<SiteHeader>`, not a body pseudo-element.

**Subtlety rules:**

- Motifs use `currentColor`, never hard-coded colors.
- Opacity stays low for ambient ornaments (0.07–0.18 range).
- Lotus + paisley repetition is OK; mandala + sanskrit column are MS2-only.
- No motif larger than 220 px on mobile, no full-bleed ornament fields.

## Image / art direction

**Reused local assets:**

| Asset | Use | Object position |
|---|---|---|
| `public/assets/generated/nastaran_space.jpeg` | Home hero ritual panel | `center 32%` |
| `public/assets/generated/nastaran-character-01.jpeg` | Om-mig portrait card | `56% 18%` |

**Allowed image style:**

- Warm, low-saturation, soft natural light.
- Hands, textiles, candles, lavender, sandalwood-tone interiors, calm portraiture.
- Captions in Swedish, restrained.

**Forbidden:**

- Bright, high-saturation, "wellness Instagram" stock.
- Clinical / medical photography (white rooms, gloves, etc.).
- Bollywood / temple / yoga-class crowds.
- Any image not approved or not from the original design source.
- Random stock unless explicitly approved.

**Gallery placeholders.** Old `siteData.ts` lists 5 Unsplash URLs in `ceremonyImages`, flagged as "Exempelbild från Unsplash". These are placeholders, not final assets. When the gallery ships:

- Add `images.remotePatterns` for `images.unsplash.com` in `next.config.mjs`.
- README must clearly mark these as placeholders.
- Replace with real images before any public launch.

## Motion direction

**Framer Motion is included from MS1**, used only for restrained motion.

**Allowed in MS1:**

- Hero copy + ritual panel: gentle fade + 6–12 px rise on mount, staggered. Duration ~600 ms.
- Section h2 + body: fade + small rise on viewport enter, once per scroll.
- Rhythm strip: fade-in on viewport enter.

**Allowed in later PRs:**

- Gallery indicators: small color/width transition on active state.
- Gallery scroll: CSS scroll-snap with smooth scroll. Framer Motion only if needed for indicators.

**Required:**

- All animations honor `prefers-reduced-motion: reduce` (no motion, instant state).
- Transitions are ≤ 700 ms.
- Easing is soft (`cubic-bezier(0.22, 1, 0.36, 1)` or Framer Motion `easeOut`).

**Forbidden:**

- Parallax.
- Mouse-tracked animation.
- Letter-by-letter or word-by-word text animation.
- Looping or attention-grabbing motion.
- Hover animation that moves layout content (subtle color/border changes are fine).

## Explicit anti-goals

- ❌ Generic SaaS landing page aesthetics.
- ❌ Clinical wellness / medical look.
- ❌ Bollywood or temple-heavy decoration.
- ❌ Noisy decoration, layered overlays, busy backgrounds.
- ❌ New visual identity — this is a rebuild, not a redesign.
- ❌ Loud color, high contrast outside the existing palette.
- ❌ Stock photography that breaks the warm, calm tone.
