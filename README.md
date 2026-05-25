# nastaran-web-clean

Clean Tailwind-first rebuild of Nastaran's website. Premium Swedish-first landing for healing, reiki and massage.

## Status

- MS1 complete: home, `/om-mig`, `/berattelser`, `/kontakt` and `/testimonials` (→ `/berattelser`) routes shipped.
- See [`spec/`](./spec) for the living specification.
- Old project remains the stable preview during the rebuild (`/home/spawn/Apps/nastaran-web`, Cloudflare tunnel).

## Routes

| Path | Notes |
|---|---|
| `/` | Home — hero + 5 spine sections + Kontakt teaser |
| `/om-mig` | About — letter, portrait card, approach, values ledger |
| `/berattelser` | Stories — intro, gallery carousel, story slot grid |
| `/kontakt` | Contact — hero, email + form (calendar), flow, safety note |
| `/testimonials` | Redirects to `/berattelser` |

## Stack

- Next.js (App Router)
- React 19, TypeScript strict
- Tailwind CSS v4 (CSS-first, no `tailwind.config.js`)
- Framer Motion (restrained) — currently used via the `Reveal` wrapper, which is a CSS-keyframe entrance since the project ships SSR-safe markup
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

## Deployment — Vercel

1. Go to https://vercel.com/new and **Import Git Repository**.
2. Pick `vampyren/nastaran-web-clean` (private repo). Authorize access if prompted.
3. Settings:
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: `next build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)
   - **Environment Variables**: none required for MS1
4. Click **Deploy**.
5. After the first deploy, every push to `main` becomes a production deployment, and every PR gets a preview URL. Use the preview URL on your phone to test the responsive design.

The old Cloudflare tunnel preview is untouched and continues to run independently.

## Assets

| Asset | Source | Use |
|---|---|---|
| `public/assets/generated/nastaran_space.jpeg` | Old project | Home hero ritual panel |
| `public/assets/generated/nastaran-character-01.jpeg` | Old project | Om-mig portrait |
| `images.unsplash.com` (5 URLs) | Old project's `siteData.ts` | Berättelser gallery placeholders — flagged as placeholders in the Swedish copy. Replace with real assets before public launch. |

The Unsplash patterns are whitelisted in `next.config.mjs` via `images.remotePatterns`.

## Spec

The `spec/` folder is the living source of truth for design, implementation, decisions, and risks. **If a PR changes design, routes, assets, content structure, tokens, or PR scope, update the relevant spec file in the same PR.**
