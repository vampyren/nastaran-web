# Spec — request/publish pipeline (MVP)

**Status:** Planned. PR A (this PR) lands docs/spec only. Runtime implementation lands in PRs B–E.
**Adapted from:** the validated `shadi-web` MS3 spec (`Spec/06-MS3-request-queue-mvp.md`).
**Companion docs:**

- [`docs/PIPELINE-HANDOFF.md`](../docs/PIPELINE-HANDOFF.md) — from-zero setup walkthrough.
- [`docs/REUSABLE-REQUEST-QUEUE-PATTERN.md`](../docs/REUSABLE-REQUEST-QUEUE-PATTERN.md) — the cross-project pattern (abstract).
- [`pipeline-operator-modes.md`](./pipeline-operator-modes.md) — Mode A foreground listener pattern (Mode B parked).
- [`../requests/README.md`](../requests/README.md) — metadata directory + `main`-write exception.

---

## Goal

The site owner submits change requests through a small in-product form. Requests land on `main` as JSON metadata. The Mode A operator (an interactive Claude Code session) picks each one up, classifies it, makes the content edit on a per-request branch, opens a PR, and Vercel produces a preview URL. The owner reviews the preview from a private admin board and clicks **Publicera** (publish), **Förbättra** (improve), or **Avvisa** (reject). Publicera squash-merges the PR and Vercel deploys the change to production.

Production is never edited directly. All source changes flow through `req/<id>-<slug>` branches with a PR + preview + approval.

**One active request at a time** (single-lane). Parallelization is intentionally out of scope.

---

## Internal-English / visible-Swedish naming rule

This project may become multilingual. To keep that change cheap, internal code never carries Swedish:

| Layer | Language |
|---|---|
| Variables, functions, types, interfaces, JSON keys, helper names, env var names, comments explaining internal behavior | **English** |
| Internal API routes (`/api/approve`, `/api/reject`, `/api/iterate`, `/api/list`, `/api/feedback`, `/api/admin/*`) | **English** |
| Status values inside `requests/<id>.json` (`queued`, `in_progress`, `review`, `improve_requested`, `publishing`, `done`, `rejected`, `failed`) | **English** |
| Branch prefix (`req/<id>-<slug>`) and slug normalization | **English/ASCII** |
| Cookie name (`nastaran-admin`) | **English** |
| Visible page routes (`/onskemal`, `/onskemal-kogen`) | **Swedish OK** — they are visible UI routes |
| Visible UI copy, button labels, section headings, form labels | **Swedish** |

