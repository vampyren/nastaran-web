# Project conventions — nastaran-web

## Shared web-ops rules (central source)

This project follows the shared **web-ops** pipeline/operator rules. They live in
**one central location** on Rex's Claude Code VM — they are not vendored into this
repo and there is no git submodule.

Before any request / queue / publish / operator work:

1. Refresh the central rules:

   ```bash
   git -C /home/spawn/Apps/projects/web-ops pull --ff-only
   ```

2. Then read, in order:
   1. `/home/spawn/Apps/projects/web-ops/WEB-OPS-RULES.md` — canonical pipeline/operator behavior.
   2. `ops/project-profile.json` — this project's local Nastaran values.
   3. This `CLAUDE.md` — Nastaran-specific non-pipeline conventions and warnings.

The shared web-ops rules define behavior. The local project profile defines the project-specific Nastaran values.
If the shared rules and the local profile conflict, stop and ask Rex. Do not guess.

If `/home/spawn/Apps/projects/web-ops` is missing on this machine, stop and ask Rex. Do not operate from memory.

Archived/local pipeline docs are **not canonical** for shared behavior. The `docs/`
and `spec/` files describe Nastaran's implementation, setup, and history; where they
touch shared pipeline/operator behavior, the central rules win.

The shared operator behavior — Mode A model, listener cadence, single-lane rule,
clarification flow, four-tier classification, request branch/PR/preview lifecycle,
Publicera / Förbättra / Avvisa, attachments/source assets, safe edit surface,
mutative-API security order, recovery — is **not duplicated here**. Read it from the
central rules. Everything below is Nastaran-specific.

## Branch-first workflow (strict)

**Never commit source changes directly to `main`.** Every code change goes through a feature branch + PR, even one-line fixes.

> **One documented exception:** the request/publish pipeline writes metadata-only commits to `requests/<id>.json` on `main` via Octokit. Those writes come from either the Vercel-hosted API routes (`/api/feedback`, `/api/approve/[id]`, etc.) or the local Mode A operator session. Nothing else takes this path — no source files, no docs, no config, no other paths under `requests/` beyond the single per-request JSON. All actual source/content changes for requests still flow through a `req/<id>-<slug>` branch + PR + Publicera (squash-merge). See [`spec/pipeline-mvp.md`](./spec/pipeline-mvp.md) § Source-of-truth split and [`requests/README.md`](./requests/README.md).

Before making any edit/write that modifies committed code:

1. Check the current branch: `git branch --show-current`.
2. If it's `main`, stop and propose a branch name. Conventional prefixes:
   - `feat/<short-name>` — new feature
   - `fix/<short-name>` — bug fix
   - `refactor/<short-name>` — restructuring with no behavior change
   - `cleanup/<short-name>` — small tidy-ups
   - `chore/<short-name>` — tooling, deps, config, docs
   - `req/<id>-<slug>` — request branches created by the queue operator (see [`spec/pipeline-mvp.md`](./spec/pipeline-mvp.md)). **Not for ad-hoc human use** — these are reserved for the pipeline's per-request flow.
3. Confirm the name with the user, then `git checkout -b <name>`.

When the change is done:

1. `git add <specific files>` (not `-A` / `.`).
2. `git commit -m "<conventional commit message>"` (subject under 70 chars, type prefix matches branch prefix).
3. `git push -u origin <branch>`.
4. `gh pr create --base main --head <branch> --title "..." --body "..."` with `## Summary`, `## Docs`, `## Test plan`, and `## Safety` sections.
5. After the user confirms or asks to merge: `gh pr merge <#> --squash --delete-branch`.
6. `git checkout main && git pull && git remote prune origin`.

**Squash by default.** The PR's final commit subject becomes the main-branch history; keep it conventional.

**Publicera / Förbättra / Avvisa takes precedence over the general branch-first rules above.** These admin actions go through API routes (`/api/approve/[id]`, `/api/iterate/[id]`, `/api/reject/[id]`) that use the documented metadata-write exception for state transitions, and perform legitimate PR squash-merges (Publicera) or PR closes (Avvisa) on the source-change side. They are NOT branch-first violations; they are the spec'd terminal actions of the state machine.

**Exceptions** (only with explicit user instruction in this session):
- Direct commit to `main` if the user says "commit straight to main" or equivalent.
- Skipping the PR for purely local / uncommitted exploration.

If a hook fails during commit, **fix the underlying issue and create a new commit** — never `--no-verify` and never `--amend` a failed commit.

## Include the Vercel preview URL when opening a PR

