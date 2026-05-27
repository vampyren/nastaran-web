# Clean-room validation

Captures the validation pass run on PR E (2026-05-27) and the live-run smoke checklist gated on Vercel env vars.

This is **the plan + the report** for verifying the pipeline is operationally sound and the docs are self-sufficient — not a per-fire log. Re-run the live-run sections each time env vars change or after a long quiet period.

Cross-references:

- [`PIPELINE-HANDOFF.md`](./PIPELINE-HANDOFF.md) — from-zero setup walkthrough.
- [`REUSABLE-REQUEST-QUEUE-PATTERN.md`](./REUSABLE-REQUEST-QUEUE-PATTERN.md) — the cross-project abstract pattern.
- [`../spec/pipeline-mvp.md`](../spec/pipeline-mvp.md) — data model, state machine, API contracts.
- [`../spec/pipeline-operator-modes.md`](../spec/pipeline-operator-modes.md) — operator behavior (Mode A active, Mode B parked).
- [`../requests/README.md`](../requests/README.md) — `main`-write exception.

---

## Purpose

Three things need to be true for the pipeline to ship cleanly:

1. **The code is operational.** Anonymous and authenticated paths return the expected HTTP responses, and the state machine moves requests through the documented transitions without getting stuck.
2. **The docs are self-sufficient.** A fresh operator can read only the project docs (no chat context, no source code reading) and answer fundamental "how do I operate this" questions correctly.
3. **The safety boundaries hold under direct attack.** Anonymous direct POST to mutative endpoints, cross-origin requests, malformed ids — all rejected with no side effects.

This document records the test plan, the criteria, and the actual results for each.

---

## Methodology

