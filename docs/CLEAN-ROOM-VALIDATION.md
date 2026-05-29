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

## Current baseline

Last known-good operational baseline, as of **2026-05-28**:

| Field | Value |
|---|---|
| Repo | `vampyren/nastaran-web` |
| Local path | `/home/spawn/Apps/projects/nastaran-web` |
| `main` HEAD | `7d28c81` (snapshot point — `main` advances as later PRs merge; treat as a marker, not a live pointer) |
| Queue | Idle — all requests terminal (most recent: `/kontakt` "Vad händer sen?" shipped 2026-05-28) |
| Listener / operator | Stopped between sessions — the foreground listener is session-only |
| Open PRs | None (steady state) |
| Pipeline | Installed + tested (PRs A–E); content-driven renderer glue + Vercel branch-recovery exercised 2026-05-28 |
| Attachments | Installed + tested (1–3 per request) |

Refresh this snapshot after any operational change — a new merge to `main`, a request processed end-to-end, or the listener being restarted.

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
12. **Listener mode.** Owner says "start the listener" in the operator session. Session schedules a `ScheduleWakeup` ~10 min in the future (idle default). With an empty queue, each wake **polls quietly** — no chat output on idle ticks (at most an occasional "listener alive" heartbeat) — then reschedules. The owner can force an immediate check at any time with "check the queue now" / "pick it up" / "process the queue". **Review-state decision-watch:** while a request the operator pushed is at `review` awaiting Publicera / Förbättra / Avvisa, the listener may poll on a faster **quiet ~60 s** cadence until that request is terminal, then return to ~10 min idle. Closing the session ends the listener — verify by reopening a fresh session and confirming nothing wakes on its own.
13. **Clarification flow.** Submit an ambiguous-but-safe request (e.g. text says "första sidan" but the page picker says Berättelser). Operator does **not** guess — it CAS-writes `queued → clarification_needed` with a Swedish `clarificationQuestion`, **no branch/PR**. The card appears under **Väntar på svar** with the question. While it waits, submit a second clear request and confirm the operator still processes it (lane not blocked). Click **Svara**, answer → request flips back to `queued` (`clarificationAnswer` + history `clarification_answered` written), still the **same** request id, still no branch/PR. Operator re-picks it up, reads Q+A, processes to `review`. Verify: no duplicate request/branch/PR; **Avvisa** from `clarification_needed` → `rejected`; answering when not in `clarification_needed` → 409.

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

### Live-run end-to-end smoke — CORE LOOP PASSING (2026-05-27)

