# nastaran-web

Clean Tailwind-first rebuild of Nastaran's site. Premium Swedish-first landing for healing, reiki and massage.

## Status

- **MS1 shipped.** All routes live: home, `/om-mig`, `/berattelser`, `/kontakt`, plus the `/testimonials` → `/berattelser` redirect.
- **MS2 shipped.** Theme selector with four themes: `nuvarande`, `ornament`, `elementen`, `bage`. Default (`nuvarande`) preserves the original deployed look.
- **Request/publish pipeline — planned (PR A docs/spec lands first).** Adapts the validated `shadi-web` pattern: owner submits requests at `/onskemal` (admin-gated pre-launch), a Claude Code operator session processes each request on a per-request branch, owner approves on the queue board at `/onskemal-kogen`. See [`docs/PIPELINE-HANDOFF.md`](./docs/PIPELINE-HANDOFF.md), [`spec/pipeline-mvp.md`](./spec/pipeline-mvp.md), and [`spec/pipeline-operator-modes.md`](./spec/pipeline-operator-modes.md).
- **In production** at https://nastaran-web.vercel.app (auto-deploy from `main` via Vercel ↔ GitHub integration).
- **Deferred.** Real assets to replace Unsplash gallery placeholders, ContactForm backend (currently mailto-only), perf + a11y + SEO audits. See [`spec/`](./spec) for the full living spec.

## Routes

| Path | Notes |
|---|---|
| `/` | Home — hero + 4 spine sections + Kontakt teaser |
| `/om-mig` | About — letter, portrait card, approach, values ledger |
| `/berattelser` | Stories — intro, step-style gallery carousel, story slot grid |
| `/kontakt` | Contact — hero, email + form (calendar), flow, safety note |
| `/testimonials` | Redirects to `/berattelser` |

### Gallery behavior

`/berattelser` uses a step-style carousel: `setTimeout`-driven, advances one card every ~3.5s with a smooth scroll, doubled images for an invisible wrap back to the start. Pauses 2.5s on intentional interaction (pointerdown / focusin / manual arrow + dot clicks). Respects `prefers-reduced-motion`. Uses `next/image` with `fill` + sizes hint. No cached DOM measurement — each step re-queries fresh, so it survives App Router client-side mounts without needing a hard reload.

## Themes (MS2)

Four selectable themes, switcher is the small floating button (top-right). Choice persists in `localStorage`. Default is `nuvarande` (current deployed look — no visual change for visitors who don't open the switcher).

| Theme id | Swedish label | What changes |
|---|---|---|
| `nuvarande` | Nuvarande | Default — base palette, no decorative overlays |
| `ornament` | Ornament | Adds `MandalaWatermark` + the fixed `ॐ शान्ति` `SanskritColumn` on the left edge at xl+ |
| `elementen` | Elementen | Adds inline `ElementsBand` (Pancha Mahabhuta) section on the home page |
| `bage` | Båge | Adds `JharokhaArch` SVG behind the hero copy |

The `SanskritColumn` was previously rendered globally at xl+. It is now gated to the `ornament` theme only.

## Stack

- Next.js 16 (App Router, Turbopack)
- React 19, TypeScript strict
- Tailwind CSS v4 (CSS-first, `@theme` tokens, no `tailwind.config.js`)
- `next/image` with `images.remotePatterns` for the Unsplash gallery placeholders

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server (http://localhost:3000) |
| `npm run build` | Production build |
| `npm run start` | Run the built app |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Continuous integration

GitHub Actions workflow at [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every pull request to `main` and every push to `main`:

- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

All three checks must pass. Deployment is handled by Vercel — the workflow does not deploy.

## Deployment — Vercel

The Vercel ↔ GitHub App integration is already wired for `vampyren/nastaran-web`:

- Every push to `main` becomes a production deployment at https://nastaran-web.vercel.app.
- Every PR gets an auto-built preview URL of the form `https://nastaran-web-git-<branch>-aryan-tech.vercel.app`. Use it on mobile to verify responsive behavior before merging.

No manual import, build-command tweaks, or env vars are required for the current scope.

## Assets

| Asset | Source | Use |
|---|---|---|
| `public/assets/generated/nastaran_space.jpeg` | Old project | Home hero ritual panel |
| `public/assets/generated/nastaran-character-01.jpeg` | Old project | Om-mig portrait |
| `images.unsplash.com` (5 URLs) | Old project's `siteData.ts` | Berättelser gallery placeholders — flagged as placeholders in the Swedish copy. Replace with real assets before public launch, then drop `images.remotePatterns`. |

The Unsplash patterns are whitelisted in `next.config.mjs` via `images.remotePatterns`.

## Conventions

See [`CLAUDE.md`](./CLAUDE.md) for the project conventions Claude Code follows in this repo (branch-first workflow, conventional commit prefixes, quality-gates-before-PR, keep-docs-in-sync rule, internal-English / visible-Swedish naming rule, request/publish pipeline rules).

## Request/publish pipeline docs

- [`docs/PIPELINE-HANDOFF.md`](./docs/PIPELINE-HANDOFF.md) — from-zero setup walkthrough (env vars, PAT, validation smoke test).
- [`docs/REUSABLE-REQUEST-QUEUE-PATTERN.md`](./docs/REUSABLE-REQUEST-QUEUE-PATTERN.md) — cross-project abstract pattern.
- [`spec/pipeline-mvp.md`](./spec/pipeline-mvp.md) — data model, state machine, API contracts, safe edit surface.
- [`spec/pipeline-operator-modes.md`](./spec/pipeline-operator-modes.md) — Mode A operator (Mode B parked).
- [`requests/README.md`](./requests/README.md) — metadata directory + `main`-write exception.
- [`.env.example`](./.env.example) — env var template.

## Spec

The [`spec/`](./spec) folder is the living source of truth for design, implementation, decisions, and risks. **If a PR changes design, routes, assets, content structure, tokens, or PR scope, update the relevant spec file in the same PR.**