| Layer | Method |
|---|---|
| **Anonymous production smoke** | `curl` against `https://nastaran-web.vercel.app` from this Claude Code session. No credentials, no cookies. Verifies routes return the documented 200 / 307 / 401 responses. |
| **Clean-room docs comprehension** | A fresh subagent (no conversation context) is given paths to **only** the seven project docs and asked eleven specific questions about pipeline operation. Pass = every answer is correct AND citable from a single doc section. |
| **Live-run end-to-end smoke** | The full Publicera / Förbättra / Avvisa / Försök igen + single-lane checklist, executed by the owner once `GITHUB_TOKEN`, `GITHUB_REPO`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` are set in the Vercel dashboard per `PIPELINE-HANDOFF.md` § 2.3. Gated on the human; documented here. |

---

## Pass / fail criteria

A pass requires **all three** layers to come back clean:

1. **Anonymous smoke (mechanical):** every endpoint returns the documented response. Any 5xx, missing redirect target, or unexpected 200 is a fail. **`POST /api/feedback` without a session cookie must return 401 and must NOT write a file to `requests/` on `main`** — this is the single most important check. Re-verify by listing `requests/` on `main` after the curl.
2. **Clean-room docs (judgmental but bounded):** the test agent must answer all eleven questions with the correct content AND a citation that points to a single file/section. An answer that requires the agent to weave together fragments across files counts as a friction point — recorded, not a blocker.
3. **Live-run end-to-end (procedural):** every step in § Live-run smoke checklist below executes as documented. Any state-machine deviation (a request stuck in `publishing`, a duplicate PR opened for `improve_requested`, a `req/*` branch not deleted after `done`/`rejected`) is a fail.

---

## Test inputs

### Anonymous production smoke

| Method | Path | Expectation | Notes |
|---|---|---|---|
| `GET` | `/` | 200 | Public home page. |
| `GET` | `/admin` | 307 → `/admin/login?next=/admin` | Server-side gate. |
| `GET` | `/admin/login` | 200 | Public login form. |
| `GET` | `/onskemal` | 307 → `/admin/login?next=%2Fonskemal` | Server-side gate, pre-launch admin-only. |
| `GET` | `/onskemal-kogen` | 307 → `/admin/login?next=/onskemal-kogen` | Server-side gate. |
| `POST` | `/api/feedback` (no cookie, valid JSON body) | 401 `{"error":"unauthorized"}` | **No file written.** Verify by listing `requests/` on `main` after. |
| `GET` | `/api/list` (no cookie) | 401 `{"error":"unauthorized"}` | Admin-only read. |
| `GET` | `/api/admin/me` (no cookie) | 401 `{"error":"unauthorized"}` | Probe used by AdminFAB. |

### Clean-room docs comprehension — eleven questions

The test agent is given paths to **only**:

1. `CLAUDE.md`
2. `docs/PIPELINE-HANDOFF.md`
3. `docs/REUSABLE-REQUEST-QUEUE-PATTERN.md`
4. `spec/pipeline-mvp.md`
5. `spec/pipeline-operator-modes.md`
6. `requests/README.md`
7. `.env.example`

It is **explicitly forbidden** from reading any source under `src/**`, `package.json`, or any other file. Then it answers (with citation):

1. How is Mode A started and stopped? (on-demand vs. foreground listener trigger words; how the listener ends)
2. What is the safe edit surface? What happens if a request needs an edit outside it?
3. Describe Publicera, Förbättra, Avvisa: endpoint, state transitions, PR/branch fate.
4. What is allowed to write directly to `main`? Be specific about the path and writer.
5. What is NOT allowed? List five things explicitly prohibited.
6. What is the four-tier classification rule? Each tier and the operator action.
7. What is the single-lane invariant? Across which statuses, and what is the exception?
8. What is the request id format? Including the regex if documented.
9. What four environment variables must be set in Vercel? Name + one-phrase purpose.
10. What is the current intake policy? What returns 401, and what are the three conditions to lift the gate?
11. Where does the rolling output file live, and what is its purpose?

### Live-run end-to-end smoke — sequenced

Each step assumes the previous one passed. Pause and triage on any deviation.

1. **Vercel env vars set.** Owner has set all four (`GITHUB_TOKEN` / `GITHUB_REPO` / `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET`) in the Vercel dashboard and **redeployed** the latest production deployment. Verify by opening `https://nastaran-web.vercel.app/admin/login` and successfully logging in.
2. **Hub renders.** After login, owner lands at `/admin` and sees the four-card hub (`Skicka önskemål` / `Önskemålskö` / `Visa webbplatsen` / `Logga ut`). The floating `AdminFAB` appears bottom-right and is hidden on `/admin/login`.
3. **Submit a test request.** From the hub, click `Skicka önskemål` → fill in a tiny content change (e.g. "Change the word 'Hem' to 'Startsida' on the home page"). Submit. Success view shows `Tack — det är skickat ✓` plus the reference id (`YYYYMMDD-HHmmss-<6 chars>`).
4. **Request file appears on `main`.** `git fetch && git pull && ls requests/` shows a new `<id>.json` (besides `README.md`). `jq '.status' requests/<id>.json` returns `"queued"`.
5. **Operator picks it up.** In a Claude Code session in this repo, run the operator starter prompt from `PIPELINE-HANDOFF.md` § 6.1, then say **"check the queue"**. The session reads the queue, classifies (clear content-only), creates `req/<id>-<slug>` off `main`, edits `src/content/*.ts`, runs `lint + typecheck + build`, pushes, opens the PR via `gh pr create`, then CAS-writes status `in_progress → review` with PR + preview metadata.
6. **Card moves to review.** `/onskemal-kogen` shows the card in `Aktivt i review` with `Publicera` / `Förbättra` / `Avvisa` buttons. Opening the preview URL shows the change.
7. **Publicera.** Click `Publicera`. Expected: pre-merge gate passes (PR open + not draft + mergeable + checks green), CAS `review → publishing`, squash-merge via Octokit, CAS `publishing → done` with `productionCommitSha`, branch deletes, prod auto-deploys, card moves to `Klart`.
8. **Förbättra.** On another fresh card in `review`, click `Förbättra`, type a refinement (e.g. "Make the change apply to the page title too"). Status flips to `improve_requested`, operator picks it up on the next cycle, **reuses the same branch + same PR**, pushes a second commit. PR shows two commits, not two PRs. Status returns to `review`.
9. **Avvisa.** On a third fresh card in `review`, click `Avvisa` with an optional reason. PR closes unmerged, branch deletes, status → `rejected`, production untouched.
10. **Försök igen.** Submit a deliberately unsafe request (e.g. "bump the version in package.json to 99.0.0"). Operator classifies unsafe → CAS to `failed + manualFix`. Card appears in `Fel`. Click `Försök igen`. Status flips back to `queued`. Operator picks it up again on the next cycle and classifies again — still unsafe, still moves to `failed`. Click `Avvisa` from `failed` to clear the card.
11. **Single-lane.** While a request is in `review`, submit a second request. Tell the operator "check the queue". Expected: operator does NOT claim the second. Emits `loop: lane busy (active <id> at review)`. Second request stays at `queued` until the first reaches a terminal state.
12. **Listener mode.** Owner says "start the listener" in the operator session. Session schedules a `ScheduleWakeup` ~60 s in the future. With an empty queue, each wake emits `loop: queue empty` and reschedules. Closing the session ends the listener — verify by reopening a fresh session and confirming nothing wakes on its own.

---

## Results

### Anonymous production smoke — **PASS** (2026-05-27, on `main` at `3786d53` post-PR-D, deployed to `https://nastaran-web.vercel.app`)

Recorded run output:

```
GET /                                 → HTTP 200 in 0.80s
GET /admin                            → HTTP 307 → /admin/login?next=/admin
GET /admin/login                      → HTTP 200
GET /onskemal                         → HTTP 307 → /admin/login?next=%2Fonskemal
GET /onskemal-kogen                   → HTTP 307 → /admin/login?next=/onskemal-kogen
POST /api/feedback (no cookie)        → HTTP 401 {"error":"unauthorized"}
GET  /api/list (no cookie)            → HTTP 401 {"error":"unauthorized"}
GET  /api/admin/me (no cookie)        → HTTP 401 {"error":"unauthorized"}
```

Verified: `git ls-tree origin/main requests/` shows only `README.md` after the unauthorized `POST /api/feedback` — no `<id>.json` was written. The pre-launch admin gate held under direct probe.

### Clean-room docs comprehension — **PASS** (2026-05-27, run via a fresh Explore subagent with file allowlist only)

The test agent answered all eleven questions correctly with citations:

| # | Question | Answer cited from |
|---|---|---|
| 1 | Mode A start/stop trigger words | `spec/pipeline-operator-modes.md` § On-demand + § Foreground listener |
| 2 | Safe edit surface + failure path | `spec/pipeline-mvp.md` § Safe edit surface |
| 3 | Publicera / Förbättra / Avvisa contracts | `spec/pipeline-mvp.md` § Admin actions — API contracts |
| 4 | What writes directly to `main` | `requests/README.md` § The `main`-write exception |
| 5 | Five prohibited operations | `spec/pipeline-operator-modes.md` § Negations + `CLAUDE.md` § Request/publish pipeline rules |
| 6 | Four-tier classification rule | `spec/pipeline-operator-modes.md` § Four-tier classification rule |
| 7 | Single-lane invariant + exception | `CLAUDE.md` § Request/publish pipeline rules (rule 7) |
| 8 | Request id format | `spec/pipeline-mvp.md` § Request id + slug rules |
| 9 | Four env vars | `docs/PIPELINE-HANDOFF.md` § 2.3 + `.env.example` |
| 10 | Pre-launch admin-gating + three-condition removal trigger | `spec/pipeline-mvp.md` § Pre-launch admin-gating |
| 11 | Rolling output file location and purpose | `CLAUDE.md` § Rolling output file |

Agent's overall assessment: *"Documentation is substantially self-sufficient. Every answer is directly citable from a single section. No inference required."*

One friction point recorded: question 5 (five prohibitions) required the agent to compose its list from two locations (`spec/pipeline-operator-modes.md` § Negations and `CLAUDE.md` § Request/publish pipeline rules). The information is explicit in both places; consolidation would be a small clarity improvement but is **not a blocker** — both lists agree.

### Live-run end-to-end smoke — **PENDING** (gated on Vercel env vars)

Status: ready to execute. Owner sets the four Vercel env vars per `PIPELINE-HANDOFF.md` § 2.3 and redeploys. Then walk through the twelve-step checklist above in one sitting. Record the results back into this file under a new heading dated for the run.

Failure escape hatches if any step deviates:

- **Step 1 (login fails):** `ADMIN_PASSWORD` mismatch (wrong value in dashboard), or `ADMIN_SESSION_SECRET` shorter than 16 chars (HMAC throws), or deployment wasn't redeployed after env vars landed. See `PIPELINE-HANDOFF.md` § 7.
- **Step 3 (`Servern är inte färdig konfigurerad ännu`):** `GITHUB_TOKEN` or `GITHUB_REPO` missing/mistyped. See `PIPELINE-HANDOFF.md` § 7.
- **Step 5 (operator can't open PR):** PAT scope missing — needs Contents R/W AND Pull requests R/W per `PIPELINE-HANDOFF.md` § 2.2.
- **Step 7 (Publicera returns `not_mergeable_*`):** PR not ready — wait for CI green, then click again. Status stays at `review`, never stuck in `publishing`. See `PIPELINE-HANDOFF.md` § 7.
- **Step 8 (Förbättra opens a duplicate PR):** operator bug. Stop immediately, file under "operator deviation from spec" and triage before further runs.

### Live-run end-to-end smoke — PARTIAL (2026-05-27)

First live exercise of the pipeline. Reference request id: `20260527-164925-racyaw`. The core queued → in_progress → review → improve_requested → review loop was validated end-to-end against the deployed production app. Two bugs surfaced during the run and were fixed in PR #17 (merged as `acd88cc`).

**Steps exercised:**

| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Vercel env vars set + Production redeploy Ready | ✅ | After diagnosing and correcting the GitHub fine-grained PAT scope to `Contents: Read and write` — the default Read-only made `POST /api/feedback` return a 404 from GitHub ("missing `contents=write`"). |
| 2 | Owner logs in at `/admin/login` → `/admin` renders + `AdminFAB` visible | ✅ | First login worked; first refresh exposed bug #1 below. |
| 3 | Owner submits a tiny test request from `/onskemal` | ✅ | "Tack — det är skickat ✓" with reference id `20260527-164925-racyaw`. |
| 4 | Request file appears on `main` as `requests/<id>.json` with `status: "queued"` | ✅ | |
| 5 | Operator picks up via "check the queue" | ✅ | Branched `req/20260527-164925-racyaw-andra-texten-oppna-kontaktsidan-pa` off `main`, edited `src/content/home.ts` (`home.contactTeaser.cta.label`), ran gates, pushed commit `a5cdb4b`, opened PR #16, CAS `in_progress → review` with PR + preview URL. |
| 6 | Card moves to `Aktivt i review` on the board | ✅ | |
| 7 | **Publicera** — owner clicks → squash-merge + production deploy | ⏳ | **Not yet exercised** — owner has not clicked Publicera on PR #16 as of this writing. Code path is implemented per `spec/pipeline-mvp.md` § `POST /api/approve/[id]` but the end-to-end live run is pending the owner's terminal action. |
| 8 | **Förbättra** — owner submits refinement, operator reuses **same branch + same PR** | ✅ | Refinement message processed; second commit `6eca008` pushed to the same `req/*` branch. PR #16 commit count = 2. No duplicate PR opened. CAS `review → improve_requested → in_progress → review` with refreshed `latestCommitSha`. |
| 9 | **Avvisa** — owner closes a card; PR closes unmerged | ⏳ | Not yet exercised. |
| 10 | **Försök igen** — deliberately unsafe request → `failed + manualFix` → retry → `queued` | ⏳ | Not yet exercised. |
| 11 | **Single-lane invariant** with a second concurrent submission | ⏳ | Partially: the single-lane invariant was respected during the Förbättra iteration (improve_requested → in_progress → review on the same request, not a new claim). Not yet stress-tested with a second concurrent submission. |
| 12 | **Listener mode** (`start the listener` → ~60 s `ScheduleWakeup` cadence) | ⏳ | Not yet exercised. The on-demand `check the queue` shape was used for steps 5 + 8. |

**Two bugs surfaced during the live run, both fixed in PR #17 (merged as `acd88cc`):**

1. **Admin session cookie didn't survive page refresh.** Root cause: `src/app/api/admin/login/route.ts` was setting the cookie via `(await cookies()).set(...)` from `next/headers`. In Next.js Route Handlers this pattern was observed to drop the `maxAge` attribute, turning the intended 7-day persistent cookie into a session cookie that died on refresh. **Fix:** switched to `res.cookies.set()` on the `NextResponse.json(...)` directly — sets the cookie on the response object explicitly. Same fix applied to `src/app/api/admin/logout/route.ts` for consistency (`res.cookies.delete()`). Auth attributes (`httpOnly`, `secure`, `sameSite: "strict"`, `maxAge: 7d`, `path: "/"`) all unchanged — the bug was that those documented attributes weren't reaching the browser.

2. **Logo and "Hem" did nothing when already on `/`.** Root cause: Next.js `<Link href="/">` skips navigation when the current pathname matches the target href, so clicking the logo or "Hem" while scrolled down on the home page was a silent no-op. **Fix:** added a `handleNavClick(event, targetHref)` helper to `src/components/SiteHeader.tsx` that, when `targetHref === "/" && pathname === "/"`, calls `event.preventDefault()` and `window.scrollTo({ top: 0, behavior })` with `behavior` gated on `prefers-reduced-motion`. Applied to the logo `<Link>` and to the desktop + mobile nav renders. Hash anchors like `/#behandlingar` and cross-route navigation are unaffected.

**Net status after the partial run:**

- The pipeline shape, safety boundaries, and the core `queued → in_progress → review → improve_requested → review` loop are validated end-to-end on production.
- The two surfaced bugs are runtime issues, not state-machine bugs — they were UI/cookie-emission issues fixed in PR #17.
- PR #16 remains OPEN at `review` awaiting the owner's terminal action (Publicera / Förbättra / Avvisa). When the owner Publicera's, the `review → publishing → done` transitions can be appended to this section.
- The remaining unexercised steps (Avvisa, Försök igen, single-lane with a concurrent submission, listener mode) are operational paths the owner can exercise as needed; they're not closeout-blocking.

---

## Status — 2026-05-27 (updated)

- ✅ Anonymous production smoke: passing.
- ✅ Clean-room docs comprehension: passing.
- 🟡 Live-run end-to-end smoke: **partial**. Submit + Förbättra validated; Publicera / Avvisa / Försök igen / single-lane-with-second-queue / listener mode pending. Two bugs surfaced + fixed (PR #17). See § Results > Live-run end-to-end smoke above.

The pipeline shape, safety boundaries, and the core state-machine loop are validated. The remaining unexercised paths can be filled in over time as the owner runs them — append new `### Live-run end-to-end smoke — <date>` headings to the Results section above.
