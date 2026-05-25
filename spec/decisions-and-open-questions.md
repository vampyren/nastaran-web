# Decisions and open questions

## A. Locked decisions

| Decision | Reason |
|---|---|
| New repo instead of branch | Old PR became a hybrid CSS migration not worth continuing |
| Repo name: `vampyren/nastaran-web-clean` | Avoid the `-v2` suffix that ages awkwardly |
| Old site (Cloudflare tunnel) remains the stable preview | Don't risk the working site during rebuild |
| New site targets Vercel previews later | Cleaner GitHub-integrated preview workflow for a new project |
| Tailwind-first fresh implementation | The whole point of the rebuild |
| Old site is strict design/content reference | Same look and feel, fresh implementation only |
| **No theme switcher in MS1** | Build one solid visual treatment first; themes are MS2 if MS1 stays clean |
| **Token-based theme system in MS2 only if MS1 stays clean** | Avoid recreating the theme-overlay CSS that contributed to the old cascade hell |
| **Framer Motion included from start, restrained only** | Subtle hero entrance + section reveals; no flashy animation, must respect `prefers-reduced-motion` |
| **No `lucide-react` in MS1** | Old project pulled it in but never imported it; inline SVG motif components are sufficient |
| **No GitHub Actions CI in MS1** | Adds scope to an already-shaped first PR; defer to MS2 |
| **CI in MS2** (lint + typecheck + build on PR) | Once scaffold and first meaningful route ship |
| **MS1 local quality gates only:** `npm run lint`, `npm run typecheck`, `npm run build` | Developer-run, not enforced by automation yet |
| Tech stack: Next.js App Router · React 19 · TS strict · Tailwind v4 CSS-first · `next/image` · Framer Motion (restrained) | All chosen and locked |
| Source of truth for design extraction: old local project at `/home/spawn/Apps/nastaran-web` (not the Cloudflare URL) | Direct file access, exact hex values |
| Swedish copy ported verbatim by copy-paste from old source files | Avoid manual retyping → copy drift |
| Old `globals.css` architecture forbidden in new project | Cascade-heavy semantic class system was the original problem |

## B. Current recommended answers to open questions

These are the defaults. They apply unless the user explicitly overrides.

### 1. MS1 scope — shell + Home only

**Recommendation:** MS1 is PR1 (scaffold + tokens + shell + motifs + spec docs) and PR2 (home page). Other routes are MS1.2 / MS1.3 after MS1 is reviewed.

**Reason:** Keeps the first visual review small and self-contained. Verifies the token system, `globals.css` contract, and component patterns are working before applying them across four routes. Prevents CSS debt from spreading early.

### 2. `/berattelser` gallery — reuse what the old project already uses

**Recommendation:** When MS1.2 PR4 lands, reuse the 5 Unsplash URLs already in `siteData.ts` (`ceremonyImages`). Add `images.remotePatterns` for `images.unsplash.com` in `next.config.mjs` so `next/image` works. Mark clearly in README and in the gallery copy itself that these are placeholders pending real assets.

**Reason:** The old project already uses these placeholders and flags them in Swedish ("Exempelbild från Unsplash"). Don't add new random stock. Don't block the gallery route on missing assets.

### 3. `LavenderSprig` motif — keep available, don't force into MS1

**Recommendation:** Include `LavenderSprig.tsx` in `src/components/motifs/` as an exported component (preserve the original SVG paths), but do not render it on any MS1 route. Available for MS2 or later if it supports the visual identity.

**Reason:** The old project declares it but doesn't actually render it on Home. Don't invent new placements in MS1.

**Update after PR2 visual review:** Two formerly MS2-only motifs were promoted into MS1 for decorative polish:

- `SanskritColumn` (ॐ · शान्ति · Shanti · Fred) on the left edge at xl+ — rendered in `RootLayout`, opacity 0.82, fixed position, aria-hidden.
- `PaisleyDivider` between Hero/Behandlingar and Information/Kontakt — accent color, opacity 0.55.

These were added as ornaments only — **no `data-theme` attribute, no theme switcher, no ornament/elements/arch theme infrastructure**. Theme system itself remains MS2.

### 4. Body dot pattern — preserve with forced-colors safety gate

**Recommendation:** Preserve the body-wide dot pattern, but move it from `body::before` to a dedicated `<BodyBackground>` component in `RootLayout`. Keep the `@media (forced-colors: none)` gate so the pattern doesn't fight accessibility/contrast modes.

**Reason:** The pattern contributes meaningfully to the premium feel. The forced-colors gate is correct safety behavior. Moving it to a real element instead of a body pseudo-element makes the architecture clean.

### 5. GitHub repo creation — at PR1 if `gh` is authenticated

**Recommendation:** At the start of MS1 PR1, run `gh auth status`. If authenticated, create `vampyren/nastaran-web-clean` as a private repo with `gh repo create … --private --source=. --remote=origin`. If not authenticated, initialize locally with `git init` and print the exact `gh repo create` command for the user to run manually.

