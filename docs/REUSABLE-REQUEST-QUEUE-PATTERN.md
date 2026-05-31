> **⚠️ HISTORICAL — superseded by central web-ops.**
> The cross-project request/publish pattern is now owned by the central web-ops
> repo: `/home/spawn/Apps/projects/web-ops/WEB-OPS-RULES.md` (with per-project
> values in [`../ops/project-profile.json`](../ops/project-profile.json)). This
> page is kept for historical context only and is not canonical. If it conflicts
> with the central rules, the central rules win.

# Reusable request-queue pattern

A one-page summary of the request/publish pipeline pattern as adapted into this project. Originally validated end-to-end on `shadi-web`; reused here for `nastaran-web`. Use this as the starting blueprint if you ever want to apply it to another small-team content workflow where a non-technical owner needs to request changes and approve them visually before production.

**For step-by-step setup in this project:** [`PIPELINE-HANDOFF.md`](./PIPELINE-HANDOFF.md). This file is the abstract pattern; the handoff is the concrete walkthrough.

**Authoritative implementation specs:** [`../spec/pipeline-mvp.md`](../spec/pipeline-mvp.md) (state machine + API), [`../spec/pipeline-operator-modes.md`](../spec/pipeline-operator-modes.md) (operator modes).

---

## Architecture in one diagram

```
admin-only (pre-launch) / public (post-launch)             admin (cookie-gated)
                  │                                                 │
                  │  POST /api/feedback                              │
                  ▼                                                  ▼
        [request form  ]                                     [queue board   ]
                  │                                                  ▲
                  │ writes via Octokit                               │ reads via /api/list
                  ▼                                                  │
   ┌──────────────────────────────────────────────────┐
   │   main (production)                              │
   │   ─────────────────────                          │
   │   requests/<id>.json   ← single source of truth  │
   │     status, history, PR link, preview link, etc. │
   │                                                  │
   │   src/content/*.ts     ← real content            │
   └──────────────────────────────────────────────────┘
              ▲                            │
              │ squash-merge on Publicera  │ operator branches
              │                            ▼
            req/<id>-<slug>  ← one branch per request
                │
                ├─→ Vercel Preview URL (review surface)
                ├─→ GitHub PR (audit + diff view)
                └─→ admin: Publicera | Förbättra | Avvisa
```

---

## The seven moving parts

1. **Request submission form** at a stable URL (e.g. `/onskemal`). Pre-launch: admin-gated. Post-launch: public, with light validation (size caps, honeypot, email regex if collected, allowed-page list, per-IP rate limit).
2. **Request metadata file** on `main` at `requests/<id>.json` — single source of truth for status, history, branch link, PR link, preview link, lifecycle timestamps. Every write goes through SHA-conditional CAS.
3. **Admin queue board** at a stable URL (e.g. `/onskemal-kogen`) behind a simple password + cookie (`ADMIN_PASSWORD` + `ADMIN_SESSION_SECRET`, timing-safe compare). Polls `/api/list` every ~30 s.
4. **Single-lane operator** — at most ONE request in flight at any time. Processes a `queued` request through `in_progress → review` on a per-request `req/<id>-<slug>` branch, edits only content files, runs gates, opens a PR.
5. **Vercel Preview** as the review surface — one Preview per branch, Vercel posts the URL into the PR. The admin opens the preview, decides.
6. **Three terminal actions** from the board:
   - **Publicera** → squash-merge PR → branch delete → status `done` → prod auto-deploys.
   - **Förbättra** → status `improve_requested` with a refinement message → operator picks up, REUSES same branch + same PR, pushes a second commit, returns to `review`. Never opens a duplicate PR.
   - **Avvisa** → close PR unmerged → branch delete → status `rejected`. Production untouched.
7. **Audit trail** = `requests/<id>.json` `history` array. Every transition records `at` (ISO timestamp), `actor` (`user` / `loop` / `admin`), and an optional `message`. Combined with git history of the file, that IS the audit log — no separate DB.

---

## The hard rules that make it safe

