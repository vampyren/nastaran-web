# Implementation spec — MS1

How the new project is built. Strict rules for what's in, what's out, and what the file structure looks like.

## Tech stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js latest stable (App Router) | Server components by default; client components only where needed |
| Language | TypeScript strict mode | `"strict": true` in `tsconfig.json` |
| UI | React 19 | |
| Styling | Tailwind CSS v4, CSS-first | `@import "tailwindcss"` + `@theme` tokens; no `tailwind.config.js` |
| Images | `next/image` | Local-first; `images.remotePatterns` only when remote URLs ship |
| Motion | Framer Motion (restrained) | Hero entrance + section reveals only — see `design-spec.md` §Motion direction |
| Icons | Inline SVG motif components | **No `lucide-react` in MS1** |
| CI | **None in MS1** | Added in MS2 |
| Deployment | Vercel previews (configured in MS2) | Old Cloudflare preview stays untouched |

## `globals.css` contract

**Target size: under 80 lines.** The file is allowed to contain only:

```css
@import "tailwindcss";

@theme {
  /* color tokens — see design-spec.md §Color tokens */
  --color-paper: #f4eaf8;
  /* …all 14 colors… */

  /* fonts (Next/font assigns variables to <html>) */
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-serif: var(--font-newsreader), Georgia, "Times New Roman", serif;

  /* type scale tokens — see design-spec.md §Typography */
  --text-display: 50px;
  --text-display--line-height: 49px;
  /* …etc… */

  /* radius / shadow tokens — see design-spec.md */
  --radius-panel-soft: 26px;
  --radius-panel-flare: 70px;
  --shadow-rail: 0 18px 54px rgba(54,34,62,0.08);
  /* …etc… */
}

/* Minimal reset / base */
* { box-sizing: border-box; }
html { color: var(--color-ink); font-family: var(--font-sans); scroll-behavior: smooth; }
body { margin: 0; min-width: 320px; overflow-x: clip; -webkit-font-smoothing: antialiased; }
a { color: inherit; text-decoration: none; }

/* Page background — kept as a CSS variable because it's a 4-layer gradient */
:root {
  --bg-page: /* see design-spec.md §Body background */;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

The single `!important` block above is the only `!important` allowed in the entire project. It exists because reduced-motion preferences must override any utility class.

## Forbidden CSS patterns

| Pattern | Why forbidden |
|---|---|
| Old `globals.css` architecture, copied or adapted | The whole reason for the rebuild |
| Large semantic class systems (`.section-shell`, `.contact-section h2`, `.row-list p`, `.about-letter`, etc.) | Tightly couples CSS to specific markup; creates the cascade chains we're escaping |
| Cascade-heavy selector chains | Source-order specificity hell |
| Source-order / specificity-dependent styling | Same as above |
| `@apply` directives | Allowed only for the smallest shared primitives. Default position: no `@apply` |
| `!important` (outside the reduced-motion block) | Sign of cascade fighting |
| `:not()` selector chains | Same |
| `body::before` / `body::after` decorations | Move to dedicated `<div>` in `RootLayout` |
| Theme system / `data-theme` attribute in MS1 | Themes are MS2 only; MS1 must not include any theme infrastructure |
| Custom breakpoints beyond Tailwind defaults | Stick to `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536`. Custom breakpoints require a PR comment justifying why |
| Polish-layer files (`D7`, `D8`, …) overriding earlier rules | Design changes go into the component that owns them |

## Component structure

```
src/
├── app/
│   ├── layout.tsx              # RootLayout: fonts, base wrapper, skip link, body bg + dot overlay
│   ├── page.tsx                # Home
│   ├── globals.css             # see contract above
│   ├── om-mig/page.tsx         # MS1.2
│   ├── berattelser/page.tsx    # MS1.2
│   ├── kontakt/page.tsx        # MS1.3
│   └── testimonials/page.tsx   # redirect → /berattelser (or / until /berattelser ships)
├── components/
│   ├── SiteHeader.tsx          # client; top rail, mobile menu, scroll-spy section active
│   ├── SiteFooter.tsx          # server
│   ├── SkipLink.tsx
│   ├── BodyBackground.tsx      # body gradient + dot overlay (replaces body::before/::after)
│   ├── ui/
│   │   ├── TextCTA.tsx         # variants: 'light' (aubergine bg/paper text) | 'dark' (marigold bg/aubergine text)
│   │   ├── Reveal.tsx          # client; Framer Motion fade+rise wrapper; respects prefers-reduced-motion
│   │   └── Panel.tsx           # variants: 'paper' | 'lavender' | 'sandalwood' | 'aubergine'; asymmetric radius props
│   ├── motifs/
│   │   ├── LotusRosette.tsx
│   │   ├── PaisleyArch.tsx
│   │   ├── SectionClose.tsx    # [PaisleyArch, LotusRosette, PaisleyArch]
│   │   ├── BootiField.tsx
│   │   └── LavenderSprig.tsx   # exported but not rendered in MS1
│   └── home/
│       ├── Hero.tsx
│       ├── SectionShell.tsx    # rail + numeral + lotus + label + h2 + body + children + section close; tone prop
│       ├── TreatmentPanels.tsx
│       ├── RhythmStrip.tsx
│       ├── PreparationList.tsx
│       ├── InformationLedger.tsx
│       └── ContactTeaser.tsx
└── content/
    ├── site.ts                 # navItems, contactEmail, site meta
    └── home.ts                 # heroFacts, treatmentRows, preparationRows, informationRows, rhythmWords + inline copy
