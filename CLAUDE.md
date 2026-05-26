# Project conventions — nastaran-web

## Branch-first workflow (strict)

**Never commit directly to `main`.** Every code change goes through a feature branch + PR, even one-line fixes.

Before making any edit/write that modifies committed code:

1. Check the current branch: `git branch --show-current`.
2. If it's `main`, stop and propose a branch name. Conventional prefixes:
   - `feat/<short-name>` — new feature
   - `fix/<short-name>` — bug fix
   - `refactor/<short-name>` — restructuring with no behavior change
   - `cleanup/<short-name>` — small tidy-ups
   - `chore/<short-name>` — tooling, deps, config, docs
3. Confirm the name with the user, then `git checkout -b <name>`.

When the change is done:

1. `git add <specific files>` (not `-A` / `.`).
2. `git commit -m "<conventional commit message>"` (subject under 70 chars, type prefix matches branch prefix).
3. `git push -u origin <branch>`.
4. `gh pr create --base main --head <branch> --title "..." --body "..."` with a Summary + Test plan.
5. After the user confirms or asks to merge: `gh pr merge <#> --squash --delete-branch`.
6. `git checkout main && git pull && git remote prune origin`.

**Squash by default.** The PR's final commit subject becomes the main-branch history; keep it conventional.

**Exceptions** (only with explicit user instruction in this session):
- Direct commit to `main` if the user says "commit straight to main" or equivalent.
- Skipping the PR for purely local / uncommitted exploration.

If a hook fails during commit, **fix the underlying issue and create a new commit** — never `--no-verify` and never `--amend` a failed commit.

## Tech stack quick-ref

- Next.js 16 (App Router, Turbopack)
- TypeScript strict
- Tailwind CSS v4 (CSS-first, `@theme` tokens) — Tailwind-first; reach for global CSS only when a token/utility can't express the effect cleanly
- Deployed via Vercel (team `aryan-tech`), auto-deploy from `main`
- GitHub repo: `vampyren/nastaran-web`

## Quality gates

Run before opening a PR:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

All three must pass. The build is part of the gate, not optional.

## Keep documentation in sync

**Docs that describe what the code is or how it works must be updated in the same PR as the code change.** Stale docs are worse than no docs — they actively mislead.

Doc surfaces in this repo, and what should trigger an update:

| Doc | Update when… |
|---|---|
| `README.md` | Run/build/deploy instructions change, new top-level scripts, env vars added, repo URL or stack basics change. |
| `CLAUDE.md` | Conventions, workflow rules, or tech stack basics shift. |
| `spec/design-spec.md` | Visual system, themes, motifs, tokens, or layout/spine architecture changes. |
| `spec/implementation-spec.md` | New routes, milestone scope shifts, completed/added/dropped PRs in the roadmap. |
| `spec/decisions-and-open-questions.md` | A new architectural decision is made, an open question is resolved, or a previously-resolved decision is revisited. |
| `docs/DESIGN-SYSTEM.md` | Design tokens, components, color/spacing/typography rules, or motif inventory changes. |
| `docs/LEARNINGS.md` | A non-obvious gotcha, browser quirk, or pattern-that-bit-us emerges and is worth not repeating. |

Process at PR time:

1. Before opening the PR, walk through the doc list and identify which (if any) the change touches.
2. Update them in the **same branch / same PR** — never as a follow-up "I'll do it later".
3. Mention the doc updates in the PR body under a `## Docs` heading or as a checked item in the Test plan.
4. If the change genuinely touches no docs, say so explicitly in the PR body (`No docs affected.`) so it's visible the question was considered, not skipped.

**Exceptions** — small enough that doc churn isn't worth it:
- One-line typo fixes in code comments or strings.
- Renames internal to a single function.
- Dependency bumps that don't change behavior.

**Don't open a separate docs follow-up PR for an ordinary change.** Fold the doc update into the same PR before opening, or update the open PR before merging. "I'll fix the docs in a separate PR" becomes "docs never get fixed."

Standalone docs-only PRs are reserved for:
- Intentional documentation cleanup (typo passes, restructuring, dead-link sweeps).
- Project wrap-up / status finalization (e.g., milestone close, deferral checkpoint).
- When the user explicitly asks for a docs-only PR.

In doubt, update the doc. Cost of an extra paragraph is low; cost of a misleading doc compounds.