1. **Operator NEVER commits source changes directly to `main`.** Only metadata writes to `requests/<id>.json` go to `main` directly. All source edits live on `req/*` branches and reach `main` only via admin-driven squash-merge.
2. **Operator edits ONLY a known-safe path.** In `nastaran-web` that's `src/content/{berattelser,home,kontakt,om-mig,site}.ts`. Anything else = unsafe classification = `failed + manualFix`.
3. **Four-tier classification** for incoming requests:
   - Clear content-only → process normally.
   - **Ambiguous-but-safe → `clarification_needed`**: park the request with a concise question, surfaced in the queue UI; the requester answers in the board and it returns to `queued`. No claim/branch/PR while parked; the operator never guesses. (Earlier iterations stopped to ask the maintainer in the agent session; the in-product clarification loop is the improvement.)
   - Structural / out-of-scope → `failed + manualFix`.
   - Unsafe (configs, package.json, layout, src/app) → `failed + manualFix`.
4. **Build gates before push.** `lint`, `typecheck`, `build` must all pass on the operator's local branch before pushing. A broken branch never gets a PR.
5. **Single-lane.** No new claim while another request is active. `improve_requested` is the worker's own backlog (not a new claim).
6. **SHA-CAS on every metadata write.** Read just before write, include the blob SHA, refetch + re-decide on 409. Never replay a stale payload.
7. **Internal English / visible Swedish.** Variables, functions, types, JSON keys, status values, helper names, env var names, internal API routes — English. Visible UI copy, button labels, section headings — Swedish (centralized in a single mapping table).

---

## Required runtime config (Vercel side)

Four env vars — exact names, case-sensitive:

| Variable | Required scopes / format |
|---|---|
| `GITHUB_TOKEN` | Fine-grained PAT scoped to ONE repo. Contents: Read/Write + Pull requests: Read/Write. |
| `GITHUB_REPO` | `owner/repo`. |
| `ADMIN_PASSWORD` | Any 8+ char password the admin will type at `/admin/login`. |
| `ADMIN_SESSION_SECRET` | 16+ chars. Generate with `openssl rand -hex 32`. |

Optional: `NEXT_PUBLIC_PREVIEW_MODE=1` for preview-mode UI niceties (never used for authorization).

---

## Operator modes

- **Mode A — Interactive Claude Code session as the operator.** Current. The owner's local Claude Code session reads the queue, classifies, asks if uncertain, processes one request per check. Two usage shapes: on-demand (default) or foreground listener (opt-in, **~10 min idle cadence** via `ScheduleWakeup`, this-session-only). The listener **polls quietly** — no chat output on idle ticks, speaking up only when something actionable happens. The owner can force an immediate check at any time with "check the queue now" / "pick it up" / "process the queue". **Review-state decision-watch:** there is no push signal from the website/API, so while a request the operator pushed is at `review` awaiting an owner decision, the listener may use a faster **quiet ~60 s** cadence until that request is terminal, then drop back to ~10 min idle. No child process. No cron. No webhook/daemon/background worker. Uses the local Claude CLI's subscription auth (no `ANTHROPIC_API_KEY`). (A faster ~60 s default for *idle* polling was tried and judged wasteful — fast idle pickup is on-demand only; the ~60 s cadence is reserved for the review-state decision-watch.)
- **Mode B — Cron-driven `claude -p` wrapper.** Parked. Needs wrapper-level output validation + permission/auth handoff resolution before it's safe for unattended use. Not implemented in `nastaran-web`.

---

## What's reusable across projects vs. project-specific

### Reusable (copy directly)

- Request JSON schema — fields, types, lifecycle timestamps, history-array structure.
- Queue statuses and state transitions (English internal names).
- Branch / PR / preview pattern — one `req/<id>-<slug>` branch per request, one PR per branch, Vercel Preview URL per branch.
- Approval / rejection / improvement flow.
- Operator model — Mode A as default; Mode B parked.
- Listener cadences — quiet ~10 min idle poll; faster quiet ~60 s review-state decision-watch while a pushed request awaits an owner decision; manual immediate override phrases.
- Single-lane invariant.
- Four-tier classification rule — including the narrow **content-driven renderer glue** allowance (a new content field plus minimal same-page renderer wiring to display it, inside the request branch + PR + preview flow; not a license for routes, APIs, layout redesign, shared-component refactors, or cross-page edits).
- **Clarification flow** — an ambiguous-but-safe request parks at `clarification_needed` with a queue-worker question the requester answers in the queue UI (then back to `queued`). Keep two **separate, clearly-named** status sets: the **lane-blocking** set (what the queue worker checks before picking up another request) vs the **intake-count** set (the intake cap; may include parked states). In this project `clarification_needed` **is lane-blocking** — a parked request holds the single lane until answered or rejected (simple; no parallel handling). A project wanting parallelism could exclude it from lane-blocking instead, but must keep the two sets distinct and documented either way.
- Runtime env checklist.
- API surface (English route names).
- Code libraries — `src/lib/auth.ts`, `src/lib/github.ts`, `src/lib/request-store.ts`, `src/lib/request-types.ts`.
- Board layout — four sections.

