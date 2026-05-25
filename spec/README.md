# Nastaran clean rebuild — spec folder

This folder holds the living specification for the Nastaran website rebuild. The documents capture what we're building, why, and how — extracted from the old project and locked in before implementation begins.

**These are living docs.** As the project evolves, update the relevant file in the same PR that introduces the change. If a PR changes design, routes, assets, content structure, tokens, or PR scope, the matching spec file must be updated alongside the code. Spec drift creates the same kind of debt this rebuild is fixing.

## Project goal

A clean Tailwind-first rebuild of Nastaran's website. The old project remains the strict design and content reference; the new project is a fresh implementation built without the legacy CSS architecture.

- **Design reference is strict.** Same color world, same typography mood, same spacing rhythm, same decorative restraint, same Swedish-first tone.
- **Implementation is fresh.** No cascade chains, no large semantic class systems, no `@apply` migration structure, no theme-only override layers.

## Paths

- **Old reference project (read-only):** `/home/spawn/Apps/nastaran-web`
- **New project root (this repo):** `/home/spawn/Apps/projects/nastaran-web`
- **Target GitHub repo:** `vampyren/nastaran-web-clean` (private)
- **Old preview (untouched):** Cloudflare tunnel from the old project remains the stable preview.
- **New preview target:** Vercel preview deployments (configured in MS2).

## Files in this folder

| File | Contents |
|---|---|
| `README.md` | This file. Index and update rule. |
| `design-spec.md` | Extracted design source of truth: colors, type scale, spacing, motifs, image direction, motion, anti-goals. |
| `implementation-spec.md` | How MS1 is built: tech stack, `globals.css` contract, forbidden CSS patterns, component structure, routes, content/asset strategy, Vercel plan, quality gates. |
| `decisions-and-open-questions.md` | Locked decisions, recommended defaults for open questions, full PR/milestone breakdown, risks that could leak legacy CSS debt into the rebuild. |

## Update rule

| If a PR changes… | …update this file |
|---|---|
| Design (colors, type, spacing, motifs, motion, anti-goals) | `design-spec.md` |
| Route added / removed / renamed | `implementation-spec.md` |
| Asset added / removed / replaced | `implementation-spec.md` |
| Content source structure | `implementation-spec.md` |
| Token added / removed / renamed | `design-spec.md` + `implementation-spec.md` |
| PR scope or milestone | `decisions-and-open-questions.md` |
| New locked decision | `decisions-and-open-questions.md` |
| New risk discovered | `decisions-and-open-questions.md` |

Keep these docs honest.