When you open a PR, include the Vercel preview URL in the chat handoff (and the PR body if you have it at create-time) as soon as it's available. Vercel comments the preview link onto the PR within ~30 s of the push — quote it back so the owner doesn't have to dig for it.

## Tech stack quick-ref

- Next.js 16 (App Router, Turbopack)
- React 19
- TypeScript strict
- Tailwind CSS v4 (CSS-first, `@theme` tokens) — Tailwind-first; reach for global CSS only when a token/utility can't express the effect cleanly
- Octokit 4 for all GitHub I/O from the pipeline (request queue, PR open/merge, branch delete)
- Deployed via Vercel (team `aryan-tech`), auto-deploy from `main`
- GitHub repo: `vampyren/nastaran-web`

## Quality gates

Run before opening a PR:

- `npm run lint` (eslint .)
- `npm run typecheck` (tsc --noEmit)
- `npm run build` (next build)

All three must pass. The build is part of the gate, not optional.

**No test script is configured** in this repo (`package.json` has no `test` entry). If one is added later, document it here and add it to the gate list and to the CI workflow.

The same three commands run in CI on every PR to `main` and every push to `main` via [`.github/workflows/ci.yml`](.github/workflows/ci.yml). Local gates first, CI as a backstop.

## Internal-English / visible-Swedish naming rule

This project may become multilingual. To keep that change cheap, internal code never carries Swedish:

| Layer | Language |
|---|---|
| Variables, functions, types, interfaces, JSON keys, helper names, env var names, comments explaining internal behavior | **English** |
| Internal API routes (`/api/approve`, `/api/reject`, `/api/iterate`, `/api/list`, `/api/feedback`, `/api/admin/*`) | **English** |
| Status values inside `requests/<id>.json` (`queued`, `clarification_needed`, `in_progress`, `review`, `improve_requested`, `publishing`, `done`, `rejected`, `failed`) | **English** |
| Branch prefix (`req/<id>-<slug>`) and slug normalization | **English/ASCII** |
| Cookie names (e.g. `nastaran-admin`) | **English** |
| Visible page routes (`/onskemal`, `/onskemal-kogen`) | **Swedish OK** — they are visible UI routes |
| Visible UI copy, button labels, section headings, form labels | **Swedish** |

The Swedish UI vocabulary is centralized in [`spec/pipeline-mvp.md`](./spec/pipeline-mvp.md) § Swedish UI vocabulary. UI code reads labels from there — it does not redefine the words. That table is the **only** place where internal status maps to Swedish.

## Keep documentation in sync

> Shared/cross-project pipeline & operator behavior is now canonical in the central web-ops repo (`/home/spawn/Apps/projects/web-ops/WEB-OPS-RULES.md`), not in these local docs. The table below governs **Nastaran-local** doc maintenance only; the `docs/` and `spec/` pipeline docs are Nastaran implementation/setup/history and must not contradict the central rules.

**Docs that describe what the code is or how it works must be updated in the same PR as the code change.** Stale docs are worse than no docs — they actively mislead.

Doc surfaces in this repo, and what should trigger an update:

| Doc | Update when… |
|---|---|
| `README.md` | Run/build/deploy instructions change, new top-level scripts, env vars added, repo URL or stack basics change. |
| `CLAUDE.md` | Conventions, workflow rules, tech stack basics, or Nastaran-specific operator bindings shift. |
| `ops/project-profile.json` | Any Nastaran local value the central web-ops model reads changes (routes, API paths, safe surface, asset patterns, output file, etc.). |
| `spec/README.md` | Entry point / navigation for the spec folder. Update if the spec folder structure or a spec doc's purpose changes. |
| `spec/design-spec.md` | Visual system, themes, motifs, tokens, or layout/spine architecture changes. |
| `spec/implementation-spec.md` | New routes, milestone scope shifts, completed/added/dropped PRs in the roadmap. |
| `spec/decisions-and-open-questions.md` | A new architectural decision is made, an open question is resolved, or a previously-resolved decision is revisited. |
| `spec/pipeline-mvp.md` | Nastaran's request data model, status union, API contracts, safe edit surface, or Swedish UI vocabulary change. Nastaran implementation reference + history. (Shared behavior → central web-ops.) |
| `spec/pipeline-operator-modes.md` | Nastaran operator-mode history (Mode A current / Mode B parked) shifts. (Shared behavior → central web-ops.) |
| `docs/PIPELINE-HANDOFF.md` | Nastaran from-zero setup steps, env-var list, or smoke-test checklist changes. |
| `docs/REUSABLE-REQUEST-QUEUE-PATTERN.md` | Historical only — the cross-project pattern now lives in central web-ops. |
| `docs/CLEAN-ROOM-VALIDATION.md` | Historical only — shared clean-room questions live in central web-ops. |
| `docs/DESIGN-SYSTEM.md` | Design tokens, components, color/spacing/typography rules, or motif inventory changes. |
| `docs/LEARNINGS.md` | A non-obvious gotcha, browser quirk, or pattern-that-bit-us emerges and is worth not repeating. |
| `requests/README.md` | Nastaran metadata conventions or the `main`-write exception change. |
| `.env.example` | New Vercel runtime env var is required, an existing one is renamed/dropped. |

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
- Pipeline / infrastructure setup phases.
- When the user explicitly asks for a docs-only PR.

