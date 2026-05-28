# Learnings + MS2 theme system (shipped)

Captures original-site theme/design learnings (extracted read-only from the original Nastaran site project) and the rules the MS2 theme selector followed. **MS2 shipped** — the guardrails below are kept as the contract for any future theme additions or changes. Pairs with [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md) which records the current accepted look.

---

## 1. Original site — what we learned

### Original theme system (4 themes)

Source: `src/app/ThemeSwitcher.tsx` + `src/app/ThemeDecorations.tsx` + `src/app/globals.css` (`:root[data-theme="..."]` selectors).

| Theme id | Swedish label | Hint (in switcher) | Swatch trio | Visual character |
|---|---|---|---|---|
| `base` | Base | Nuvarande utseende | `#faf7fc #ead8f4 #3d2a5f` | The "default" warm lavender + aubergine look — same color palette as everywhere else, just no decorative theme overlays |
| `ornament` | Ornament | Mandala · paisley · sanskrit | `#faf7fc #e9d6f1 #a78ad1` | Adds large mandala watermark (top-left), fixed `ॐ शान्ति` sanskrit column on the left edge, and paisley dividers between sections |
| `elements` | Element | Ayurvedas fem element | `#faf7fc #f3e7c0 #b8945a` | Adds an `ElementsBand` section ("Pancha Mahabhuta") with the five elements: Jord (पृथ्वी), Vatten (जल), Eld (अग्नि), Luft (वायु), Eter (आकाश) — each with an SVG glyph and Devanagari name |
| `arch` | Arch | Jharokha-ram | `#faf7fc #ead8f4 #7a4e8c` | Adds a large Jharokha (Indian palace window) arch SVG behind the hero / page content |

**Critically:** the four themes don't change the core color palette in the original design. They toggle the visibility of **decorative SVG overlays** that exist in the DOM at all times but are gated by `:root[data-theme="..."] .theme-only-...` rules. Same `--paper`, `--aubergine`, `--accent`, `--copper`, `--marigold` everywhere.

### Color palette (original `:root` in old globals.css)

Identical to what the clean rebuild uses (we extracted hex-for-hex). All 14 named colors carry over to the current site. Nothing new to learn here — see `DESIGN-SYSTEM.md`.

### Typography

- Sans: Inter (latin + latin-ext)
- Serif: Newsreader (italic + normal, weights 400/500/600)
- Devanagari font stack: `"Noto Sans Devanagari", "Sanskrit Text", "Mangal", serif` — used only when the ornament/elements theme renders sanskrit/Devanagari characters

The current site already inherits these (via `next/font/google`).

### Decorative motifs in the original design

| Motif | Component | Currently in clean rebuild? |
|---|---|---|
| Lotus rosette | `LotusRosette` | ✓ Reused everywhere |
| Paisley arch (small inline) | `PaisleyArch` | ✓ Used in `SectionClose` and treatment panel footers |
| Section close (paisley + lotus + paisley) | `SectionClose` | ✓ End of every section |
| Booti dot+leaf pattern | `BootiField` | ✓ Hero ritual panel |
| Lavender sprig (drawn) | `LavenderSprig` | Exported, not rendered |
| Paisley divider (horizontal) | `PaisleyDivider` | ✓ Between Hero/Behandlingar and Information/Kontakt |
| Sanskrit column (ॐ · शान्ति · Shanti · Fred) | `SanskritColumn` | ✓ Gated to `ornament` theme via `ThemeDecorations` (was always-on at xl+ during MS1; moved to ornament-only as part of MS1 cleanup since the original site treated it as theme-only) |
| Mandala watermark | `MandalaWatermark` | ✓ Ported (MS2) — rendered for `ornament` theme |
| Jharokha arch (palace window) | `JharokhaArch` | ✓ Ported (MS2) — rendered for `bage` theme |
| Elements band (Pancha Mahabhuta) | `ElementsBand` | ✓ Ported (MS2) — rendered inline in `src/app/page.tsx` for `elementen` theme |

### Indian / spiritual inspiration patterns

- **Lotus rosette** as the brand mark
- **Paisley** as the section-edge motif language
- **ॐ शान्ति** ("Om Shanti — peace") vertical column on wide screens
- **Pancha Mahabhuta** (Ayurveda five elements: earth/water/fire/air/ether) as an opt-in section
- **Jharokha** (Indian palace window arch) as an opt-in background ornament
- **Booti** (Mughal dot+leaf pattern) inside the hero ritual panel
- **Sandalwood / lavender / copper / marigold** color palette — warm, premium, spiritual but restrained