First live exercise of the pipeline. Reference request id: `20260527-164925-racyaw`. The full **queued → in_progress → review → improve_requested → review → publishing → done** loop is validated end-to-end against the deployed production app. **Three bugs surfaced during the run; all three were fixed (PR #17 + PR #18).** After PR #18 deployed, the owner re-tested and confirmed login persistence + Publicera all work cleanly. PR #16 squash-merged to `main` as commit `d081c2f` ("Ändra texten ..."); request status is now `done` with `productionCommitSha = d081c2f`, `approvedAt = 2026-05-27T18:28:55Z`, `publishedAt = 2026-05-27T18:28:58Z`.

**Steps exercised:**

| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Vercel env vars set + Production redeploy Ready | ✅ | After diagnosing and correcting the GitHub fine-grained PAT scope to `Contents: Read and write` — the default Read-only made `POST /api/feedback` return a 404 from GitHub ("missing `contents=write`"). |
| 2 | Owner logs in at `/admin/login` → `/admin` renders + `AdminFAB` visible | ✅ | First login worked; first refresh exposed bug #1 below. |
| 3 | Owner submits a tiny test request from `/onskemal` | ✅ | "Tack — det är skickat ✓" with reference id `20260527-164925-racyaw`. |
| 4 | Request file appears on `main` as `requests/<id>.json` with `status: "queued"` | ✅ | |
| 5 | Operator picks up via "check the queue" | ✅ | Branched `req/20260527-164925-racyaw-andra-texten-oppna-kontaktsidan-pa` off `main`, edited `src/content/home.ts` (`home.contactTeaser.cta.label`), ran gates, pushed commit `a5cdb4b`, opened PR #16, CAS `in_progress → review` with PR + preview URL. |
| 6 | Card moves to `Aktivt i review` on the board | ✅ | |
| 7 | **Publicera** — owner clicks → squash-merge + production deploy | ✅ | Owner clicked Publicera on PR #16 after PR #18's SameSite fix deployed (initial attempt pre-PR-#18 silently failed — see bug #3 below). Pre-merge gate passed (PR mergeable, checks green). CAS `review → publishing → done` on `main` via `/api/approve/[id]`. Squash-merge commit on `main`: `d081c2f` ("Ändra texten 'Öppna kontantsidan' på knappen till något trev"). `productionCommitSha = d081c2f`. Card moved from `Aktivt i review` to `Klart`. PR #16 state `MERGED` at 2026-05-27T18:28:57Z. Vercel production rebuilt with the "Kontakta mig" CTA change. `req/*` branch deleted. |
| 8 | **Förbättra** — owner submits refinement, operator reuses **same branch + same PR** | ✅ | Refinement message processed; second commit `6eca008` pushed to the same `req/*` branch. PR #16 commit count = 2. No duplicate PR opened. CAS `review → improve_requested → in_progress → review` with refreshed `latestCommitSha`. |
| 9 | **Avvisa** — owner closes a card; PR closes unmerged | ⏳ | Not yet exercised. |
| 10 | **Försök igen** — deliberately unsafe request → `failed + manualFix` → retry → `queued` | ⏳ | Not yet exercised. |
| 11 | **Single-lane invariant** with a second concurrent submission | ⏳ | Partially: the single-lane invariant was respected during the Förbättra iteration (improve_requested → in_progress → review on the same request, not a new claim). Not yet stress-tested with a second concurrent submission. |
| 12 | **Listener mode** (`start the listener` → ~10 min quiet `ScheduleWakeup` cadence) | ⏳ | Not yet exercised. The on-demand `check the queue` shape was used for steps 5 + 8. |

**Three bugs surfaced during the live run; all three fixed:**

1. **Admin session cookie didn't survive page refresh.** Root cause: `src/app/api/admin/login/route.ts` was setting the cookie via `(await cookies()).set(...)` from `next/headers`. In Next.js Route Handlers this pattern was observed to drop the `maxAge` attribute, turning the intended 7-day persistent cookie into a session cookie. **Fix in PR #17 (merged as `acd88cc`):** switched to `res.cookies.set()` on the `NextResponse.json(...)` directly. Same fix applied to `src/app/api/admin/logout/route.ts` for consistency. Auth attributes (`httpOnly`, `secure`, `sameSite`, `maxAge: 7d`, `path: "/"`) all unchanged — the bug was that those documented attributes weren't reaching the browser.

2. **Logo and "Hem" did nothing when already on `/`.** Root cause: Next.js `<Link href="/">` skips navigation when the current pathname matches the target href. **Fix in PR #17 (merged as `acd88cc`):** added a `handleNavClick(event, targetHref)` helper to `src/components/SiteHeader.tsx` that, when `targetHref === "/" && pathname === "/"`, calls `event.preventDefault()` and `window.scrollTo({ top: 0, behavior })` with `behavior` gated on `prefers-reduced-motion`. Applied to the logo `<Link>` and to the desktop + mobile nav renders. Hash anchors like `/#behandlingar` and cross-route navigation are unaffected.

3. **`SameSite=Strict` blocked the cookie on certain same-site top-level navigations — refresh of admin-gated pages still 307'd to `/admin/login` even with PR #17 in place.** This surfaced after PR #17 deployed and the cookie's `maxAge` was correctly persistent. Symptom: `/api/admin/me` (same-document `fetch`) returned 200, but page refresh of `/onskemal` / `/onskemal-kogen` returned 307 to login. Owner browser inspection confirmed the cookie had `SameSite: Strict` and was being blocked on the top-level GET. The same blocking made the **first Publicera click silently fail** — the `POST /api/approve/[id]` was rejected because the cookie wasn't sent on the cross-context POST, returning 401 from `requireAdmin`; the queue board's 8-second auto-clearing error banner masked the failure. **Fix in PR #18 (merged as `366cb60`):** changed cookie `sameSite` from `"strict"` to `"lax"` in `src/app/api/admin/login/route.ts`. Also tightened the logout delete to pass `{ name, path: "/" }` so the cookie clear matches the set's path attribute. CSRF protection remains intact: lax doesn't send the cookie on cross-site POSTs (the dangerous case), and the mutative admin POST routes already enforce `assertSameOrigin(req)` as a second CSRF layer. SameSite=lax + assertSameOrigin matches the modern recommended pattern. Spec line in `spec/pipeline-mvp.md` § Admin auth updated to match.

**Post-PR-#18 retest (owner-confirmed):**

- Log out + log in fresh ✅ (cookie clears reliably with the path-matched delete; new cookie has `SameSite: Lax`).
- Refresh `/admin`, `/onskemal`, `/onskemal-kogen` ✅ — all stay logged in after PR #18.
- Click Publicera on PR #16 ✅ — completed end-to-end. Request → `done`, PR #16 → MERGED at `d081c2f`, Vercel production rebuilt with the "Kontakta mig" CTA change.

**Net status:**

- The pipeline's full state machine (Submit → operator pickup → review → Förbättra → review → Publicera → done) is **validated end-to-end on production**.
- All three surfaced bugs were runtime issues (cookie emission + nav UX + cookie SameSite scope), not state-machine bugs. None required changing the spec's behavioral contracts.
- PR #16 was Publicera'd cleanly; the live request lifecycle now has a real `done` example with both metadata commit (`97519e3`) and the squash-merge commit (`d081c2f`) on `main`.
- Remaining unexercised steps (Avvisa, Försök igen, single-lane with a concurrent submission, listener mode) are operational paths that can be exercised opportunistically; they're not closeout-blocking since the core loop is proven.

**Independent UX gap noted (not part of this PR):** queue board's `actionError` auto-clears after 8 s (`src/app/onskemal-kogen/QueueBoard.tsx`). That auto-clear masked the first Publicera failure caused by bug #3 — the owner saw the brief error banner but it disappeared before they could read it. Worth a separate small chore PR raising the timeout to ~30 s or making the error persistent until manually dismissed. Tracking outside PR #14.

---

### Live operator run — 2026-05-28 (renderer glue + decision-watch)

First live run to exercise **content-driven renderer glue** and to surface the **review-state decision-watch** need. Request `20260528-125816-ngipww` — add a "Vad händer sen?" section to `/kontakt`.

- **Renderer glue:** the request could not be satisfied by `src/content/kontakt.ts` alone — the kontakt renderer is hardcoded per-section with no slot for a new section. Processed by adding a `nextSteps` content field **plus** a minimal section in `src/app/kontakt/page.tsx` to display it (reusing existing visual tokens; no redesign). This is the canonical example for the glue allowance now in `spec/pipeline-operator-modes.md` § Four-tier classification rule and `spec/pipeline-mvp.md` § Safe edit surface.
- **Vercel branch recovery:** the first request branch (`req/…-forbattra-kontaktsidan-genom-att-lagga`, PR #28) hit a repeated Vercel deploy failure — *"The provided GitHub repository does not contain the requested branch or commit reference"* — even though the ref existed and CI passed; an empty retrigger commit did not clear it. Recovered by cherry-picking the real change onto a fresh branch (`req/…-kontakt-v2`, PR #29), where Vercel built the preview successfully. Stale PR #28 was closed + branch pruned only **after** #29's preview was confirmed. **Lesson:** a stale/blocked Vercel ref is recovered by replacing the branch, not by retrying empty commits on it.
- **PR → preview → production:** worked end-to-end on the replacement branch. Publicera squash-merged PR #29 → production (`productionCommitSha f018c87`).
- **Decision-watch evidence:** the Publicera click was first detected on a **later ~10 min listener wake**, not promptly — correct given Mode A has no push signal, but slower than ideal. This motivated the review-state **~60 s quiet decision-watch** rule (see `spec/pipeline-operator-modes.md` § Foreground listener).

This run also validates the previously-⏳ **listener mode** path (start the listener → quiet idle poll → a wake detected a real state change) alongside the glue + recovery behaviors.

---

## Status — 2026-05-27 (final)

- ✅ Anonymous production smoke: passing.
- ✅ Clean-room docs comprehension: passing.
- ✅ Live-run end-to-end smoke: **core loop passing**. Submit + Förbättra + Publicera all validated end-to-end against production. Three bugs surfaced and were fixed (PRs #17 + #18). Remaining operational paths (Avvisa, Försök igen, single-lane-with-concurrent, listener mode) are documented as ⏳ to-do for future runs but are not closeout-blocking.

The pipeline shape, safety boundaries, and the core state-machine loop are validated. Future live-run additions (the remaining ⏳ steps, or follow-up runs as the pipeline gets ongoing use) can be appended as new `### Live-run end-to-end smoke — <date>` headings under the Results section above.