In doubt, update the doc. Cost of an extra paragraph is low; cost of a misleading doc compounds.

## Pipeline operator mode — Nastaran-specific bindings

Nastaran runs the shared pipeline in **Mode A** (the interactive Claude Code session is the operator — no cron, no daemon, no webhook service, no background worker, no child `claude -p`, no `ANTHROPIC_API_KEY`, no `--permission-mode bypassPermissions`, no unattended processing after the session closes, no auto-merge of source PRs).

**The operator behavior itself — on-demand vs foreground-listener triggers and cadence, single-lane rule, clarification flow, four-tier classification, request branch / PR / preview lifecycle, Publicera / Förbättra / Avvisa, and attachment / source-asset handling — is canonical in `/home/spawn/Apps/projects/web-ops/WEB-OPS-RULES.md`. Do not duplicate or override it here.**

Nastaran-specific bindings the operator needs (local values; also in `ops/project-profile.json`):

- Owner entry `/admin` (anonymous `GET /admin` → 307 to `/admin/login`). Request form `/onskemal`; queue board `/onskemal-kogen`.
- API routes: intake `/api/feedback`, list `/api/list`, plus `/api/approve/[id]`, `/api/reject/[id]`, `/api/iterate/[id]`, `/api/clarify/[id]`, `/api/admin/retry/[id]`, attachment proxy `/api/attachment/[id]/[name]`.
- Lane sets: `LANE_BLOCKING_STATUSES` and `REQUEST_INTAKE_COUNT_STATUSES` in `src/lib/request-types.ts` (`clarification_needed` IS lane-blocking; the intake-count set is counting-only — never a lane-busy check).
- Request metadata lives at `requests/<id>.json` on `main` (the narrow metadata-only write exception). Request id is `YYYYMMDD-HHmmss-<6 random>`; slug normalization is Swedish-aware (å→a, ä→a, ö→o → NFKD → ASCII).
- Safe edit surface: content files `src/content/{berattelser,home,kontakt,om-mig,site}.ts`, plus same-page renderer glue on the **homepage `src/app/page.tsx`** and route pages `src/app/<page>/page.tsx`, source-asset copy into `public/assets/generated/`, and direct replacement of existing approved images under `public/assets/**` — all bounded by `ops/project-profile.json` → `safeEditSurface` and the central § 11 rules. Never write a `protectedPaths` entry.
- **Pre-launch admin-gating:** both `GET /onskemal` and `POST /api/feedback` require an admin session; anonymous direct POST returns 401 and never writes to `requests/<id>.json`. Removal trigger before public launch: `spec/pipeline-mvp.md` § Pre-launch admin-gating.
- Do not exercise the pipeline end-to-end with real owner requests during infrastructure/setup work unless explicitly approved.
- Nastaran implementation reference + history: `spec/pipeline-mvp.md` (data model, state machine, API contracts, Swedish UI vocabulary) and `spec/pipeline-operator-modes.md` (operator-mode history; parked Mode B). Mode B (cron-driven `claude -p` wrapper) is **parked** — reference design only, no `.loop/` directory.

## Temporary footer "Admin" link (pre-launch only)

The site footer carries a visible "Admin" link during pre-launch as a discoverability shortcut for the owner. The link is marked `TEMPORARY` in a code comment.

**Removal trigger:** before public launch, drop the link block from the footer. The matching change to the `/onskemal` page and `/api/feedback` admin-gating is documented in `spec/pipeline-mvp.md` § Pre-launch admin-gating.

## Rolling output file (handoff tray for review)

The user keeps a working output file at `/home/spawn/temp/output_nastaran.md`. **This is a temporary handoff tray for ChatGPT / Jarvis review, not repo documentation and not a permanent status artifact.**

**Rules:**