### What's worth preserving from the original design

1. The **base color palette** (already preserved — same hexes)
2. The **lotus / paisley / booti** motifs (already in MS1)
3. The **calm, premium, warm, spiritual-but-restrained** feel
4. The **Swedish-first** copy (already ported verbatim)
5. The **idea of opt-in Indian-spiritual decorative layers** — sanskrit column, mandala, jharokha, elements band — as supplementary motifs that don't change the base palette
6. The **`SectionClose` end-of-section ornament** for editorial rhythm

### What must NOT be brought back

1. **The 2369-line globals.css with D7–D10 polish layers.** The original design's CSS was cascade-heavy with hundreds of semantic class selectors (`.section-shell`, `.contact-section h2`, `.row-list p`, etc.) overridden by later "polish" stanzas. The current site rebuilds from Tailwind utilities and we never recreate that cascade structure.
2. **`@apply` migration architecture.** Some intermediate state of the original design had `@apply` directives mapping Tailwind utilities into semantic classes. MS2 must not reintroduce this.
3. **`body::before` / `body::after` decorations.** Original design put the dot pattern, top blur veil, and other decorative bits on body pseudo-elements. The current site moved them into real DOM elements (`BodyBackground`, `HeaderFrost`). MS2 must keep this.
4. **`!important` overrides** like `.desktop-nav { display: flex !important; }` and `.spine-nav { display: none !important; }` that the original design's D8 layer used to fight earlier rules.
5. **`:not()` selector chains** like `.section-shell:not(.contact-section):not(.warm-section)::before`. Not allowed.
6. **Custom breakpoint chaos** — original design had 14+ overlapping `@media` queries (390/430/640/768/900/1024/1100/1280/1440/etc.). MS2 must stick to Tailwind defaults plus the handful of `max-[560px]:`/`max-[640px]:` arbitraries we already have.
7. **`theme-only-*` CSS class architecture** where every theme-specific node is rendered in the DOM at all times and shown/hidden via `:root[data-theme="..."]` selectors. If MS2 needs theme-specific decorations, they should be **conditionally rendered** in React, not hidden by CSS.
8. **Noisy decoration** — Bollywood/temple-heavy ornament, multiple stacked overlays, busy background patterns. The original design deliberately stayed restrained; MS2 must too.

---

## 2. MS2 Theme Selector — guardrails (held during MS2, kept for future)

Hard rules the theme selector followed. **MS2 shipped** with these rules respected — they remain the contract for any future theme additions or modifications.

### Default theme must preserve the current deployed appearance

- The default theme (shipped as `nuvarande`) renders the site **exactly as it appears at `https://nastaran-web.vercel.app`**.
- No font swap, no color shift, no spacing change, no layout adjustment introduced as a side effect of the theme system.
- A visitor who never opens the switcher sees the same thing they saw before MS2.

### Do not redesign while adding themes

- MS2 was **only** the selector + alternative themes. It was not a chance to revisit hero composition, header chrome, section layouts, gallery behavior, or contact form styling. Any future theme work must hold the same line.
- If a polish itch shows up while doing theme work, file it as a separate PR — don't slip it in.

### Tailwind-first

- Theme switching mechanism uses `data-theme="..."` on `<html>` plus `@theme` token swaps in `globals.css`, **not** CSS class systems on components.
- Components stay Tailwind-utility based and reference tokens (`bg-paper`, `text-ink`, etc). Tokens change per theme — components don't.
- No `@apply` introduced for theming.

### Keep `globals.css` minimal

- Today: 83 lines.
- MS2 budget: under 200 lines even after adding 3–4 theme blocks.
- Each theme is a `@theme` or `:root[data-theme="..."]` block that overrides only the tokens it needs.
- If a theme needs a brand-new token (e.g. a fifth panel color), the token is added once and reused — not redefined per use site.

### Avoid the old cascade-heavy patterns

- No `theme-only-*` classes that gate visibility on `:root[data-theme="..."]`.
- No semantic CSS class systems (already forbidden per the existing spec; reinforced here).
- Theme-specific decorations (sanskrit column, mandala, jharokha, elements band) are **conditionally rendered in React** based on the active theme, read from a context or a CSS variable + JS hook.