**Reason:** Commits push to GitHub from the start, which is cleaner than a late-stage migration.

## C. PR / milestone breakdown

### MS1 — clean rebuild visually reviewable

#### PR1 — scaffold + tokens + shell + motifs + spec docs

**Scope:**

- `create-next-app` scaffolded then trimmed to App Router + TS strict + Tailwind v4
- `@theme` tokens (colors, fonts, type scale, radii, shadows)
- Minimal `globals.css` (under 80 lines)
- Fonts wired via `next/font/google` (Inter + Newsreader)
- `RootLayout` with `BodyBackground` (gradient + dot overlay) and `SkipLink`
- `SiteHeader` (top rail, mobile menu, scroll-spy) + `SiteFooter`
- Motif components: `LotusRosette`, `PaisleyArch`, `SectionClose`, `BootiField`, `LavenderSprig`
- `TextCTA`, `Reveal`, `Panel` UI primitives
- `src/content/site.ts` (nav, contact email, site meta)
- Empty `/` page rendering the shell
- `/testimonials` redirect to `/` (retargets to `/berattelser` in MS1.2)
- GitHub repo created at `vampyren/nastaran-web-clean` if `gh` is authenticated
- `spec/` docs (this folder) committed

**Expected files:**

- `package.json`, `tsconfig.json`, `next.config.mjs`, `eslint.config.mjs`, `postcss.config.mjs`
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/app/testimonials/page.tsx`
- `src/components/` (~10 files across `motifs/`, `ui/`, plus shell)
- `src/content/site.ts`
- `public/` (favicon only)
- `spec/` (4 markdown files)
- `README.md`

**Acceptance checks:**

- `npm run lint && npm run typecheck && npm run build` all green
- Home page renders shell with empty `<main>` (header, footer, body background visible)
- Nav active state works on `/`
- Mobile menu opens / closes; Escape closes it
- `globals.css` ≤ 80 lines
- No `data-theme` attribute anywhere
- No `!important` outside the reduced-motion block, no `:not()` chains, no `@apply` outside any tiny primitive
- Lighthouse a11y ≥ 95 on the empty home

**Quality gates:** `npm run lint`, `npm run typecheck`, `npm run build`.

#### PR2 — home page implementation

**Scope:**

- `src/content/home.ts` with `heroFacts`, `treatmentRows`, `preparationRows`, `informationRows`, `rhythmWords`, plus inline copy strings (verbatim from old `page.tsx`)
- `Hero` component (image, booti, lotus, intro, body, hero-facts dl, CTA) with Framer Motion entrance
- `SectionShell` reusable section frame; `tone` prop for paper / sandalwood / aubergine variants
- `TreatmentPanels`, `RhythmStrip`, `PreparationList`, `InformationLedger`, `ContactTeaser`
- Local images copied to `public/assets/generated/`
- `<Reveal>` wrapping section h2s

**Expected files:**

- `src/app/page.tsx` (full home)
- `src/components/home/` (7 files)
- `src/content/home.ts`
- `public/assets/generated/nastaran_space.jpeg`, `nastaran-character-01.jpeg`

**Acceptance checks:**

- Pixel-close to old `/` at sm / md / lg / xl; any deviation documented in the PR body with reason
- Hero entrance animation visible on first paint, suppressed under `prefers-reduced-motion`
- Section reveals on scroll (once per element)
- All Swedish strings match old source exactly
- `globals.css` still ≤ 80 lines (no growth from PR1)
- Lighthouse a11y ≥ 95

**Quality gates:** `npm run lint`, `npm run typecheck`, `npm run build`.

**MS1 milestone — stop after PR2 for review.**

### MS1.2 — about + stories

#### PR3 — `/om-mig`

**Scope:** `src/content/om-mig.ts`; `om-mig/page.tsx`; new components `AboutLetter`, `PortraitCard`, `AboutApproach`, `AboutLedger`.

**Expected files:** `src/app/om-mig/page.tsx`, `src/content/om-mig.ts`, ~4 new components under `src/components/om-mig/`.

**Acceptance checks:** Pixel-close to old `/om-mig`. Portrait image renders. `prefers-reduced-motion` honored. `globals.css` still under contract.

**Quality gates:** lint, typecheck, build.

#### PR4 — `/berattelser` + gallery carousel

**Scope:** `src/content/berattelser.ts`; `berattelser/page.tsx`; `GalleryCarousel` ported with Tailwind styling (scroll-snap + IntersectionObserver pattern from old code). Add `images.remotePatterns` for `images.unsplash.com` in `next.config.mjs`. Retarget `/testimonials` redirect to `/berattelser`. Update README with placeholder image note.

**Expected files:** `src/app/berattelser/page.tsx`, `src/content/berattelser.ts`, `src/components/berattelser/GalleryCarousel.tsx`, `next.config.mjs` (updated), `README.md` (updated).

**Acceptance checks:** Pixel-close to old `/berattelser`. Gallery scroll + indicators + auto-advance work. Lighthouse a11y ≥ 95.

**Quality gates:** lint, typecheck, build.

### MS1.3 — contact

#### PR5 — `/kontakt` + ContactForm calendar

**Scope:** `src/content/kontakt.ts`; `kontakt/page.tsx`; port `ContactForm` (months / weeks / timeslots / mailto). Calendar styling rewritten in Tailwind utilities; calendar logic ported verbatim from old `ContactForm.tsx`.

**Expected files:** `src/app/kontakt/page.tsx`, `src/content/kontakt.ts`, `src/components/kontakt/ContactForm.tsx`, small sub-components for calendar month / day cells.

**Acceptance checks:** Pixel-close to old `/kontakt`. Calendar selects up to 3 dates; time selects work; mailto compose works. `prefers-reduced-motion` honored.

**Quality gates:** lint, typecheck, build.

### MS2 — CI and optional themes

#### PR6 — CI

**Scope:** `.github/workflows/ci.yml` running lint + typecheck + build on PR. Optional: PR template, CODEOWNERS. Optional: `scripts/check-copy.ts` to catch Swedish copy drift.

**Expected files:** `.github/workflows/ci.yml`, possibly `.github/PULL_REQUEST_TEMPLATE.md`, possibly `scripts/check-copy.ts`.

**Acceptance checks:** CI green on a clean branch. CI red on an intentionally broken branch.

**Quality gates:** CI runs the same three commands.

#### PR7 (optional) — token-based theme system

**Scope:** Only if MS1 stays clean. Add `data-theme="base|ornament|elements|arch"` on `<html>` swapping `@theme` token blocks. Restore `MandalaWatermark`, `PaisleyDivider`, `JharokhaArch`, `SanskritColumn`, `ElementsBand` as opt-in components per theme. Small floating theme switcher.

**Expected files:** updates to `globals.css`, new motif components, `src/components/ThemeSwitcher.tsx`, `src/app/layout.tsx`.

**Acceptance checks:** Theme switch happens without layout shift. No `!important`. No theme-only override layers. Existing pages render identically under `base` theme (no regressions).

**Quality gates:** CI green.

## D. Risks that could leak legacy CSS debt into the rebuild

| Risk | Mitigation |
|---|---|
| **Copying old `globals.css` directly.** Tempting to paste the `:root` block and "clean up later." | Hard rule: no copy-paste from old `globals.css` except hex values into `@theme` tokens. Reviewer greps for distinctive old strings like `D7`, `D8`, `D9`, `D10`. |
| **Bringing semantic CSS class systems into the new project.** `.section-shell`, `.contact-section h2`, `.row-list p` are easy to recreate by habit. | Forbidden in CSS. Variants are React props. PR review greps for any class starting with `.section-`, `.contact-`, `.row-`, `.about-`, `.page-`, `.gallery-`. |
| **Retyping Swedish copy manually.** Subtle typos and wording drift creep in. | All Swedish strings ported by copy-paste from old source. MS2 adds `scripts/check-copy.ts` snapshot diff in CI. |
| **Introducing theme infrastructure too early.** Boot script in `<head>`, `data-theme` attribute, `theme-only-*` classes. | Hard rule: no `data-theme` attribute on `<html>` in MS1. No `theme-only-*` class names. Reviewer greps for `data-theme` and `theme-only`. |
| **Over-animating the design.** Framer Motion is fun and the temptation to animate everything is real. | Hard rule: only the placements listed in `design-spec.md` §Motion direction. Every new Framer Motion call requires a PR comment justifying it. |
| **Adding dependencies before there is a real need.** `lucide-react`, headless UI libs, animation libs. | Hard rule: no new runtime dependency in any PR without a PR comment explaining why. MS1 runtime deps locked: `next`, `react`, `react-dom`, `framer-motion`. Dev deps locked: `tailwindcss`, `@tailwindcss/postcss`, `typescript`, `eslint`, `eslint-config-next`, `@types/*`. |
| **Random stock images instead of approved local assets.** Easy to grab a stock photo "to fill the gallery." | Hard rule: no new image asset without explicit approval. Reviewer greps for new files in `public/assets/`. |
| **`@apply` creeping in.** Especially for "I'll just reuse this 5-utility chain across 3 components." | Default: no `@apply`. If a pattern repeats 3+ times, make a sub-component, not a CSS class. Any `@apply` in a PR requires a PR comment. |
| **Custom breakpoints.** Old project had 14+. Tailwind defaults to 5. | Hard rule: any custom breakpoint in `@theme --breakpoint-*` requires a PR comment explaining why. |
| **Polish layers.** "I'll add a polish file later to fix this one thing." | Hard rule: no `polish.css`, no `overrides.css`, no `Dxx` layered comments in `globals.css`. Design changes go into the component that owns them. |