The Swedish UI vocabulary is centralized in [§ Swedish UI vocabulary](#swedish-ui-vocabulary) below. UI code reads labels from there — it doesn't redefine the words. This is the only place where internal status maps to Swedish.

---

## Architecture

### Source-of-truth split

| Lives on | What it holds | Who writes it |
|---|---|---|
| **`main`** at `requests/<id>.json` | All request metadata + status. The single source of truth. `/api/list` reads from here. | `POST /api/feedback` (initial write, status `queued`), `/api/approve|reject|iterate/[id]`, `/api/admin/retry/[id]`, and the Mode A operator — all via Octokit. |
| **`req/<id>-<slug>` branch** | Only the proposed content change (edits to `src/content/*.ts`). Disposable — deleted on approve or reject. | Mode A operator. Never holds the canonical status. |

**Why this split:** `/api/list` reads from `main`. If status lived on the request branch, the admin board would never see status changes. Every status mutation writes back to `main` via Octokit so the board reflects reality instantly.

### Status transitions

```
                    ┌──────────────────────────┐
                    │ submitted via /onskemal  │
                    └────────────┬─────────────┘
                                 ▼
                        ┌─────────────────┐
                        │ queued          │ ← "Väntar i kö"
                        └────────┬────────┘
                                 ▼ operator picks up
                        ┌─────────────────┐
                        │ in_progress     │ ← "Pågår"
                        └────────┬────────┘
                                 ▼ operator pushes + opens PR
                        ┌─────────────────┐
                        │ review          │ ← "Aktivt i review"
                        └────────┬────────┘
                ┌────────────────┼────────────────┐
                ▼                ▼                ▼
       ┌────────────┐    ┌──────────────┐   ┌──────────┐
       │ publishing │    │ improve_req. │   │ rejected │
       └─────┬──────┘    └──────┬───────┘   └──────────┘
             │                  │ (back to in_progress on same branch)
             ▼                  │
       ┌──────────┐
       │ done     │ ← "Klart"
       └──────────┘
```

`failed` is a terminal sibling of any active state. It surfaces in the **Fel** board section with `failureReason` + an optional `manualFix: true` flag. **Försök igen** moves `failed → queued`.

**Clarification side-loop:** ambiguous-but-safe requests get parked at `clarification_needed` (operator writes a Swedish `clarificationQuestion`; **no claim, no branch, no PR**), surface in the **Väntar på svar** section, and return via `clarification_needed → queued` once the requester answers (**Svara** → `POST /api/clarify/[id]`). `clarification_needed` is **not** a lane occupant — it does not block other `queued` requests (see [§ Single-lane vs queue-depth](#single-lane-vs-queue-depth)). **Avvisa** can clear a never-answered one.

### Full state transition table

| From | Actor / action | To | What gets written | Notes |
|---|---|---|---|---|
| (none) | owner submits via `/onskemal` → `POST /api/feedback` | `queued` | New `requests/<id>.json` (status `queued`, `createdAt = updatedAt = now`) | Initial Octokit write, no `sha` needed |
| `queued` | operator picks up oldest | `in_progress` | `claimedAt`, `updatedAt`, `branch`, history `loop_picked_up` | SHA-CAS |
| `queued` | operator classifies **ambiguous-but-safe** (tier 2) | `clarification_needed` | `clarificationQuestion`, `updatedAt`, history `clarification_requested` (actor `loop`) | **No claim, no branch, no PR.** Operator metadata write to `main`. Not a lane occupant. |
| `clarification_needed` | requester clicks **Svara** → `POST /api/clarify/[id]` | `queued` | `clarificationAnswer`, `updatedAt`, history `clarification_answered` (actor `admin`) | **Same request reused** — operator re-picks it up and reads the Q+A. No duplicate. |
| `clarification_needed` | admin clicks **Avvisa** | `rejected` | `rejectedAt`, optional reason, history `rejected` | Clears a never-answered parked request |
| `in_progress` | operator finishes classify + edit + gates + push + PR open | `review` | `reviewReadyAt`, `updatedAt`, `pullRequestUrl`, `pullRequestNumber`, `previewUrl`, `latestCommitSha`, history `loop_pushed_pr` | `req/*` branch holds only the `src/content/*.ts` change |
| `in_progress` | operator classifier marks unsafe OR `lint`/`typecheck`/`build` fails | `failed` | `failedAt`, `failureReason`, `manualFix: true`, history `failed` | No push; branch never published |
| `review` | admin clicks **Förbättra** → `POST /api/iterate/[id]` | `improve_requested` | `updatedAt`, history `improve_requested` with message | Branch + PR remain open |
| `improve_requested` | operator picks up iteration | `in_progress` | `updatedAt`, history `loop_picked_up` | **Same branch reused** |
| `improve_requested` | admin clicks **Avvisa** | `rejected` | `rejectedAt`, optional `rejectionReason`, history `rejected`; PR closed; branch deleted | Production untouched |
| `review` | admin clicks **Publicera** → `POST /api/approve/[id]` | `publishing` | `updatedAt`, history `approval_started` | Before the merge happens |
| `publishing` | `pulls.merge` succeeds | `done` | `approvedAt`, `publishedAt`, `productionCommitSha`, history `merged`; branch deleted. `productionDeploymentUrl` stays `null` — see [§ Approve route caveat](#approve-route-caveat). | Happy path |
| `publishing` | any publish-step failure (GitHub API, network, merge conflict, missing checks, final metadata write failure) | `failed` | `failedAt`, `failureReason: "<step + http status>"`, `manualFix: true`, history `failed` | The request must NOT get stuck in `publishing`. |
| `review` | admin clicks **Avvisa** | `rejected` | Same as `improve_requested → rejected` row | |
| `failed` | admin clicks **Avvisa** | `rejected` | `rejectedAt`, optional reason, history `rejected`; PR + branch closed best-effort | Lets admin clear failed cards without retrying |
| `failed` | admin clicks **Försök igen** → `POST /api/admin/retry/[id]` | `queued` | `failedAt`/`failureReason`/`manualFix` cleared, `updatedAt`, history `retry_queued` | Operator picks up again; old branch deleted best-effort |
| `done` | rollback PR merged later | `done` (unchanged) | history `rolled_back` with rollback PR URL, `updatedAt` bumped | Status stays `done` for audit accuracy |

Any transition not listed is **not permitted** — invalid transition requests return `409 Conflict`.

### Single-lane vs queue-depth

Two distinct status sets — **do not conflate them** (a future operator session must not treat a parked clarification as active work):

| Set (in `src/lib/request-types.ts`) | Members | Meaning |
|---|---|---|
| `LANE_BLOCKING_STATUSES` | `in_progress`, `review`, `improve_requested`, `publishing` | **Single-lane occupants.** The operator processes at most ONE of these at a time. Each has (or is about to have) a `req/*` branch + PR. |
| `QUEUE_DEPTH_STATUSES` | `queued`, `clarification_needed`, `in_progress`, `review`, `improve_requested`, `publishing` | **Counting only** — the intake queue-depth cap in `POST /api/feedback`. Includes waiting/parked states. **Not** a lane-busy check. |

`clarification_needed` is in the depth count (it's an open request) but **NOT** in the lane-blocking set: it is parked waiting for the requester, has no branch/PR, and must not block other `queued` requests from being processed. `queued`, `done`, `rejected`, `failed` are likewise not lane occupants.

### Optimistic concurrency (SHA-based CAS) — required for every writer

Every write to `requests/<id>.json` uses GitHub's SHA-conditional contents API. See [`../requests/README.md`](../requests/README.md) § Concurrency safety for the full rules. Summary:

1. Read just before write to capture the latest `sha`.
2. Re-validate the state-machine precondition against the freshly-read content.
3. On 409, refetch + re-evaluate + retry up to 3 times with short backoff (50/200/500 ms). Never replay a stale payload.
4. `POST /api/feedback` initial writes omit `sha` (file doesn't exist yet); on 409 (rare id collision), regenerate the id and retry once.

### Per-request branch

When the operator picks up a queued request:

```bash
git checkout main && git pull origin main
git checkout -b req/<id>-<slug>
# edit src/content/*.ts only
npm run lint && npm run typecheck && npm run build
git add src/content && git commit -m "feat(request): <short title>"
git push -u origin req/<id>-<slug>
gh pr create --base main --head req/<id>-<slug> --title "Request <id>: <title>"
```

The branch contains **only** the content change. No `requests/<id>.json` edits happen on the branch. Vercel auto-builds the branch and posts a Preview URL into the PR.

---

## Pre-launch admin-gating (current contract)

During pre-launch, only the owner submits requests. **Both** the page and the API are admin-gated:

| Surface | Gate | Behavior for anonymous |
|---|---|---|
| `GET /onskemal` | `hasAdminSession()` in `src/app/onskemal/page.tsx` | 307 to `/admin/login?next=<URL-encoded /onskemal[?page=<id>]>`. Sanitized `?page=` is preserved across the login round-trip. |
| `POST /api/feedback` | `requireAdmin()` as the first line of `src/app/api/feedback/route.ts` — before body parsing, rate-limit accounting, queue-depth probe, and Octokit write | 401 `{ error: "unauthorized" }`. **No file is written.** No side effects. |

**Why both halves?** A page-only redirect would still let an attacker `curl -X POST /api/feedback`. The defense is at the data-write boundary, not just the UI boundary.

**Removal trigger — revert to public intake when ALL of these are true:**

1. The site is past pre-launch and the public is meant to file requests directly.
2. The matching TEMPORARY footer "Admin" link has been removed from the site footer.
3. The validation stack (body cap, per-field caps, honeypot, per-IP rate limit, queue-depth cap, hard-coded Octokit path) has been re-verified end-to-end. These are the defense layer when auth is dropped.

**To revert:** drop the `if (!(await hasAdminSession()))` block in `src/app/onskemal/page.tsx` and the `requireAdmin()` call at the top of `src/app/api/feedback/route.ts`. Do not partial-revert (don't lift the page gate alone).

---

## Routes

| Route | Type | Auth | Lives in |
|---|---|---|---|
| `GET /admin` | Owner hub | `hasAdminSession()` → 307 to `/admin/login?next=/admin` if anonymous | `src/app/admin/page.tsx` |
| `GET /admin/login` | Login form | None | `src/app/admin/login/page.tsx` |
| `POST /api/admin/login` | Set session cookie | None (credentials checked here) | `src/app/api/admin/login/route.ts` |
| `POST /api/admin/logout` | Clear session cookie | Cookie + same-origin | `src/app/api/admin/logout/route.ts` |
| `GET /api/admin/me` | Session probe used by AdminFAB | Cookie | `src/app/api/admin/me/route.ts` |
| `GET /onskemal` | Owner request form | **Pre-launch admin-gated.** `hasAdminSession()` → 307 to login | `src/app/onskemal/page.tsx` |
| `POST /api/feedback` | Request intake | **Pre-launch admin-gated.** `requireAdmin()` first; then validation stack + Octokit | `src/app/api/feedback/route.ts` |
| `GET /onskemal-kogen` | Admin queue board | Cookie | `src/app/onskemal-kogen/page.tsx` |
| `GET /api/list` | Queue read | Cookie | `src/app/api/list/route.ts` |
| `POST /api/approve/[id]` | Publicera | Cookie + same-origin | `src/app/api/approve/[id]/route.ts` |
| `POST /api/reject/[id]` | Avvisa | Cookie + same-origin | `src/app/api/reject/[id]/route.ts` |
| `POST /api/iterate/[id]` | Förbättra | Cookie + same-origin | `src/app/api/iterate/[id]/route.ts` |
| `POST /api/clarify/[id]` | Svara (answer a clarification) | Cookie + same-origin | `src/app/api/clarify/[id]/route.ts` |
| `POST /api/admin/retry/[id]` | Försök igen | Cookie + same-origin | `src/app/api/admin/retry/[id]/route.ts` |

**Out of v1:** `GET /api/git/log` (powers a "Senaste ändringar" header widget on Shadi) and the matching widget are deferred — add later if the owner wants the at-a-glance recent-merges view.

---

## Safe edit surface

The operator only edits **content** files. Anything else = unsafe = `failed + manualFix`.

| Path | Status |
|---|---|
| `src/content/berattelser.ts` | **Safe** |
| `src/content/home.ts` | **Safe** |
| `src/content/kontakt.ts` | **Safe** |
| `src/content/om-mig.ts` | **Safe** |
| `src/content/site.ts` | **Safe** |
| Anything else (`src/app/`, `src/components/`, `src/lib/`, configs, `package.json`, `next.config.mjs`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `.github/`, `public/`, `docs/`, `spec/`, `requests/<other-id>.json`) | **Unsafe → `failed + manualFix`** |

Specifically: the operator may write to `requests/<the-id-being-processed>.json` on `main` via Octokit, and to `src/content/*.ts` on the per-request branch (plus minimal content-driven renderer glue — see below). Never anywhere else.

### Content-driven renderer glue

Some content requests can't be shown by editing a content file alone — the page renderer is hardcoded and has no slot for the new content. In that case the operator may also make **minimal same-page renderer wiring** to display it, inside the request branch + PR + preview flow, **without** per-request owner approval:

- **Allowed:** add a field in `src/content/<page>.ts`, and update **only the matching page renderer** (e.g. `src/app/<page>/page.tsx`) to display that field — small, local, display-only wiring reusing existing visual tokens.
- **Not auto-allowed:** route changes, API/auth/config changes, admin-pipeline internals, broad layout redesign, global styling/design-system rewrites, unrelated shared-component refactors, or changes spanning multiple unrelated pages.
- If it grows beyond small local display wiring → **stop and ask**. Gates (`lint`/`typecheck`/`build`) still run; preview + owner approval (Publicera) still required before production.

This narrow allowance does **not** widen the surface to `src/components/`, `src/lib/`, configs, or other pages. Full classification detail in [`pipeline-operator-modes.md`](./pipeline-operator-modes.md) § Four-tier classification rule § Content-driven renderer glue.

### Page-ID → route mapping

The form's page-picker (and the request's `page` field) uses these IDs:

| Page ID | Route | Label (Swedish, shown in form chip) |
|---|---|---|
| `index` | `/` | `Hem` |
| `om-mig` | `/om-mig` | `Om mig` |
| `berattelser` | `/berattelser` | `Berättelser` |
| `kontakt` | `/kontakt` | `Kontakt` |
| `hela-sajten` | (catch-all) | `Hela sajten` |

`/testimonials` is intentionally excluded — it's a 307 redirect with no editable surface.

The allowlist lives in `src/lib/pages.ts` as `ALLOWED_PAGE_IDS`. `POST /api/feedback` rejects any other value with `invalid_input`.

### Edit-registry (granular paragraph IDs)

Out of v1. The Shadi pipeline has an optional `edit_id` field validated against `src/content/edit-registry.ts` for paragraph-level requests; that adds infrastructure complexity Nastaran doesn't need yet. We ship page-level requests only. Add the registry later if granular requests become valuable.

---

## Request data model

`requests/<id>.json` shape (TypeScript for clarity — all keys are English):

```ts
type Request = {
  id: string;                          // "YYYYMMDD-HHmmss-<6 random chars>"
  title: string;                       // short summary, becomes branch slug + PR title
  description: string;                 // owner's full request text
  page?: string;                       // page ID, from src/lib/pages.ts ALLOWED_PAGE_IDS
  edit_id?: string;                    // unused in v1 (reserved for future granular edits)
  createdBy?: string;                  // "nastaran" / informational only
  status:
    | "queued"
    | "clarification_needed"
    | "in_progress"
    | "review"
    | "improve_requested"
    | "publishing"
    | "done"
    | "rejected"
    | "failed";

  // ----- Lifecycle timestamps (ISO 8601) -----
  // updatedAt MUST be bumped on every status write.
  createdAt: string;
  updatedAt: string;
  claimedAt: string | null;
  reviewReadyAt: string | null;
  approvedAt: string | null;
  publishedAt: string | null;
  rejectedAt: string | null;
  failedAt: string | null;

  // ----- Filled in by the operator -----
  branch: string | null;               // "req/20260601-101530-k7zr8q-byt-rubrik"
  pullRequestUrl: string | null;
  pullRequestNumber: number | null;
  previewUrl: string | null;
  latestCommitSha: string | null;

  // ----- Filled in by approve -----
  productionCommitSha: string | null;
  productionDeploymentUrl: string | null; // always null in v1 — see § Approve route caveat

  // ----- Filled in by reject -----
  rejectionReason?: string;

  // ----- Failure context -----
  failureReason?: string;
  manualFix?: boolean;

  // ----- Clarification flow (ambiguous-but-safe) -----
  // Operator parks the request at `clarification_needed` with a concise
  // Swedish question; the requester answers via Svara (POST /api/clarify);
  // the answer lands here and the request flips back to `queued`. Both hold
  // the LATEST round — the full Q&A thread is in `history`.
  clarificationQuestion?: string;
  clarificationAnswer?: string;

  // ----- Optional image attachments (1–3 when present) -----
  // See § Attachments below for the full upload contract.
  attachments?: ReadonlyArray<{
    originalFilename: string;            // sanitized display name only
    storedFilename: string;              // "<1-3>-<6 alnum>.<png|jpg|webp>"
    storedPath: string;                  // "requests/<id>/attachments/<storedFilename>"
    mimeType: "image/png" | "image/jpeg" | "image/webp";
    sizeBytes: number;
    sha: string;                         // blob sha — proxy uses it to fetch
    uploadedAt: string;                  // ISO 8601
  }>;

  // ----- Append-only audit trail -----
  history: ReadonlyArray<{
    at: string;                        // ISO 8601
    actor: "user" | "loop" | "admin";  // "user" = the owner (intake); "loop" = operator; "admin" = admin actions
    event:
      | "created"
      | "loop_picked_up"
      | "loop_pushed_pr"
      | "loop_iterated"
      | "improve_requested"
      | "approval_started"
      | "approved"
      | "merged"
      | "rejected"
      | "failed"
      | "retry_queued"
      | "rolled_back";
    message?: string;
  }>;
};
```

**Timestamp rule:** every write MUST refresh `updatedAt`. It is the cheapest "last-modified" signal for the admin UI ordering.

---

## Attachments

The request intake form may include 1–3 image attachments alongside the text. Attachments serve two purposes — both are valid intake shapes:

1. **Reference / clarification** — screenshots showing a layout bug, examples, inspiration, or "here's exactly where I want the change". The operator inspects these to understand the request but does not copy them anywhere.
2. **Source assets for the website** — an image the owner wants used as (or substituted for) an actual web asset on a page. The operator may copy the file from `requests/<id>/attachments/...` into the appropriate project asset/content location on the per-request branch, but only when the request clearly says so. **An uploaded image does not by itself authorize the operator to make a change — the safe edit surface and the four-tier rule still apply.**

### Storage layout

Binary contents are stored as separate repo files; no base64 ever lives inside `requests/<id>.json`.

```
requests/<id>.json                                ← metadata + attachment manifest
requests/<id>/attachments/<index>-<rand6>.<ext>   ← binary blobs
```

- `index` ∈ `{1, 2, 3}` — the upload order
- `rand6` — 6 lowercase alnum chars generated server-side
- `ext` ∈ `{png, jpg, webp}` — derived from the sniffed mime type, never from the user-supplied filename

The user's original filename is **never** used as a path component. It is sanitized for display only and stored in the JSON as `attachments[i].originalFilename`. This rules out path traversal, mojibake-in-path, and case-collision footguns by construction.

### Validation stack (server-side, defense in depth)

1. **Count cap** — at most 3 attachments per request.
2. **Total payload cap** — multipart body ≤ 16 MiB (3 × 5 MB + framing slack).
3. **Per-file declared mime check** — must be `image/png`, `image/jpeg`, or `image/webp`.
4. **Per-file declared size check** — `> 0` and `≤ 5 MB`.
5. **Per-file magic-byte sniff after read** — bytes must match one of the three allowed signatures (PNG `89 50 4E 47`, JPEG `FF D8 FF`, WebP `RIFF…WEBP`). The sniffed mime MUST equal the declared mime — mismatches reject with `file_type_invalid`. Browsers can mis-report `File.type`; bytes are the source of truth.
6. **Server-generated stored filename** — `<index>-<rand6>.<ext>`. The user's filename never reaches the file system.
7. **All-or-nothing semantics** — if any attachment fails validation OR upload, already-uploaded blobs are best-effort deleted via `deleteAttachmentFile` and the request JSON is NOT written. Orphan blobs without a parent JSON are harmless (the queue board never lists them); cleanup is opportunistic.

### main-write narrowing (extends rule 4)

The metadata-write exception explicitly covers the attachment sub-tree. The exposed write helpers (`src/lib/github.ts`) are:

| Helper | Path | Notes |
|---|---|---|
| `putRequestFile(gh, id, …)` | `requests/<id>.json` | Validates `id` via `requestPath()`. |
| `putAttachmentFile(gh, id, name, …)` | `requests/<id>/attachments/<name>` | Validates `id` AND `name` via `attachmentPath()`. `name` must match the server-generated pattern `<1-3>-<6 alnum>.(png|jpg|webp)`. |
| `deleteAttachmentFile(gh, id, name, sha, …)` | `requests/<id>/attachments/<name>` | Best-effort rollback of orphan attachments. Derives the path internally via `attachmentPath(id, name)` — validates `id` AND `name`; the caller passes a validated id + server-generated name, never a free-form path. (A private, unexported `deleteMainFileByPath` does the low-level delete.) |

No exported helper accepts a free-form path on `main`. Both id and stored filename are validated independently, so the surface stays narrow even with the new sub-tree.

### Attachment proxy

The repo is private; raw blob URLs are not viewable in a browser. `GET /api/attachment/[id]/[name]` is the admin-gated proxy that streams a stored image back to the queue board:

- `requireAdmin()` first — no anonymous access.
- Validates `id` and `name` independently.
- Reads `requests/<id>.json`, looks up the attachment record by `storedFilename`, fetches its blob by `sha` via the Git Database API (`git.getBlob` — works at any size, unlike Contents API which placeholders >1 MB).
- Returns the bytes with the recorded `Content-Type`, `X-Content-Type-Options: nosniff`, and `Cache-Control: private, max-age=60`.

The request JSON is the source of truth for which blob each URL serves. The route never selects a blob by free-form URL component — `name` only narrows the lookup inside the manifest.

### Operator handling of attachments

See [`pipeline-operator-modes.md`](./pipeline-operator-modes.md) § Attachments for the operator-side rule. Authoritative summary:

**Two intake shapes — operator picks one from the request wording.**

#### Reference / clarification

Screenshots showing a layout bug, examples, "here's exactly where I want the change". The operator **inspects** the attachment to understand the request, but does NOT copy it anywhere. The request is then judged on the text alone against the normal four-tier rule.

Typical wording: "see screenshot", "look at this", "as shown in the image", "this is where the issue is".

#### Source asset for the website

The owner attached an image they want **used on a page** (added, replaced, or substituted as an actual web asset). The operator IS allowed to copy the uploaded file from `requests/<id>/attachments/...` into the correct project asset folder AND reference it from the appropriate safe content/data file. **This is NOT an unsafe request just because the binary lands outside `src/content/`** — it is the intended source-asset path.

Typical wording: "lägg in dessa", "byt bilden mot denna", "använd denna bild", "lägg till denna på <section>", "replace the X with this", "add this image to <page>".

**Allowed asset-copy operations:**

1. Copy the binary from `requests/<id>/attachments/<storedFilename>` into a **known project asset folder**. Preferred: `public/assets/generated/<safe-generated-filename>`. The destination filename is operator-generated (lowercase, ASCII, hyphenated, descriptive — e.g. `<page>-<topic>.<ext>`); never the raw user filename.
2. Add or update a reference to the new local path in a safe content/data file (`src/content/*.ts`).

That's it — the asset-copy allowance covers exactly those two things.

**Guardrails (all must hold):**

- ✅ Owner's wording clearly says **use / add / replace** / put-this-image-on-page. Don't read into "look at this" — that's reference, not source.
- ✅ Target page/section/current image is **unambiguous** from the request text. If unclear → stop and ask, or `failed + manualFix`. Never guess placement.
- ✅ Destination is a known project asset folder, preferably `public/assets/generated/`. Anywhere outside the established asset layout → stop and ask.
- ✅ Destination filename is a **safe generated** name. Original user filename is for the JSON manifest's `originalFilename` field only.
- ❌ No cropping, retouching, color-grading, heavy optimization, or design-sensitive image choices unless the owner explicitly asked AND the operation stays inside the safe edit surface.
- ❌ No edits to unsafe components or rendering code. Asset copy + safe content/data reference only.
- ❌ Need a new component, layout change, new section, design judgment? Outside the source-asset path → stop and ask, or `failed + manualFix`.

**Attachments still do not expand the whole safe edit surface.** The asset-copy allowance is narrow: binary into the known asset folder, plus a path reference in `src/content/*.ts`. Everything else still falls under the normal four-tier rule.

**Cross-project portability.** When this attachment feature is ported to Shadi (`shadi-web`), the same source-asset rule carries forward verbatim — same destination convention (`public/assets/generated/`), same guardrails. Note it in the Shadi spec when porting; the cross-project pattern lives in [`../docs/REUSABLE-REQUEST-QUEUE-PATTERN.md`](../docs/REUSABLE-REQUEST-QUEUE-PATTERN.md).

---

## Swedish UI vocabulary

This is the **only** place internal status → Swedish UI label is defined. UI code references this table; it does not redefine the words.

**Status labels** (shown on cards in the queue board):

| Internal status | UI label |
|---|---|
| `queued` | `Väntar i kö` |
| `clarification_needed` | `Väntar på svar` |
| `in_progress` | `Pågår` |
| `review` | `Aktivt i review` |
| `improve_requested` | `Behöver justeras` |
| `publishing` | `Publicerar` |
| `done` | `Klart` |
| `rejected` | `Avvisat` |
| `failed` | `Fel` |

**Action labels** (button text on cards):

| Button label | Endpoint | Triggers transition(s) |
|---|---|---|
| `Publicera` | `POST /api/approve/[id]` | `review → publishing → done` |
| `Förbättra` | `POST /api/iterate/[id]` | `review → improve_requested` |
| `Svara` | `POST /api/clarify/[id]` | `clarification_needed → queued` |
| `Avvisa` | `POST /api/reject/[id]` | `review → rejected`, `improve_requested → rejected`, `failed → rejected`, `clarification_needed → rejected` |
| `Försök igen` | `POST /api/admin/retry/[id]` | `failed → queued` |

**Board sections:**

| Section | Statuses shown |
|---|---|
| `Väntar i kö` | `queued` |
| `Väntar på svar` | `clarification_needed` |
| `Aktivt i review` | `in_progress`, `review`, `improve_requested`, `publishing` |
| `Fel` | `failed` |
| `Klart` | `done`, `rejected` (newest-first, capped at 30) |

---

## Request id + slug rules

### Id format

```
id = `${YYYY}${MM}${DD}-${HH}${mm}${ss}-${random6}`
```

`random6` is a 6-char lowercase URL-safe draw (alphabet `abcdefghijklmnopqrstuvwxyz0123456789`). No shared counter, no DB. Collision probability is negligible at this volume (and the per-second timestamp prefix already discriminates most cases).

### Slug normalization

Apply in this exact order. The Swedish character map runs BEFORE NFKD so the letters survive as ASCII rather than being stripped.

1. **Source.** Use the request title. If the title is empty/whitespace/under 3 chars, fall back to the first meaningful words of `description` (stop at the first sentence-ending punctuation, or after 8 words, whichever comes first).
2. **Lowercase.**
3. **Swedish + common-accented character map** (apply BEFORE generic Unicode normalization):
   - `å → a`, `ä → a`, `ö → o`
   - `é → e`, `è → e`, `ê → e`, `ë → e`
   - `á → a`, `à → a`, `â → a`
   - `ó → o`, `ò → o`, `ô → o`
   - `ú → u`, `ù → u`, `û → u`, `ü → u`
   - `í → i`, `ì → i`, `î → i`
   - `ñ → n`, `ç → c`
   - `ß → ss`, `æ → ae`, `ø → o`
4. **NFKD-normalize** (`s.normalize("NFKD")`).
5. **Strip remaining non-ASCII** — drop anything that isn't `[a-z0-9 \-]`.
6. **Replace runs of non-alphanumeric** with a single `-`.
7. **Collapse repeated dashes** (`--+ → -`).
8. **Trim leading and trailing dashes.**
9. **Truncate to max 40 chars**, preferring a word boundary (trim back to the nearest `-` if needed).
10. **Fallback** — if the result is empty, use the literal string `request`.

Examples:

| Input title | Result slug |
|---|---|
| `Önskemål om ny sida` | `onskemal-om-ny-sida` |
| `Byt rubriken på Hem-sidan så den är kortare` | `byt-rubriken-pa-hem-sidan-sa-den-ar` |
| `Café émigré über Naïve` | `cafe-emigre-uber-naive` |
| `!!!??? ` (only punctuation) | `request` |

Branch: `req/<id>-<slug>` — e.g. `req/20260601-101530-k7zr8q-byt-rubriken-pa-hem-sidan-sa-den-ar`.

---

## Public submission contract

`POST /api/feedback` body (all keys English):

```ts
{
  name?: string;          // optional, max 80 chars
  email?: string;         // optional, max 120 chars, validated as email if present
  page: string;           // must be one of ALLOWED_PAGE_IDS
  edit_id?: string;       // unused in v1
  title?: string;         // optional, max 120 chars; auto-generated from message if omitted
  message: string;        // required, 1–4000 chars
  website?: string;       // honeypot — must be absent or empty
}
```

### Validation + abuse controls (all server-side)

| Control | Limit |
|---|---|
| Total request body size | `≤ 16 KB` → reject `413 Payload Too Large` |
| `message` length | required, 1–4000 chars |
| `name` length | optional, 0–80 chars |
| `email` length | optional, 0–120 chars; if present, simple email regex |
| `page` value | must be in `ALLOWED_PAGE_IDS` |
| Honeypot field `website` | must be absent or empty; if present, silently respond `{ ok: true }` without writing |
| Per-IP rate limit | 10 requests per hour per IP. **In-memory best-effort** on serverless; upgrade to Vercel KV / Upstash Redis when real abuse is observed. |
| Queue depth cap | reject with `503 { error: "queue_full" }` if total count of `requests/*.json` with active status (queued/in_progress/review/improve_requested/publishing) exceeds 20 |

### Server-side flow (in order)

1. `requireAdmin()` — pre-launch gate. 401 if no session.
2. Parse + size-check the body. Reject oversize → `413`.
3. Validate every field per the table above. Reject invalid → `400` with `error: "invalid_input"` (don't leak which field).
4. Honeypot check. If positive, respond `{ ok: true }` silently and exit (no Octokit call).
5. Per-IP rate limit. Reject over-limit → `429 Too Many Requests`.
6. Queue depth cap. Reject if over → `503 { error: "queue_full" }`.
7. Generate `id`.
8. Build the Request record (status `queued`, `createdAt = updatedAt = now`, history one `created` entry).
9. Write `requests/<id>.json` to `main` via Octokit (`createOrUpdateFileContents`, hard-coded path).
10. Respond `{ ok: true, id }`.

**Scope guard.** The Octokit call is hard-coded to `path: "requests/<id>.json"`. No request body can broaden the write scope.

### Sensitive-content warning (must render above the textarea)

The form must display a clear, calm Swedish warning before the textarea (rendered even though the form is admin-only pre-launch — the warning stays valid for any future public phase, and the audit-trail concern applies regardless of who submits):

> Skicka inte personnummer, känsliga personuppgifter, lösenord eller annan privat information om dig själv eller andra. Allt du skriver i formuläret sparas i projektets versionshistorik på GitHub.

If sensitive content slips through:

1. Admin **immediately rejects** the request with `rejectionReason: "contains sensitive data"`.
2. Admin **deletes the current `requests/<id>.json`** in a follow-up commit on `main` (removes from the tree but not from history).
3. **If legally required** (e.g. GDPR removal obligations): manual `git filter-repo` rewrite + force-push. Emergency procedure documented in `docs/PIPELINE-HANDOFF.md`. Not self-service.
4. External / private storage for sensitive request text is out of scope for v1.

---

## Admin auth

A single shared admin password, set as `ADMIN_PASSWORD` env var. `/admin/login` POSTs the password to `/api/admin/login`:

1. `crypto.timingSafeEqual` compares plaintext input to `ADMIN_PASSWORD`. No DB.
2. On match, sets an httpOnly + secure + `SameSite=lax` cookie `nastaran-admin` whose value is `<expiryMs>.<hmac-sha256-hex>` (HMAC keyed by `ADMIN_SESSION_SECRET`). (Lax — not strict — because strict blocks the cookie on certain same-site top-level navigations, causing `/api/admin/me` and server-side `hasAdminSession()` to disagree on the same session. The mutative POST routes additionally enforce `assertSameOrigin(req)` as a second CSRF defense layer; SameSite=lax + assertSameOrigin is the layered pattern matching modern session-cookie practice.)
3. Cookie TTL: 7 days.

Every admin endpoint calls `requireAdmin()` (validates the cookie) then `assertSameOrigin(req)` (CSRF defense-in-depth — `Origin` host vs request host). Mismatch → 401 or 403.

Library: `src/lib/auth.ts` exposing `createSession()`, `verifySession(token)`, `requireAdmin()`, `hasAdminSession()`, `assertSameOrigin(req)`, `timingSafeCompare(a, b)`.

**Multi-admin / per-user audit is out of v1.** Every admin action is recorded as `actor: "admin"` with no per-user identity.

---

## Admin actions — API contracts

All status writes target `requests/<id>.json` on `main` via Octokit. Auth: `requireAdmin()` → `assertSameOrigin(req)` on every mutative route.

### `POST /api/approve/[id]`

1. Verify `status === "review"` (otherwise 409).
2. Verify the PR is open + not draft via `octokit.pulls.get`. Resolve `mergeable` (poll briefly if GitHub returns `null`). Verify combined commit status + check runs on the head SHA — pending or failing → 409 `not_mergeable_*`, status stays `review`.
3. CAS: `review → publishing` with history `approval_started`.
4. Squash-merge: `octokit.pulls.merge({ pull_number, merge_method: "squash" })`. The squash commit message uses the PR title.
5. CAS: `publishing → done` with `approvedAt`, `publishedAt`, `productionCommitSha`, history `merged`.
6. Delete the source branch: `octokit.git.deleteRef({ ref: "heads/<branch>" })` (best-effort).
7. Respond `{ ok: true, status: "done", productionCommitSha }`.

### `POST /api/reject/[id]`

Body: `{ reason?: string }` (optional, max 500 chars).

1. Verify `status` is one of `review`, `improve_requested`, `failed`, `clarification_needed` (otherwise 409).
2. Close the PR without merging (best-effort if `pullRequestNumber` present): `octokit.pulls.update({ state: "closed" })`. (A `clarification_needed` request has no PR/branch, so this is a no-op.)
3. Delete the source branch best-effort (only if `branch` starts with `req/`).
4. CAS: → `rejected` with `rejectedAt`, optional `rejectionReason`, history `rejected`.
5. Respond `{ ok: true }`.

### `POST /api/iterate/[id]`

Body: `{ message: string }` (required, 1–2000 chars).

1. Verify `status === "review"` (otherwise 409).
2. CAS: → `improve_requested` with history `improve_requested` (with the message).
3. Respond `{ ok: true }`.

The next operator cycle picks it up and iterates on the **same branch + same PR**. Never opens a duplicate PR.

### `POST /api/clarify/[id]`

Body: `{ answer: string }` (required, 1–2000 chars). Powers the **Svara** button on a `clarification_needed` card.

1. Verify `status === "clarification_needed"` (otherwise 409).
2. CAS: → `queued`; set `clarificationAnswer`; append history `clarification_answered` (actor `admin`, with the answer).
3. Respond `{ ok: true }`.

The next operator cycle re-picks up the **same request** (no new request, no branch, no PR was ever created while parked), reads `clarificationQuestion` + `clarificationAnswer`, and processes it normally. If still ambiguous, the operator may park it again (overwriting the question, clearing the prior answer; the full Q&A thread stays in `history`).

### `POST /api/admin/retry/[id]`

1. Verify `status === "failed"` (otherwise 409).
2. CAS: → `queued`; clear `failedAt`, `failureReason`, `manualFix`; refresh `updatedAt`; append history `retry_queued`.
3. Respond `{ ok: true }`.

### `GET /api/list`

Auth: `requireAdmin()` only (no same-origin check; read-only).

1. List `requests/*.json` on `main` via Octokit (`getContent` directory listing).
2. Fetch each JSON in parallel.
3. Sort: active (`queued`, `in_progress`, `review`, `improve_requested`, `publishing`, `failed`) by `createdAt` asc (FIFO); terminal (`done`, `rejected`) by most recent `approvedAt` / `rejectedAt` desc.
4. Cap the `done` + `rejected` portion at 30.
5. `Cache-Control: no-store`.

### `GET /api/admin/me`

Auth: `requireAdmin()`. Returns `{ authed: true }` (401 otherwise). Used by `AdminFAB` to probe session state on mount.

---

## Approve route caveat

The approve route does **NOT** synchronously poll Vercel for deployment completion:

- Vercel production deploys take 30–90 seconds; a synchronous wait risks Vercel function timeouts that would surface as `publishing → failed` even when the deploy succeeded.
- The squash-merge commit on `main` (`productionCommitSha`) is the durable audit anchor. Vercel auto-deploys `main` independently — production reflects the change within ~1 minute regardless.

Concretely:

- Success response: `{ ok: true, status: "done", productionCommitSha }` — no `productionDeploymentUrl`.
- On the request record, `productionDeploymentUrl` stays `null`. `productionCommitSha`, `approvedAt`, `publishedAt` are filled.
- The board shows the 7-char commit SHA; no "view live" deep link.

A future follow-up could poll `/repos/.../commits/<sha>/status` for Vercel's status check and write `productionDeploymentUrl` back. Until then, treat the field as known-`null`.

---

## Rollback after bad approval

The merge to `main` is a normal git commit. Roll back through a normal PR flow:

```bash
git checkout main && git pull
git checkout -b fix/rollback-<id>
git revert <squash-merge-sha> --no-edit
npm run lint && npm run typecheck && npm run build
git push -u origin fix/rollback-<id>
gh pr create --base main --title "Rollback request <id>: <title>"
```

Approve the rollback PR. Production redeploys.

The original `requests/<id>.json` stays at `done` for audit accuracy. Append a history entry: `{ at, actor: "admin", event: "rolled_back", message: "<rollback PR URL>" }`. No special `rolled_back` status. No DB rollback.

---

## What v1 ships

| Deliverable | Done when |
|---|---|
| `requests/` directory + `requests/README.md` | Committed in PR A |
| `.env.example` documenting the four env vars | Committed in PR A |
| `src/lib/auth.ts` (cookie + session + same-origin) | PR B |
| `src/lib/request-types.ts`, `src/lib/request-store.ts`, `src/lib/github.ts`, `src/lib/pages.ts` | PR B |
| `POST/GET /api/admin/{login,logout,me}` | PR B |
| `/admin` hub + `/admin/login` + `AdminFAB` floating menu | PR C |
| `/onskemal` form (admin-gated + sensitive-content warning) | PR C |
| `/onskemal-kogen` queue board (four sections, polling every 30 s) | PR C |
| `POST /api/feedback` (admin-gated; validation stack) | PR D |
| `GET /api/list` | PR D |
| `POST /api/{approve,reject,iterate}/[id]` + `/api/admin/retry/[id]` | PR D |
| Clean-room validation pass + smoke test + operator starter prompt | PR E |
| `octokit` runtime dependency added | PR B |

## What v1 does NOT ship

- ❌ `GET /api/git/log` + "Senaste ändringar" widget — deferred
- ❌ `EditableText` granular edit modal + `edit-registry` — deferred to a future polish PR
- ❌ Public request intake — deferred (pre-launch admin-only)
- ❌ Mode B cron-driven `claude -p` wrapper, `.loop/` directory, cron entry — parked; see `pipeline-operator-modes.md`
- ❌ Multi-admin / per-user audit — single shared password is enough
- ❌ Email / Slack notifications — future polish
- ❌ External database / Vercel KV / Postgres — file-based queue is enough at this volume
- ❌ Real-time WebSocket updates — manual refresh + auto-refresh every 30 s
- ❌ Server-side rendering of the board with hydrated data — client fetch from `/api/list` is simpler
- ❌ Branch protection on `main` — deferred decision

---

## Acceptance criteria (for PR D / PR E end-to-end test)

### Happy path

| Check | How |
|---|---|
| Submitting via `/onskemal` (logged in) creates a `requests/<id>.json` on `main` (status `queued`) | Look at the repo |
| The new request appears in `Väntar i kö` on `/onskemal-kogen` after refresh | `/api/list` reads from `main` |
| `/onskemal-kogen` is reachable on production after admin login; anonymous → redirect to `/admin/login` | Visit logged-out → redirect; log in → board renders |
| Operator picks the request up, opens a PR, posts a Preview URL; board reflects `Pågår` → `Aktivt i review` | Mode A foreground listener or on-demand "check the queue" |
| **Publicera** squash-merges → Vercel auto-deploys prod → request flips to `Klart` | Verify production reflects change; verify `requests/<id>.json` has `status: "done"` + `productionCommitSha` |
| **Avvisa** closes PR, deletes branch, prod untouched; request shows up in `Klart` history as `Avvisat` | Verify no merge commit on `main`; verify `status: "rejected"` |
| **Förbättra** loops back, **same branch**, same PR, second commit | Verify PR shows two commits; verify status cycled `review → improve_requested → in_progress → review` |
| Request branches remain disposable — only `src/content/*.ts` edits | `git show req/<id>-<slug>` only touches `src/content/*` |

### Failure handling

| Check | How |
|---|---|
| Anonymous `POST /api/feedback` → 401 `{ error: "unauthorized" }`, no file written | `curl -X POST` |
| Anonymous `GET /onskemal` → 307 to `/admin/login?next=...` | `curl -I` |
| Unsafe request (touches `package.json`) → `status: "failed"`, `failureReason`, `manualFix: true`, **no branch pushed** | Submit a structural request |
| Build-gate failure → `status: "failed"`, `failureReason: "<gate> failed: ..."`, no push | Submit a request that breaks typecheck |
| Pre-merge gate negative (PR closed manually) → `409 not_mergeable_*`, status stays `review` | Close PR in GitHub, click Publicera |
| Post-merge metadata write failure → card lands in `Fel` with `manualFix: true`, `productionCommitSha` preserved; **not stuck in `Publicerar`** | Simulate token failure between merge and metadata write |
| **Försök igen** moves `failed → queued`; operator picks up on next cycle | Click on a failed card |
| Admin endpoints require cookie + same-origin | `curl /api/list` anonymous → 401; cross-origin → 403 |

### Static (always-true)

| Check | How |
|---|---|
| `npm run lint` + `typecheck` + `build` green | CI on every PR |
| No visible UI changes on prod for anonymous visitors beyond what `/onskemal` adds | The site looks identical to anonymous visitors; only the temporary footer Admin link is new |

---

## Safety rules (must hold at all times)

- **No `fs.writeFile` for persistent data.** Vercel serverless filesystem is ephemeral. All persistent writes go to GitHub via Octokit.
- **No client-side GitHub tokens / Vercel tokens / Claude API keys.** Server only.
- **Admin endpoints check cookie + same-origin.** Period.
- **The `main` write exception is path-narrowed.** Octokit calls hard-code `path: "requests/<id>.json"`. No other paths on `main` may be written by pipeline code.
- **Operator only edits `src/content/*.ts` on request branches.** Anything else → unsafe → `failed`.
- **No automatic merges from API routes.** Only the explicit `Publicera` action merges.
- **No state-machine bypass.** If a request is `done` or `rejected`, admin actions return 409.
- **No `ANTHROPIC_API_KEY`.** Mode A uses the local Claude CLI subscription session.