- It lives **outside the repo**. Never commit it. Never reference it from repo docs except this one paragraph.
- **Overwrite completely** after each meaningful Claude Code round. **Do not append. Do not preserve history.**
- **Scope — direct collaboration only, NOT Önskemål queue processing.** Active Mode A request-queue processing (the operator cycle: claim → `req/<id>` branch → edit → PR → status flips) does **not** count as a "meaningful round" for this file — do **not** write `output_nastaran.md` for queue cycles. For queue/operator work the source of truth is `requests/<id>.json` + the `req/<id>` branch/PR + GitHub/Vercel state, and the per-cycle report goes to the owner in chat. Direct owner ↔ Claude Code work outside the queue (setup, PR review, debugging, docs, refactors, closeout/handoff summaries, an explicit status request) **does** count — update the file as usual. See [`spec/pipeline-operator-modes.md`](./spec/pipeline-operator-modes.md) § Reporting after each cycle.
- **Do not create a second output file** unless the user explicitly asks.
- **Stop/restart handoff command.** When the owner says "stop the listener and save handoff" (or "stop listening and save project info", "pause operator and write restart handoff", "I need to exit Claude, save restart state", or similar), stop the listener, do **not** re-arm or process any request, and write this file as a closeout handoff with the full restart checklist — see [`spec/pipeline-operator-modes.md`](./spec/pipeline-operator-modes.md) § Stop / restart handoff.

**What to include each turn:**

- What was just done (the substantive deliverable of this round — full text if it's a report; full plan if it's a plan).
- Repo / branch / PR / status / commit SHA(s).
- Changed files if any.
- Quality gates run, and their results.
- Safety notes (no secrets in chat/docs/PR, source-of-truth respected, etc.).
- One short line at the bottom: next step or open question, or `Standing by.` if nothing's queued.

The file is meant to be read cold by a reviewer who hasn't seen the chat. Make it self-contained for that round. Git history preserves the project trail; this file is the working tray.

## Setup / config requests — answer in chat with the actionable checklist

When the owner asks for env-var / key / password / PAT / Vercel setup help, **deliver the actionable checklist directly in chat** using the Quick Start at [`docs/PIPELINE-HANDOFF.md`](./docs/PIPELINE-HANDOFF.md) § 0. Do not just point them at the doc and wait for them to read it — the owner is trying to set things up, not read documentation.

Mirror the Quick Start's structure in chat: numbered steps with exact commands (`openssl rand …`), exact field values, exact URLs, exact env-var names. The long-form walkthrough in `docs/PIPELINE-HANDOFF.md` § 1 onward is for first-principles reading; chat is for action. Same rule applies to ad-hoc PAT-scope reminders, Vercel UI walkthroughs, redeploy clarifications, and any other one-time setup the human runs in a browser or local terminal.

Still: never paste real secret values into chat. Tell the owner to run the `openssl` commands in their local terminal and paste the output directly into Vercel — that's the secret-handling rule from the standing-rules block above, and it still applies inside an actionable checklist.

## Project-specific hard rules

These apply unconditionally unless I override them in-session.

- **Single source of truth.** All work happens in this repo: `/home/spawn/Apps/projects/nastaran-web` (`vampyren/nastaran-web`). Use it for every read and write.
- **Do not touch `/home/spawn/Apps/nastaran-web/`** — the old/archived project path; off-limits.
- **Do not change Vercel settings or env vars unless I explicitly ask.**
- **Do not paste secrets into chat, docs, commits, logs, or PR bodies.**
- **Do not create PATs, secrets, deployment settings, or OAuth/app integrations without explicit approval.** The pipeline's `GITHUB_TOKEN`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` must be set by the human directly in the Vercel dashboard — see [`docs/PIPELINE-HANDOFF.md`](./docs/PIPELINE-HANDOFF.md) § 2.
- **No `ANTHROPIC_API_KEY` anywhere.** Mode A uses the local Claude CLI subscription session; setting an API key would override it.
- **The operator's safe edit surface and image/asset rules are defined centrally** (`WEB-OPS-RULES.md` § 11) plus this project's `ops/project-profile.json` → `safeEditSurface`: content files `src/content/{berattelser,home,kontakt,om-mig,site}.ts`, same-page renderer glue on the homepage `src/app/page.tsx` and route pages `src/app/<page>/page.tsx`, source-asset copy into `public/assets/generated/`, and direct replacement of existing approved images under `public/assets/**`. Anything outside the declared surface, or any `protectedPaths` entry, is unsafe = `failed + manualFix`.
