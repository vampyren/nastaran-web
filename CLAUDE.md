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
   - `req/<id>-<slug>` — **reserved for a future request/publish pipeline; do not use for ordinary work yet.** See the "Future request/publish pipeline" section below.
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

**No test script is configured** in this repo (`package.json` has no `test` entry). If one is added later, document it here and add it to the gate list and to the CI workflow.

The same three commands run in CI on every PR to `main` and every push to `main` via [`.github/workflows/ci.yml`](.github/workflows/ci.yml). Local gates first, CI as a backstop.

## Keep documentation in sync

**Docs that describe what the code is or how it works must be updated in the same PR as the code change.** Stale docs are worse than no docs — they actively mislead.

Doc surfaces in this repo, and what should trigger an update:

| Doc | Update when… |
|---|---|
| `README.md` | Run/build/deploy instructions change, new top-level scripts, env vars added, repo URL or stack basics change. |
| `CLAUDE.md` | Conventions, workflow rules, or tech stack basics shift. |
| `spec/README.md` | Entry point / navigation for the spec folder. Update if the spec folder structure or a spec doc's purpose changes. |
| `spec/design-spec.md` | Visual system, themes, motifs, tokens, or layout/spine architecture changes. |
| `spec/implementation-spec.md` | New routes, milestone scope shifts, completed/added/dropped PRs in the roadmap. |
| `spec/decisions-and-open-questions.md` | A new architectural decision is made, an open question is resolved, or a previously-resolved decision is revisited. |
| `docs/DESIGN-SYSTEM.md` | Design tokens, components, color/spacing/typography rules, or motif inventory changes. |
| `docs/LEARNINGS.md` | A non-obvious gotcha, browser quirk, or pattern-that-bit-us emerges and is worth not repeating. |

If an `archive/` or `legacy/` directory is added in the future, docs under those paths are **historical reference only** — they do not need to be kept in sync with current code, and the doc-surface rule does not apply to them.

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

## Future request/publish pipeline

**This repo does not currently have a request/publish pipeline.**

If such a pipeline is added later, the same PR that adds it must update this `CLAUDE.md` to document:

- The active request branch prefix, likely `req/<id>-<slug>`.
- Any metadata-write exception to the branch-first rule (i.e., whether a runtime is allowed to push directly to `main`, and under what scope).
- The exact metadata path (e.g., `requests/<id>.json`), if any.
- Which runtime is allowed to write that metadata.
- Operator mode and safety rules (dry-run vs. live, etc.).
- Safe edit paths — directories the pipeline is permitted to modify.
- The approval / rejection / improvement flow for incoming requests.

Until that pipeline exists, do **not** treat `req/<id>-<slug>` as a normal branch prefix and do **not** make direct `main` metadata writes from any runtime or script. The branch-first rule applies without exception.

## Rolling status file (auto-update, don't wait to be asked)

The user keeps a rolling project-status file at `/home/spawn/temp/output_nastaran.md`. Keep it up to date **proactively** — don't make the user ask each time.

**When to update** (any of these is a trigger):
- A PR was just merged to `main`.
- A CI run on `main` just completed (note green/red and time).
- A CLAUDE.md / convention / rule was added or changed.
- A milestone was just closed or deferred (MS1/MS2/etc., feature gating, scope changes).
- The user explicitly asks (`update output`, `status`, etc.) — but this should be redundant most of the time.

**How to update:**
- **Always overwrite, never append.** Use the `Write` tool to replace the entire file.
- **Current-state snapshot only**, not a running history log. The reader should be able to open the file cold and immediately know where the project is *now*. No table of every PR ever merged, no chronological narrative of the session.

**What to include** (lean — aim for one screen):
- Production URL + repo + current `main` HEAD short SHA.
- Brief status (MS1/MS2/etc. shipped or in progress).
- CI state if non-trivial (last run on main green/red, workflow file path).
- Open PRs (none ➝ say "None").
- Final design / shape of any feature that just stabilized (one paragraph each).
- Active conventions in `CLAUDE.md` (one line each, not the full rules).
- Deferred / outstanding items (terse bullet list).

Do not include: every past PR, the full diff of any commit, the full text of conventions (link to `CLAUDE.md` instead), or session-internal chatter.

## Project-specific hard rules

These apply unconditionally unless I override them in-session.

- **Do not touch archived/old repos or project paths unless I explicitly ask.** The old Nastaran project at `/home/spawn/Apps/nastaran-web` is archived reference only — do not modify it. Use this repo (`/home/spawn/Apps/projects/nastaran-web`, `vampyren/nastaran-web`) as the single source of truth.
- **Do not start request/publish pipeline adaptation unless I explicitly ask.** The "Future request/publish pipeline" section above documents what changes when such a pipeline is added; until then, the branch-first rule applies without exception.
- **Do not change Vercel settings or env vars unless I explicitly ask.**
- **Do not paste secrets into chat, docs, commits, logs, or PR bodies.**
- **Do not create PATs, secrets, deployment settings, or OAuth/app integrations without explicit approval.**
- **Treat the old Nastaran project/repo/path as archived reference only.** Do not modify it. Use the current repo/project as the source of truth.