### Theme tokens only where they reduce duplication

- Don't pre-emptively token-ize colors that aren't likely to vary across themes (e.g. text-ink will probably be the same dark tone in every theme; don't add four theme variants of it unnecessarily).
- Do add tokens for colors that obviously vary (page paper tone, primary accent, ornament accent).

### Theme labels in Swedish, elegant

Original design's switcher labels: "Base" / "Ornament" / "Element" / "Arch". Those are fine but "Element" reads oddly in Swedish — could be "Elementen" (the elements). Keep labels short, capitalized like proper nouns, with a one-line Swedish hint (the original design's hint pattern: `Nuvarande utseende`, `Mandala · paisley · sanskrit`, etc.).

### Original themes first, new themes second

Inventory below proposes themes derived from the original design's four. **Don't invent a wildly new theme before the four originals are visually documented and selectable.**

### No Bollywood / temple-heavy design

- No saturated reds, neon golds, marigold-dominant backgrounds.
- No multi-layered tile patterns covering large areas.
- No emoji-style ornament density.
- The whole site should still feel like a quiet Swedish wellness page that happens to draw on Indian spiritual aesthetics — not the other way around.

### No generic SaaS / clinical redesign

- No flat blue-gray palette.
- No "stock landing page" hero patterns (vertical lines, dots in a grid, abstract waves at the bottom).
- No clinical wellness photography style (white tile, gloved hands, medical fonts).

---

## 3. MS2 theme inventory (shipped)

| Theme id | Swedish label | Inspired by | Color palette | Decorations |
|---|---|---|---|---|
| `nuvarande` | Nuvarande | Current deployed site | Existing tokens (unchanged). `--color-paper #f4eaf8` base, `--color-accent #8a6aa5`, copper + marigold accents | Lotus + paisley + booti only. No theme-specific overlays. |
| `ornament` | Ornament | Original design's "ornament" theme | Same base palette | `<MandalaWatermark />` top-left + the fixed `<SanskritColumn />` on the left edge at xl+ |
| `elementen` | Elementen | Original design's "elements" theme (Pancha Mahabhuta) | Same base | `<ElementsBand />` (Pancha Mahabhuta) section rendered inline in `src/app/page.tsx` |
| `bage` | Båge | Original design's "arch" theme (Jharokha) | Same base | `<JharokhaArch />` SVG behind the hero copy |

**All four themes share the same palette family.** The differences are decorative overlays + tiny per-theme tone adjustments. This matches the original design's intent — themes are seasonings on the same base recipe, not entirely different recipes.

### Optional themes — explicitly not implemented

| Theme id | Swedish label | Idea | Status |
|---|---|---|---|
| `kvall` | Kväll (evening) | Slightly desaturated, deeper aubergine page background. Same accents. A dim-mode aesthetic; not a full dark mode. | **Not implemented.** Add only if explicitly requested. |
| `morgon` | Morgon (morning) | Slightly warmer paper tone, brighter copper. Soft morning light feel. | **Not implemented.** Add only if explicitly requested. |

### Implementation that shipped

```
1. Per-theme :root[data-theme="..."] blocks in globals.css override the
   tokens that vary; tokens that don't vary are not redeclared per theme.

2. <ThemeSwitcher /> (src/components/theme/ThemeSwitcher.tsx) client:
   - Reads/writes localStorage
   - Sets document.documentElement.dataset.theme via the external store
   - Floating button (top-right) opens a panel with swatches + Swedish hints

3. <ThemeDecorations /> (src/components/theme/ThemeDecorations.tsx):
   - Reads the active theme via useTheme() (useSyncExternalStore-based,
     no provider needed)
   - Conditionally renders MandalaWatermark / SanskritColumn / JharokhaArch
     for the matching theme. ElementsBand is rendered inline on the home
     page rather than via ThemeDecorations because it lives in the page
     content flow.

4. <ThemeBootScript /> (src/components/theme/ThemeBootScript.tsx) is an
   inline <script> in <head> that reads localStorage and sets
   data-theme on <html> before hydration, so there is no flash between
   default and stored theme on load.

5. Default theme is "nuvarande" — visitors who never open the switcher
   see the original deployed look unchanged.
```

The state is read via `useSyncExternalStore` (no Context Provider needed and no setState-in-effect), which keeps `RootLayout` a Server Component and avoids the `react-hooks/set-state-in-effect` lint complaint that an earlier draft hit.
