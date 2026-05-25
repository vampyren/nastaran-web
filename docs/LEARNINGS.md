# Learnings + MS2 guardrails

Captures original-site theme/design learnings (extracted read-only from `/home/spawn/Apps/nastaran-web`) and the rules MS2's theme selector must follow. Pairs with [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md) which records the current accepted look.

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

**Critically:** the four themes don't change the core color palette in the old project. They toggle the visibility of **decorative SVG overlays** that exist in the DOM at all times but are gated by `:root[data-theme="..."] .theme-only-...` rules. Same `--paper`, `--aubergine`, `--accent`, `--copper`, `--marigold` everywhere.

### Color palette (original `:root` in old globals.css)

Identical to what the clean rebuild uses (we extracted hex-for-hex). All 14 named colors carry over to the current site. Nothing new to learn here — see `DESIGN-SYSTEM.md`.

### Typography

- Sans: Inter (latin + latin-ext)
- Serif: Newsreader (italic + normal, weights 400/500/600)
- Devanagari font stack: `"Noto Sans Devanagari", "Sanskrit Text", "Mangal", serif` — used only when the ornament/elements theme renders sanskrit/Devanagari characters

The current site already inherits these (via `next/font/google`).

### Decorative motifs in the old project

| Motif | Component | Currently in clean rebuild? |
|---|---|---|
| Lotus rosette | `LotusRosette` | ✓ Reused everywhere |
| Paisley arch (small inline) | `PaisleyArch` | ✓ Used in `SectionClose` and treatment panel footers |
| Section close (paisley + lotus + paisley) | `SectionClose` | ✓ End of every section |
| Booti dot+leaf pattern | `BootiField` | ✓ Hero ritual panel |
| Lavender sprig (drawn) | `LavenderSprig` | Exported, not rendered |
| Paisley divider (horizontal) | `PaisleyDivider` | ✓ Between Hero/Behandlingar and Information/Kontakt |
| Sanskrit column (ॐ · शान्ति · Shanti · Fred) | `SanskritColumn` | ✓ Rendered globally at xl+ from `RootLayout` (currently always on) |
| Mandala watermark | `MandalaWatermark` | NOT ported — was theme-gated |
| Jharokha arch (palace window) | `JharokhaArch` | NOT ported — was theme-gated |
| Elements band (Pancha Mahabhuta) | `ElementsBand` | NOT ported — was theme-gated |

### Indian / spiritual inspiration patterns

- **Lotus rosette** as the brand mark
- **Paisley** as the section-edge motif language
- **ॐ शान्ति** ("Om Shanti — peace") vertical column on wide screens
- **Pancha Mahabhuta** (Ayurveda five elements: earth/water/fire/air/ether) as an opt-in section
- **Jharokha** (Indian palace window arch) as an opt-in background ornament
- **Booti** (Mughal dot+leaf pattern) inside the hero ritual panel
- **Sandalwood / lavender / copper / marigold** color palette — warm, premium, spiritual but restrained

### What's worth preserving from the old project

1. The **base color palette** (already preserved — same hexes)
2. The **lotus / paisley / booti** motifs (already in MS1)
3. The **calm, premium, warm, spiritual-but-restrained** feel
4. The **Swedish-first** copy (already ported verbatim)
5. The **idea of opt-in Indian-spiritual decorative layers** — sanskrit column, mandala, jharokha, elements band — as supplementary motifs that don't change the base palette
6. The **`SectionClose` end-of-section ornament** for editorial rhythm

### What must NOT be brought back

1. **The 2369-line globals.css with D7–D10 polish layers.** The old project's CSS was cascade-heavy with hundreds of semantic class selectors (`.section-shell`, `.contact-section h2`, `.row-list p`, etc.) overridden by later "polish" stanzas. The current site rebuilds from Tailwind utilities and we never recreate that cascade structure.
2. **`@apply` migration architecture.** Some intermediate state of the old project had `@apply` directives mapping Tailwind utilities into semantic classes. MS2 must not reintroduce this.
3. **`body::before` / `body::after` decorations.** Old project put the dot pattern, top blur veil, and other decorative bits on body pseudo-elements. The current site moved them into real DOM elements (`BodyBackground`, `HeaderFrost`). MS2 must keep this.
4. **`!important` overrides** like `.desktop-nav { display: flex !important; }` and `.spine-nav { display: none !important; }` that the old project's D8 layer used to fight earlier rules.
5. **`:not()` selector chains** like `.section-shell:not(.contact-section):not(.warm-section)::before`. Not allowed.
6. **Custom breakpoint chaos** — old project had 14+ overlapping `@media` queries (390/430/640/768/900/1024/1100/1280/1440/etc.). MS2 must stick to Tailwind defaults plus the handful of `max-[560px]:`/`max-[640px]:` arbitraries we already have.
7. **`theme-only-*` CSS class architecture** where every theme-specific node is rendered in the DOM at all times and shown/hidden via `:root[data-theme="..."]` selectors. If MS2 needs theme-specific decorations, they should be **conditionally rendered** in React, not hidden by CSS.
8. **Noisy decoration** — Bollywood/temple-heavy ornament, multiple stacked overlays, busy background patterns. The old project deliberately stayed restrained; MS2 must too.

