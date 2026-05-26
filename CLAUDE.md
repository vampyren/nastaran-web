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
