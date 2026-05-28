# Project conventions — nastaran-web

## Branch-first workflow (strict)

**Never commit source changes directly to `main`.** Every code change goes through a feature branch + PR, even one-line fixes.

> **One documented exception:** the request/publish pipeline (planned in PR A — this rule lands when the pipeline ships) writes metadata-only commits to `requests/<id>.json` on `main` via Octokit. Those writes come from either the Vercel-hosted API routes (`/api/feedback`, `/api/approve/[id]`, etc.) or the local Mode A operator session. Nothing else takes this path — no source files, no docs, no config, no other paths under `requests/` beyond the single per-request JSON. All actual source/content changes for requests still flow through a `req/<id>-<slug>` branch + PR + Publicera (squash-merge). See [`spec/pipeline-mvp.md`](./spec/pipeline-mvp.md) § Source-of-truth split and [`requests/README.md`](./requests/README.md).

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
- Octokit 4 for all GitHub I/O from the pipeline (request queue, PR open/merge, branch delete) — added in PR B
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
| Status values inside `requests/<id>.json` (`queued`, `in_progress`, `review`, `improve_requested`, `publishing`, `done`, `rejected`, `failed`) | **English** |
| Branch prefix (`req/<id>-<slug>`) and slug normalization | **English/ASCII** |
| Cookie names (e.g. `nastaran-admin`) | **English** |
| Visible page routes (`/onskemal`, `/onskemal-kogen`) | **Swedish OK** — they are visible UI routes |
| Visible UI copy, button labels, section headings, form labels | **Swedish** |

The Swedish UI vocabulary is centralized in [`spec/pipeline-mvp.md`](./spec/pipeline-mvp.md) § Swedish UI vocabulary. UI code reads labels from there — it does not redefine the words. That table is the **only** place where internal status maps to Swedish.

## Keep documentation in sync

**Docs that describe what the code is or how it works must be updated in the same PR as the code change.** Stale docs are worse than no docs — they actively mislead.

Doc surfaces in this repo, and what should trigger an update:

| Doc | Update when… |
|---|---|
| `README.md` | Run/build/deploy instructions change, new top-level scripts, env vars added, repo URL or stack basics change. |
| `CLAUDE.md` | Conventions, workflow rules, tech stack basics, or operator-mode rules shift. |
| `spec/README.md` | Entry point / navigation for the spec folder. Update if the spec folder structure or a spec doc's purpose changes. |
| `spec/design-spec.md` | Visual system, themes, motifs, tokens, or layout/spine architecture changes. |
| `spec/implementation-spec.md` | New routes, milestone scope shifts, completed/added/dropped PRs in the roadmap. |
| `spec/decisions-and-open-questions.md` | A new architectural decision is made, an open question is resolved, or a previously-resolved decision is revisited. |
| `spec/pipeline-mvp.md` | Request data model, status union, state-transition table, API contracts, safe edit surface, validation stack, or acceptance criteria change. Authoritative source for the pipeline implementation. |
| `spec/pipeline-operator-modes.md` | Mode A operator behavior, foreground listener cadence, four-tier classification rule, or anything in the parked Mode B reference shifts. |
| `docs/PIPELINE-HANDOFF.md` | From-zero setup steps, env-var list, operator starter prompt, recovery model, or smoke-test checklist changes. |
| `docs/REUSABLE-REQUEST-QUEUE-PATTERN.md` | The cross-project pattern (state machine, single-lane rule, four-tier classification, env checklist) genuinely changes — not project-specific tweaks. |
| `docs/DESIGN-SYSTEM.md` | Design tokens, components, color/spacing/typography rules, or motif inventory changes. |
| `docs/LEARNINGS.md` | A non-obvious gotcha, browser quirk, or pattern-that-bit-us emerges and is worth not repeating. |
| `requests/README.md` | Metadata conventions, the `main`-write exception, or concurrency-safety rules change. |
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
- Pipeline / infrastructure setup phases (e.g., PR A of the request/publish pipeline chain).
- When the user explicitly asks for a docs-only PR.

In doubt, update the doc. Cost of an extra paragraph is low; cost of a misleading doc compounds.

## Request/publish pipeline rules

**Status:** Shipped (PRs A–E). Anonymous production smoke + clean-room docs comprehension both pass on `main`. Live-run end-to-end smoke is ready to execute once Vercel env vars land — see [`docs/CLEAN-ROOM-VALIDATION.md`](./docs/CLEAN-ROOM-VALIDATION.md).

The pipeline is documented in:

- [`spec/pipeline-mvp.md`](./spec/pipeline-mvp.md) — data model, state machine, API contracts, safe edit surface, validation stack.
- [`spec/pipeline-operator-modes.md`](./spec/pipeline-operator-modes.md) — Mode A foreground listener pattern. Mode B parked.
- [`docs/PIPELINE-HANDOFF.md`](./docs/PIPELINE-HANDOFF.md) — from-zero setup walkthrough + canonical operator starter prompt (§ 6).
- [`docs/CLEAN-ROOM-VALIDATION.md`](./docs/CLEAN-ROOM-VALIDATION.md) — validation plan + recorded test results.
- [`docs/REUSABLE-REQUEST-QUEUE-PATTERN.md`](./docs/REUSABLE-REQUEST-QUEUE-PATTERN.md) — cross-project abstract pattern.
- [`requests/README.md`](./requests/README.md) — metadata directory + `main`-write exception.
- [`.env.example`](./.env.example) — env var template.

Short version of the rules that apply across the codebase:

1. **`/admin` is the owner entry point.** Anonymous `GET /admin` → 307 to `/admin/login`.
2. **Request form is admin-gated for pre-launch.** Both `GET /onskemal` and `POST /api/feedback` call `hasAdminSession()` / `requireAdmin()`. Anonymous direct POST returns 401 and **never writes** to `requests/<id>.json`. Removal trigger documented in `spec/pipeline-mvp.md` § Pre-launch admin-gating.
3. **Active request branch prefix:** `req/<id>-<slug>`. ID format: `YYYYMMDD-HHmmss-<6 random chars>`. Slug normalization is Swedish-aware (å→a, ä→a, ö→o, then NFKD, then ASCII strip). Full rules in `spec/pipeline-mvp.md` § Request id + slug rules.
4. **Metadata-only write exception:** Octokit / `/api/*` may write to `requests/<id>.json` on `main`. Source/content changes only via `req/<id>-<slug>` branch + PR + Publicera (squash-merge). Every Octokit call hard-codes the path — no input can broaden the write scope.
5. **Mode A foreground listener rules.** Operator is the active Claude Code session. Two shapes: on-demand (default) and opt-in foreground listener (~60 s cadence via `ScheduleWakeup`, this-session-only). NO cron, NO daemon, NO child `claude -p`, NO `ANTHROPIC_API_KEY`, NO `--permission-mode bypassPermissions`, NO unattended processing after the session closes, NO auto-merge of source PRs. Full detail in `spec/pipeline-operator-modes.md`.
6. **Mode B is parked.** Cron-driven `claude -p` wrapper is reference design only; not implemented. No `.loop/` directory in this repo.
7. **Single-lane.** At most one active request across `in_progress | review | improve_requested | publishing`. `improve_requested` reuses **same request, same branch, same PR** — never duplicates a PR.
8. **Safe edit surface:** `src/content/{berattelser,home,kontakt,om-mig,site}.ts`. Anything else = `failed + manualFix`. The operator never edits `src/app/`, `src/components/`, `src/lib/`, configs, `package.json`, `next.config.mjs`, `.github/`, `public/`, `docs/`, `spec/`, or any other `requests/*.json` than the one being processed.
9. **No real request processing inside infrastructure PRs unless explicitly approved.** PRs B–E ship the runtime; do not exercise the pipeline end-to-end with real owner requests during setup.
10. **Image attachments** (1–3 per request, PNG/JPG/WebP, ≤ 5 MB each) live at `requests/<id>/attachments/<server-generated-name>` and are referenced from `requests/<id>.json`. Operator rules:
    - **Inspect every attachment before classifying.** Read the request wording to decide which of the two valid intake shapes applies.
    - **Reference / clarification.** Screenshots showing a layout bug, examples, "here's where I want the change". Operator inspects — never copies anywhere. The request is then judged on the text alone against the normal safe edit surface.
    - **Source asset for the website.** Wording like "lägg in dessa", "byt bilden", "använd denna bild", "lägg till denna bild på <section>", "replace the X with this", "add this image to <page>". **The operator IS allowed to copy the uploaded file from `requests/<id>/attachments/...` into the correct project asset folder (preferably `public/assets/generated/<safe-filename>`) AND reference it from the appropriate safe content/data file** (`src/content/*.ts`). This is the intended source-asset path; it is NOT an unsafe request just because the binary lands outside `src/content/`.
    - **Source-asset guardrails — all must hold for the asset-copy path:**
      - The owner's wording clearly says use / add / replace / put-this-image-on-page (don't read into "look at this" or "see screenshot" — those are reference, not source).
      - The target page/section/current image is unambiguous from the request text. If unclear → stop and ask, or `failed + manualFix`. Never guess placement.
      - Destination is a **known project asset folder**, preferably `public/assets/generated/`. Anywhere outside the established asset layout → stop and ask.
      - The destination filename is a **safe generated** name (lowercase, ASCII, hyphenated, descriptive; e.g. `<page>-<topic>.<ext>`). Never use the user's raw uploaded filename as the on-disk path component — that's already enforced at upload time but applies to the copy step too.
      - **No cropping, retouching, color-grading, heavy optimization, or other design-sensitive choices** unless the owner explicitly asked for them AND the operation stays inside the safe edit surface. If in doubt — stop and ask.
      - **No edits to unsafe components or rendering code.** Only the asset copy + the content/data file reference are in scope. If the request needs a new component, new section, layout change, etc. → outside the source-asset path → stop and ask.
    - **Attachments still do NOT expand the whole safe edit surface.** The asset-copy allowance covers exactly two things: (1) the binary into the known project asset folder, (2) the path reference in `src/content/*.ts`. Everything else still falls under the normal four-tier rule.
    - Full data model + storage layout + validation stack in `spec/pipeline-mvp.md` § Attachments.

    **Cross-project portability.** When this attachment feature is ported to Shadi (`shadi-web`), the same source-asset rule is meant to carry forward verbatim — same destination convention (`public/assets/generated/`), same guardrails, same "does not expand the safe edit surface" boundary. Note this in the Shadi spec when the port happens; see `docs/REUSABLE-REQUEST-QUEUE-PATTERN.md`.

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