---

## 2. MS2 Theme Selector — Guardrails

Hard rules for the upcoming theme selector. Every PR touching MS2 must respect these.

### Default theme must preserve the current deployed appearance

- The default theme (call it `current` or `base`) must render the site **exactly as it appears at `https://nastaran-web-clean.vercel.app`**.
- No font swap, no color shift, no spacing change, no layout adjustment as a side effect of introducing the theme system.
- If MS2 ships and someone visits the site without picking a theme, they see the same thing they see today.

### Do not redesign while adding themes

- MS2 is **only** the selector + alternative themes. It is not a chance to revisit hero composition, header chrome, section layouts, gallery behavior, or contact form styling.
- If a polish itch shows up during MS2, file it for MS3 — don't slip it in.

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

Old project's switcher labels: "Base" / "Ornament" / "Element" / "Arch". Those are fine but "Element" reads oddly in Swedish — could be "Elementen" (the elements). Keep labels short, capitalized like proper nouns, with a one-line Swedish hint (the old project's hint pattern: `Nuvarande utseende`, `Mandala · paisley · sanskrit`, etc.).

### Original themes first, new themes second

Inventory below proposes themes derived from the old project's four. **Don't invent a wildly new theme before the four originals are visually documented and selectable.**

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

## 3. Proposed MS2 theme inventory (do not implement yet)

| Theme id | Swedish label | Inspired by | Color palette | Decorations |
|---|---|---|---|---|
| `current` | Nuvarande | Current deployed site | Existing tokens (unchanged). `--color-paper #f4eaf8` base, `--color-accent #8a6aa5`, copper + marigold accents | Lotus + paisley + booti + the always-on `SanskritColumn` (xl+) |
| `ornament` | Ornament | Old project's "ornament" theme | Same base palette as `current`. Slightly stronger purple accent | Adds `MandalaWatermark` top-left and `PaisleyDivider` between every major section. Sanskrit column stays |
| `elements` | Elementen | Old project's "elements" theme (Pancha Mahabhuta) | Same base, slight marigold lift on the page gradient (warmer paper) | Adds `ElementsBand` section between Praktiskt and Kontakt-teaser. Optional small Devanagari glyphs on section markers |
| `arch` | Båge | Old project's "arch" theme (Jharokha) | Same base, slightly deeper aubergine for contact section | Adds `JharokhaArch` SVG behind the hero copy. Subtle. |

**All four themes share the same palette family.** The differences are decorative overlays + tiny per-theme tone adjustments. This matches the old project's intent — themes are seasonings on the same base recipe, not entirely different recipes.

### Optional restrained additions (only if user asks)

| Theme id | Swedish label | Idea | Notes |
|---|---|---|---|
| `kvall` | Kväll (evening) | Slightly desaturated, deeper aubergine page background. Same accents. | A dim-mode aesthetic; not a full dark mode. Optional. |
| `morgon` | Morgon (morning) | Slightly warmer paper tone, brighter copper. | Soft morning light feel. Optional. |

**Do not add these unless the user explicitly wants them.** The four original-derived themes should ship first.

### Implementation sketch (for reference — not a commitment)

```
1. Add per-theme @theme blocks in globals.css:
   :root[data-theme="ornament"] { --color-accent: ... }
   etc.

2. <ThemeSwitcher /> client component:
   - Reads localStorage for stored choice on mount
   - Sets document.documentElement.dataset.theme
   - Renders a small floating button (top-right or bottom-right) with
     a panel that opens to show the swatches + Swedish hints

3. <ThemeDecorations /> client component:
   - Reads the active theme from a context or document.documentElement
   - Conditionally renders MandalaWatermark / PaisleyDivider /
     ElementsBand / JharokhaArch based on the theme

4. Default theme is "current" — if no stored choice, that's what
   renders. No visual change to anyone who doesn't open the switcher.
```

The old project's ThemeSwitcher and ThemeDecorations code can serve as a reference for the React side, but the styling must be Tailwind utilities, not the old project's CSS class system.
