# nastaran-web-clean

Clean Tailwind-first rebuild of Nastaran's website. Premium Swedish-first landing for healing, reiki and massage.

## Status

- MS1 in progress. See [`spec/`](./spec) for the living specification.
- Old project remains the stable preview during the rebuild (`/home/spawn/Apps/nastaran-web`).

## Stack

- Next.js (App Router)
- React 19, TypeScript strict
- Tailwind CSS v4 (CSS-first, no `tailwind.config.js`)
- Framer Motion (restrained — hero entrance and section reveals only)
- `next/image` with local-first assets

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

Then open http://localhost:3000.

## Deployment (Vercel)

Configured in MS2. Vercel auto-detects the Next.js App Router build:

- Build command: `next build` (default)
- Output: `.next` (default)
- No environment variables required.

The old Cloudflare tunnel preview at the old project remains untouched until this rebuild is ready.

## Spec

The `spec/` folder is the living source of truth for design, implementation, decisions, and risks. **If a PR changes design, routes, assets, content structure, tokens, or PR scope, update the relevant spec file in the same PR.**