### Project-specific (adapt per new project)

- Swedish (or other-language) UI labels — translated per project.
- Site owner name, branding, all visible copy.
- Content file paths — `src/content/*.ts` shape is per-project.
- Allowlist of safe paths the operator can edit.
- Routes (`/onskemal`, `/onskemal-kogen` can stay Swedish or be localized).
- Page-id allowlist matching the project's nav.
- Cookie name (e.g. `nastaran-admin` for this project, `shadi-admin` in the source project).
- Styling / theme.
- Vercel project / repo name.
- Honeypot field name (cosmetic obfuscation).
- Rate-limit / queue-depth tuning.

---

## Rollback

A bad merge to `main` rolls back through the normal PR flow: open a `fix/rollback-<id>` branch, `git revert <squash-merge-sha>`, push, open PR, admin approves. The original `requests/<id>.json` stays at `done` for audit but gets a `rolled_back` history entry referencing the rollback PR URL.

No special "rollback" status. No DB to roll back. The git history of `main` is the source of truth — `git revert` is the tool.

---

## Things validated on the source project

- Vercel previews are stable per branch — pushing a second commit to the same branch reuses the same preview URL.
- `gh pr create` + Octokit `pulls.merge` (squash) + branch delete is a fully API-driven approval flow — no manual git operations needed on the admin's machine.
- `requests/<id>.json` + its history array is sufficient as the audit log for content changes at this scale.
- The single-lane invariant is enforceable purely by the operator's claim-discipline.

---

## Things to revisit per project

- The "Klart" history cap (default 30) and the `/api/list` sort order live in code — adjust per expected volume.
- Swedish-character slug normalization (`å→a`, `ä→a`, `ö→o`) is Swedish-specific. Localize for other languages.
- The four-tier safety classification's "safe path" rule maps to each project's content layout. Generalize per project's structure.
- Public form spam controls (rate limit, queue-depth cap, honeypot) tune per traffic profile.

## Image attachments (added in Nastaran's PR #22)

If the project ships the attachment intake (1–3 images per request, PNG/JPG/WebP, ≤ 5 MB each), carry these rules forward verbatim:

- **Storage layout.** Binaries at `requests/<id>/attachments/<server-generated-name>` — never base64 inside the request JSON. Stored filename is operator-generated (`<index>-<rand6>.<ext>`); the user's original name is for display only.
- **main-write narrowing.** Extend the metadata-write exception to cover `requests/<id>/attachments/`. Both `id` and `name` validated independently via a path helper (`attachmentPath()` in Nastaran). No `putAnywhereOnMain` exposed.
- **Validation stack.** Declared mime + size check, then a magic-byte sniff after read; sniffed mime MUST equal declared mime (browsers can mis-report `File.type`). All-or-nothing — orphan blobs without a parent JSON are deleted best-effort.
- **Admin-gated proxy.** Private repos need a `GET /api/attachment/[id]/[name]` route that fetches by sha via `git.getBlob` (works at any size — Contents API placeholders > 1 MB) and streams back the bytes with `X-Content-Type-Options: nosniff`.
- **Source-asset rule (operator).** When the owner's wording clearly says use / add / replace an attached image on a page, the operator IS allowed to copy the binary from `requests/<id>/attachments/...` into the project's known asset folder (preferably `public/assets/generated/<safe-generated-filename>`) AND reference it from the appropriate safe content/data file. This is NOT unsafe just because the binary lands outside the content folder — it is the intended source-asset path. Reference-only attachments (screenshots showing where to change) are inspected, never copied.
- **Guardrails (carry verbatim).** Unambiguous target, known asset folder, operator-generated filename, no cropping / retouching / design judgment, no edits to unsafe components. **Attachments do NOT expand the whole safe edit surface.** The allowance is narrow: binary into the known asset folder, plus a path reference in the content file. Everything else still falls under the normal four-tier rule.

Project-specific knobs: asset destination convention (Nastaran uses `public/assets/generated/`), per-file size cap, allowed mime list, queue board thumbnail layout.