```

**Component principles:**

- All styling lives as Tailwind utility classes in JSX.
- No semantic class names like `.section-shell` or `.contact-section`. Variants are React props.
- Components are explicit and readable — a developer can understand the styling without context-switching to a CSS file.
- If a primitive repeats three times across components, make it a sub-component, not a CSS class.

**Components added in later PRs:**

- MS1.2 PR3: `src/components/om-mig/` — `AboutLetter`, `PortraitCard`, `AboutApproach`, `AboutLedger`
- MS1.2 PR4: `src/components/berattelser/GalleryCarousel.tsx`, `StoriesIntro`, `StoryGrid`
- MS1.3 PR5: `src/components/kontakt/ContactForm.tsx` + calendar sub-components (`CalendarMonth`, `CalendarDay`, `TimeslotPicker`), `ContactFlow`, `ContactDeepNote`

## Route / page structure

| Route | MS | Sections |
|---|---|---|
| `/` | MS1 PR2 | Hero · Behandlingar · Rytm · Inför besök · Praktisk information · Kontakt-teaser |
| `/om-mig` | MS1.2 PR3 | About-editorial · About-approach · About-ledger |
| `/berattelser` | MS1.2 PR4 | Stories-intro · Gallery section (carousel) · Story grid |
| `/kontakt` | MS1.3 PR5 | Contact-page-hero · Contact-form-section (calendar) · Contact-flow · Contact-deep-note |
| `/testimonials` | MS1 PR1 | Redirect → `/berattelser` (or `/` in MS1 until target exists) |

## Content strategy

- Old `siteData.ts` is the only existing content module; it holds nav + email + gallery URLs.
- All other Swedish copy lives inline in the old `page.tsx` files (`heroFacts`, `treatmentRows`, `preparationRows`, etc.).
- For the new project, content moves into `src/content/*.ts` modules. Each page imports its strings from there.
- **Swedish copy is ported verbatim by copy-paste** from the old source files. No manual retyping.
- **Copy-drift protection:** in MS2, add `scripts/check-copy.ts` that diffs critical strings against a frozen snapshot. CI flags any string change.

## Asset strategy

| Asset | Action | Notes |
|---|---|---|
| `public/assets/generated/nastaran_space.jpeg` | Copy verbatim | Home hero ritual panel |
| `public/assets/generated/nastaran-character-01.jpeg` | Copy verbatim | Om-mig portrait card |
| 5 Unsplash gallery URLs (`ceremonyImages`) | Reuse via `next/image` with `images.remotePatterns` for `images.unsplash.com` in MS1.2 | Flag clearly as placeholders in README and on the page |
| Any other image | **Not allowed without explicit approval** | No random stock |

**`next/image` handling:**

- Local images use the default loader.
- Remote (Unsplash placeholders) require `images.remotePatterns` configured before MS1.2 PR4 ships.
- Hero image gets `priority`; others use lazy loading.
- `sizes` attribute matches the responsive layout.

## Vercel preview plan

- **MS1:** No Vercel config in repo. `next.config.mjs` stays minimal (`reactStrictMode: true`). Vercel auto-detects Next on connect.
- **MS2:** Connect repo to Vercel for automatic preview deployments per PR. Add `README.md` deployment notes.
- **Build command:** `next build` (default).
- **Output:** `.next` (default).
- **Env vars:** none in MS1. Document in README when any are added.
- **Redirects:** `/testimonials` → `/berattelser` handled by a route file using `redirect()` from `next/navigation`, not Vercel config.
- **Old Cloudflare preview (historical):** during the rebuild a Cloudflare tunnel served as the stable preview. The new site is now deployed on Vercel.

## Local quality gates

All three must pass before any PR is opened or merged:

| Command | What it does |
|---|---|
| `npm run lint` | ESLint with `eslint-config-next` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | `next build` — must succeed cleanly, no warnings about deprecated APIs or missing types |

No CI in MS1. Developer (and Claude) runs these locally before pushing. (CI added in MS2 via `.github/workflows/ci.yml` — same three commands; see [`CLAUDE.md`](../CLAUDE.md) § Quality gates.)

## MS3 — request/publish pipeline (planned)

Adapts the validated `shadi-web` request/publish pipeline. Full implementation spec at [`./pipeline-mvp.md`](./pipeline-mvp.md). Operator mode at [`./pipeline-operator-modes.md`](./pipeline-operator-modes.md). From-zero setup at [`../docs/PIPELINE-HANDOFF.md`](../docs/PIPELINE-HANDOFF.md).

### New routes (lands across PR C + PR D)

| Route | MS | Purpose |
|---|---|---|
| `/admin` | MS3 PR C | Owner hub. Cookie-gated; anonymous → `/admin/login`. |
| `/admin/login` | MS3 PR C | Login form. POSTs to `/api/admin/login`. |
| `/onskemal` | MS3 PR C | Request form. **Pre-launch admin-gated** — anonymous → `/admin/login?next=...`. |
| `/onskemal-kogen` | MS3 PR C | Admin queue board (four sections: `Väntar i kö`, `Aktivt i review`, `Fel`, `Klart`). Cookie-gated. |
| `/api/admin/login` `/logout` `/me` | MS3 PR B | Session lifecycle. |
| `/api/feedback` | MS3 PR D | Request intake. **Pre-launch admin-gated.** Hard-codes write path to `requests/<id>.json`. |
| `/api/list` | MS3 PR D | Queue read. Cookie-gated. |
| `/api/approve/[id]` `/reject/[id]` `/iterate/[id]` | MS3 PR D | Terminal actions. Cookie + same-origin. |
| `/api/admin/retry/[id]` | MS3 PR D | `failed → queued`. Cookie + same-origin. |

### New top-level paths

- `requests/` — per-request JSON metadata. `requests/<id>.json` is the single source of truth on `main`. Hard-coded write path; no other paths under `requests/` are ever touched. See [`../requests/README.md`](../requests/README.md).
- `.env.example` — Vercel env var template (`GITHUB_TOKEN`, `GITHUB_REPO`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`).

### New components

- `src/components/AdminFAB.tsx` (PR C) — floating Admin menu, bottom-right, **logged-in-only** (probes `/api/admin/me` on mount; hides if anonymous).
- `src/app/admin/{page,AdminHub}.tsx` (PR C) — owner hub with four cards.
- `src/app/admin/login/{page,LoginForm}.tsx` (PR C).
- `src/app/onskemal/{page,OnskemalForm}.tsx` (PR C) — request form with Swedish sensitive-content warning above the textarea (see `pipeline-mvp.md`).
- `src/app/onskemal-kogen/{page,QueueBoard}.tsx` (PR C) — queue board with auto-refresh every 30 s.

### New library

- `src/lib/auth.ts` (PR B) — `requireAdmin`, `hasAdminSession`, `assertSameOrigin`, `timingSafeCompare`, `createSession`, `verifySession`. Cookie `nastaran-admin`.
- `src/lib/request-types.ts` (PR B) — `Request` type + `RequestStatus` union.
- `src/lib/request-store.ts` (PR B) — SHA-CAS write helper with state-machine recheck on 409.
- `src/lib/github.ts` (PR B) — Octokit wrapper.
- `src/lib/pages.ts` (PR B) — `ALLOWED_PAGE_IDS`, `PAGE_LABELS`, `sanitizePageId`, `routeForPage`.

### Modified components

- `src/app/layout.tsx` (PR C) — renders `<AdminFAB />`.
- `src/components/SiteFooter.tsx` (PR C) — adds a TEMPORARY visible "Admin" link with code comment for removal before public launch.

### New runtime dependency

- `octokit@^4` (PR B). No other runtime deps added.

### Quality gates remain unchanged

Same three gates (`lint`, `typecheck`, `build`). All pipeline code must pass before push, both locally and in CI. The pipeline does not add a test script — manual smoke test per [`../docs/PIPELINE-HANDOFF.md`](../docs/PIPELINE-HANDOFF.md) § 4.
