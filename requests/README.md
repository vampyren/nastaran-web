> **ℹ️ Shared pipeline behavior is canonical in central web-ops**
> (`/home/spawn/Apps/projects/web-ops/WEB-OPS-RULES.md`). This file documents
> Nastaran's local request-metadata file shape and write paths.

# `requests/` — request queue metadata

This directory holds the **single source of truth** for the request/publish pipeline. One JSON file per request, named `<id>.json`. The pipeline itself lives in:

- [`docs/PIPELINE-HANDOFF.md`](../docs/PIPELINE-HANDOFF.md) — from-zero setup walkthrough
- [`spec/pipeline-mvp.md`](../spec/pipeline-mvp.md) — data model + state machine + API contracts
- [`spec/pipeline-operator-modes.md`](../spec/pipeline-operator-modes.md) — Mode A foreground listener (Mode B parked)

## File shape

```
requests/
  README.md            (this file)
  <id>.json            one per request, where <id> = YYYYMMDD-HHmmss-<6 random chars>
```

Example id: `20260601-101530-k7zr8q`.

## The `main`-write exception (read this before touching the pipeline)

The repo's branch-first rule (see `CLAUDE.md`) says **source/content changes never go directly to `main`** — every change flows through a `req/<id>-<slug>` (or `feat/…`, `fix/…`, `chore/…`) branch + PR + squash-merge.

**One narrow exception:** metadata-only writes to `requests/<id>.json` on `main`, performed via Octokit by the request-pipeline routes:

- `POST /api/feedback` — creates a new file with `status: "queued"` when the admin submits the form.
- `POST /api/approve/[id]` — flips `review → publishing → done` and records `productionCommitSha`.
- `POST /api/reject/[id]` — flips → `rejected` and closes the underlying PR.
- `POST /api/iterate/[id]` — flips `review → improve_requested` with a refinement message.
- `POST /api/clarify/[id]` — flips `clarification_needed → queued`, storing the requester's clarification answer.
- `POST /api/admin/retry/[id]` — flips `failed → queued`.
- The Mode A queue worker / CC session — drives `queued → in_progress → review`, `improve_requested → in_progress → review`, and parks ambiguous-but-safe requests at `queued → clarification_needed` (lane-blocking until answered/rejected) during request processing.

Every other path on `main` (`src/**`, `public/**`, `package.json`, `next.config.mjs`, configs, CI, docs, anything) still requires a branch + PR. **The Octokit call is hard-coded to `path: "requests/<id>.json"`** in every writer — no input can broaden the write scope.

## Concurrency safety

Every write uses GitHub's SHA-conditional `createOrUpdateFileContents`:

1. Read just before write.
2. Re-validate the state-machine precondition against the freshly-read content.
3. On `409 Conflict`, refetch and re-evaluate up to 3 times with short backoff (50 / 200 / 500 ms). Never replay a stale payload.
4. The initial write from `POST /api/feedback` omits `sha` because the file doesn't exist yet; on `409` (rare id collision), regenerate the id and retry once.

This is enough at MS3 volumes (single-digit requests per day). No external lock service, no Vercel KV, no DB.

## Status values (English; see `spec/pipeline-mvp.md` for the full state machine)

`queued | in_progress | review | improve_requested | publishing | done | rejected | failed`

## Audit trail

The `history` array inside each `<id>.json` is the audit log. Every transition appends `{ at, actor, event, message? }`. Combined with git history of this directory on `main`, that IS the audit trail — no separate DB.

## Do not edit these files by hand

Manual edits to `requests/<id>.json` bypass the state machine and the SHA-CAS protection. If something has gone wrong (e.g. a request stuck in `publishing` after a deploy error), the recovery path is documented in `docs/PIPELINE-HANDOFF.md` § Recovery — not a freehand JSON edit.

The one supported exception is an emergency unstick by the project owner with explicit intent, captured in a commit message that names the request id and the reason.
