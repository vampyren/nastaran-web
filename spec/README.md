# Nastaran clean rebuild — spec folder

This folder holds the living specification for the Nastaran website rebuild. The documents capture what we're building, why, and how — extracted from the original design source and locked in before implementation begins.

**These are living docs.** As the project evolves, update the relevant file in the same PR that introduces the change. If a PR changes design, routes, assets, content structure, tokens, or PR scope, the matching spec file must be updated alongside the code. Spec drift creates the same kind of debt this rebuild is fixing.

## Project goal

A clean Tailwind-first rebuild of Nastaran's website — faithful to the original design and content (color world, typography, spacing, tone) but implemented fresh, without the previous cascade-heavy CSS architecture.

- **Design reference is strict.** Same color world, same typography mood, same spacing rhythm, same decorative restraint, same Swedish-first tone.
- **Implementation is fresh.** No cascade chains, no large semantic class systems, no `@apply` migration structure, no theme-only override layers.

## Paths

- **Project root (this repo):** `/home/spawn/Apps/projects/nastaran-web`
- **Target GitHub repo:** `vampyren/nastaran-web` (private)
- **Earlier preview (historical):** during the rebuild a Cloudflare tunnel served as the stable preview (now superseded by Vercel).
- **New preview target:** Vercel preview deployments (configured in MS2).

## Files in this folder

| File | Contents |
|---|---|
| `README.md` | This file. Index and update rule. |
| `design-spec.md` | Extracted design source of truth: colors, type scale, spacing, motifs, image direction, motion, anti-goals. |
| `implementation-spec.md` | How MS1 is built: tech stack, `globals.css` contract, forbidden CSS patterns, component structure, routes, content/asset strategy, Vercel plan, quality gates. |
| `decisions-and-open-questions.md` | Locked decisions, recommended defaults for open questions, full PR/milestone breakdown, risks that could leak prior CSS debt into the rebuild. |
| `pipeline-mvp.md` | Request/publish pipeline spec: data model, state machine, API contracts, safe edit surface, validation stack, acceptance criteria. |
| `pipeline-operator-modes.md` | Mode A foreground listener pattern (current). Mode B (cron wrapper) parked. |

For the from-zero setup walkthrough, the cross-project pattern, and the metadata-directory conventions, see [`../docs/PIPELINE-HANDOFF.md`](../docs/PIPELINE-HANDOFF.md), [`../docs/REUSABLE-REQUEST-QUEUE-PATTERN.md`](../docs/REUSABLE-REQUEST-QUEUE-PATTERN.md), and [`../requests/README.md`](../requests/README.md).

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
| Pipeline data model, state machine, API contract, or safe edit surface | `pipeline-mvp.md` |
| Operator mode behavior, listener cadence, or four-tier classification rule | `pipeline-operator-modes.md` |

Keep these docs honest.