**What to include each turn:**

- What was just done (the substantive deliverable of this round — full text if it's a report; full plan if it's a plan).
- Repo / branch / PR / status / commit SHA(s).
- Changed files if any.
- Quality gates run, and their results.
- Safety notes (old project paths untouched, no secrets in chat/docs/PR, etc.).
- One short line at the bottom: next step or open question, or `Standing by.` if nothing's queued.

The file is meant to be read cold by a reviewer who hasn't seen the chat. Make it self-contained for that round. Git history preserves the project trail; this file is the working tray.

## Setup / config requests — answer in chat with the actionable checklist

When the owner asks for env-var / key / password / PAT / Vercel setup help, **deliver the actionable checklist directly in chat** using the Quick Start at [`docs/PIPELINE-HANDOFF.md`](./docs/PIPELINE-HANDOFF.md) § 0. Do not just point them at the doc and wait for them to read it — the owner is trying to set things up, not read documentation.

Mirror the Quick Start's structure in chat: numbered steps with exact commands (`openssl rand …`), exact field values, exact URLs, exact env-var names. The long-form walkthrough in `docs/PIPELINE-HANDOFF.md` § 1 onward is for first-principles reading; chat is for action. Same rule applies to ad-hoc PAT-scope reminders, Vercel UI walkthroughs, redeploy clarifications, and any other one-time setup the human runs in a browser or local terminal.

Still: never paste real secret values into chat. Tell the owner to run the `openssl` commands in their local terminal and paste the output directly into Vercel — that's the secret-handling rule from the standing-rules block above, and it still applies inside an actionable checklist.

## Project-specific hard rules

These apply unconditionally unless I override them in-session.

- **Do not touch archived/old repos or project paths unless I explicitly ask.** The old Nastaran project at `/home/spawn/Apps/nastaran-web` is archived reference only — do not modify it. Use this repo (`/home/spawn/Apps/projects/nastaran-web`, `vampyren/nastaran-web`) as the single source of truth.
- **Do not change Vercel settings or env vars unless I explicitly ask.**
- **Do not paste secrets into chat, docs, commits, logs, or PR bodies.**
- **Do not create PATs, secrets, deployment settings, or OAuth/app integrations without explicit approval.** The pipeline's `GITHUB_TOKEN`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` must be set by the human directly in the Vercel dashboard — see [`docs/PIPELINE-HANDOFF.md`](./docs/PIPELINE-HANDOFF.md) § 2.
- **Treat the old Nastaran project/repo/path as archived reference only.** Do not modify it. Use the current repo/project as the source of truth.
- **No `ANTHROPIC_API_KEY` anywhere.** Mode A uses the local Claude CLI subscription session; setting an API key would override it.
- **The operator edits only `src/content/*.ts`** during request work. Anything outside that = unsafe classification = `failed + manualFix`.
