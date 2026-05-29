# Spec — pipeline operator modes

Companion to [`pipeline-mvp.md`](./pipeline-mvp.md). That spec defines **what** the operator does (state machine, API contracts, hard rules). This spec defines **how** the operator runs.

**Active operating model: Mode A — interactive Claude Code session.** The active Claude Code session itself is the queue operator. Mode A has two usage shapes within the same session model:

- **On-demand (default).** Owner says "check the queue" when work is expected.
- **Foreground listener (opt-in).** Owner says "start the listener"; the same session self-schedules a **~10 min** re-check loop via `ScheduleWakeup` while it stays open. The owner can force an immediate check at any time ("check the queue now", "pick it up", "process the queue").

Both shapes are interactive, supervisor-present, and end the moment the session closes. **No cron, no wrapper, no child `claude -p` process, no `ANTHROPIC_API_KEY`, no auto-merge of source PRs.**

**Mode B — cron-driven `claude -p` wrapper — is PARKED.** Not implemented in this project. Adopting Mode B would require wrapper-level output-contract enforcement and permission-handoff hardening; it is out of scope until/unless explicitly approved.

---

## Roles (three, and only three)

This project's model has exactly three roles. Use these terms; avoid the bare word "operator" unless it's clear it means the queue worker / CC.

1. **Requester / user** — the person who submits a request through the website (`/onskemal`). Answers ordinary clarification questions in the website queue UI (**Svara**) and can cancel/reject a request (**Avvisa**).
2. **Queue worker / CC** — the active Claude Code session processing the queue. It reads requests, classifies them, writes request metadata, creates branches / PRs / previews, and waits for approval. It does **not** guess unclear-but-safe requests, and it does **not** interrupt the owner in Claude Code for ordinary clarification — it parks those as `clarification_needed` for the requester to answer in the UI.
3. **Owner / admin / supervisor (Rex)** — one and the same human authority. Approves / improves / rejects / publishes through the admin website flow (Publicera / Förbättra / Avvisa). Interrupted **directly in Claude Code only** when something is unsafe, structural, broken, outside the safe edit surface, or otherwise needs human judgment that a normal clarification question can't resolve.

**Throughout this spec, "operator" ≡ queue worker / CC (role 2).**

---

## Mode A — Interactive Claude Code operator (the queue worker / CC)

### Two usage shapes

#### On-demand (default)

The owner opens a Claude Code session in this repo (`/home/spawn/Apps/projects/nastaran-web`) and says **"check the queue"** when work is expected. The session:

1. `git checkout main && git pull origin main` — make sure the local clone is current.
2. Reads `requests/*.json` (skip `README.md`).
3. Single-lane check: if anything is in `in_progress`, `clarification_needed`, `review`, `improve_requested`, or `publishing` (the `LANE_BLOCKING_STATUSES`), report `loop: lane busy (active <id> at <status>)` and stop. **`clarification_needed` blocks the lane** — while a request waits for the requester's answer, CC does not pick up anything else.
4. If lane clear, find the oldest `queued` or `improve_requested` request and classify it (four-tier rule below).
5. Clear content-only → claim, branch, edit, gate, push, PR, flip to `review`.
6. **Ambiguous-but-safe → CAS to `clarification_needed`** with a concise Swedish `clarificationQuestion` (no claim, no branch, no PR). The requester answers in the board (**Svara**); it returns to `queued`. Do NOT guess, do NOT stop the listener for this. (Genuine owner-policy decisions — not requester-answerable — can still stop and ask the owner.)
7. Structural / unsafe → CAS to `failed + manualFix` with a clear `failureReason`, log it, stop.
8. Empty queue → emit `loop: queue empty` and stop.

Nothing runs between owner pings. This is the validated default.

#### Foreground listener (opt-in, this-session-only)

Owner says **"start the listener"** (or equivalent). Claude Code then self-schedules a periodic re-check loop via `ScheduleWakeup` from within the running session. **Default cadence: about every ~10 minutes** while the session is active. Queue pickup does not need to be near-instant — dev work takes time anyway — so a ~10-minute idle poll keeps token spend low. (A faster ~60 s default was tried and judged wasteful; faster pickup is now on-demand only, see *Manual immediate check* below.)

Each wake runs the loop body above; the listener stops the moment any hard-stop condition fires, or when the session itself closes.

**Manual immediate check (override).** The ~10-minute cadence is only the idle default. If the owner says **"check the queue now"**, **"pick it up"**, **"process the queue"**, or anything equivalent, the operator polls and processes immediately per the Mode A flow — regardless of where the timer sits — then returns to the ~10-minute idle cadence.

**Output discipline — poll quietly.** The ~10-minute poll runs silently. On an idle poll (empty queue, nothing meaningful changed) the listener emits **no chat output** — it just re-checks and re-arms. It speaks immediately only when something actionable happens: a `queued`/`improve_requested` request appears, real work is done, a hard stop fires, or lane/queue state meaningfully changes. While idle it emits at most an occasional short "listener alive" heartbeat — no more often than about every ~10 minutes. (The `loop: queue empty` token from the parked Mode B output contract is not surfaced per-poll in interactive Mode A.)

**Review-state decision-watch (faster quiet cadence).** Mode A has **no push signal** from the website/API — the admin API updates request metadata on `main`, but Claude Code only notices owner button actions (Publicera / Förbättra / Avvisa) on a wake/check. We do **not** add a daemon, webhook service, cron, child `claude -p`, or background worker to close that gap. Instead: while a request the operator pushed sits at `review` awaiting a decision, the listener MAY poll on a faster **quiet ~60 s** cadence until that request becomes `done`, `improve_requested`, `rejected`, or `failed`. Decision-watch ticks stay **quiet** — no chat output unless the request's state changes or a hard stop / error fires. Once the reviewed request is terminal (or the lane is otherwise clear), the listener returns to the normal quiet **~10 min** idle cadence. This faster cadence applies **only** to a review-state decision-watch; the steady-state idle poll stays ~10 min. Still Mode A, foreground-only, session-only. *Live evidence (2026-05-28): a Publicera click was first detected on a later ~10 min listener wake — correct but slower than ideal, which is exactly why the review-state decision-watch is useful. Owner-facing note lives in `docs/PIPELINE-HANDOFF.md`.*

**Closing the session ends the listener — no persistence.** Next session starts cold; the owner explicitly opts in again with "start the listener" if they want the polling shape rather than on-demand.

### Stop / restart handoff (owner command)

When the owner signals they're wrapping up — e.g. **"stop the listener and save handoff"**, **"stop listening and save project info"**, **"pause operator and write restart handoff"**, **"I need to exit Claude, save restart state"**, or anything equivalent — the operator does a clean shutdown + handoff:

1. **Stop the listener.** Do not run another queue cycle.
2. **Do not schedule/re-arm another `ScheduleWakeup`.** The loop ends here.
3. **Do not claim or process any new request.**
4. **Write `/home/spawn/temp/output_nastaran.md`.** This is direct closeout/handoff work — not a queue cycle — so writing the file is correct (see [`../CLAUDE.md`](../CLAUDE.md) § Rolling output file).

The handoff must be self-contained for a cold reader / next session and include:

- Active repo path: `/home/spawn/Apps/projects/nastaran-web`.
- Current branch.
- Current HEAD (short SHA + subject).
- Working tree clean/dirty state.
- Open PRs.
- Queue state (each request id → status).
- Any active request and its status, if one exists.
- Whether any `req/<id>` branch/PR is mid-flight, and where in the state machine it sits.
- CI/Vercel status on the relevant HEAD, if quickly available.
- Confirmation that the listener is stopped.
- The exact suggested restart prompt (below).

**If a request is mid-processing** (`in_progress` / `review` / `improve_requested` / `publishing`, or a half-finished `req/<id>` branch): say so explicitly, name the safe next step from the § Recovery table, and do **not** imply the queue is idle.

**If everything is idle** (clean tree, no open source PRs, no active request): state that the next session can safely run **"start the operator"**.

**Suggested restart prompt** (adapt the specifics to the handoff):

```
Resume as the nastaran-web Mode A operator. Work in
/home/spawn/Apps/projects/nastaran-web.
Read /home/spawn/temp/output_nastaran.md for the last handoff, then confirm
branch / HEAD / clean tree / open PRs / queue state. If a request is mid-flight,
resume it per spec/pipeline-operator-modes.md § Recovery. Otherwise "start the
listener" (quiet ~10-min cadence; "check the queue now" forces an immediate check).
```

### Authentication

- The local Claude CLI's existing **subscription session** (`claude /login`).
- **No `ANTHROPIC_API_KEY`.** Setting one would override the subscription auth and break the operator.
- Standard Claude Code permission flow. No `--permission-mode bypassPermissions`. No `--dangerously-skip-permissions`. The owner is present to approve any sensitive Bash actions.

### Single-lane invariant

The MS3 spec's single-lane rule applies the same way in Mode A: at most ONE request is in flight at any time across `in_progress`, `review`, `improve_requested`, `publishing`. The operator MUST NOT claim a new `queued` request while any of those four statuses is occupied.

**The only exception:** `improve_requested`. That state IS the operator's own backlog (admin clicked Förbättra on a `review` card). The operator continues the **same branch + same PR**; it's not "claiming a new request", it's resuming the existing one.

### Four-tier classification rule

When the operator picks up a request, it classifies into one of four buckets:

| Bucket | Example | Operator action |
|---|---|---|
| **Clear content-only** | "Change the word X to Y in paragraph Z on /om-mig" | Process normally: claim, edit `src/content/<page>.ts`, gate, push, open PR, flip to `review`. |
| **Minor content ambiguity** | The request references text/page that doesn't exist or conflicts (e.g. text says "första sidan" but `page` says `berattelser`); or "tweak the intro" without saying how | **CAS to `clarification_needed`** with a concise Swedish `clarificationQuestion`. Do NOT claim, branch, guess, invent text, or stop the listener. The requester answers in the board (**Svara** → `POST /api/clarify`), which flips it back to `queued`; the operator re-picks it up and reads the Q+A. See § Clarification flow below. |
| **Structural / out-of-scope** | Asks to add a new page, rename a route, change navigation, alter theme tokens | CAS to `failed + manualFix` with a clear `failureReason` describing what's structural. Surfaces in the `Fel` section of the board. |
| **Unsafe** | Wants to edit `src/app/`, `src/components/`, `src/lib/`, configs, `package.json`, `next.config.mjs`, scripts, workflows — anything outside `src/content/*.ts` (beyond the content-driven renderer glue allowance below) | CAS to `failed + manualFix` with `failureReason` naming the unsafe path. Same `Fel` landing. |

The rule is intentionally conservative on ambiguity: an ambiguous-but-safe-in-intent request becomes `clarification_needed` (the requester answers in the UI) — never an auto-resolution, an auto-failure, or a guess.

#### Clarification flow (ambiguous-but-safe)

When tier 2 fires, the operator parks the request instead of guessing or stopping the listener:

1. **CAS `queued → clarification_needed`** (operator metadata write to `main`) with a concise Swedish `clarificationQuestion` (e.g. *"Vilken sida menar du: startsidan eller Berättelser?"* / *"Vad vill du att titeln ska säga?"*). **No claim, no branch, no PR.** History `clarification_requested`.
2. The request shows in the board's **Väntar på svar** section with the question. The requester clicks **Svara**, types an answer → `POST /api/clarify/[id]` stores `clarificationAnswer` + history `clarification_answered` and flips it back to **`queued`**.
3. On the next cycle the operator re-picks up the **same request** (no duplicate, no pre-built branch/PR), reads `clarificationQuestion` + `clarificationAnswer`, and processes it normally. If still ambiguous, it may park again (re-asking; the Q&A thread accrues in `history`).

`clarification_needed` **blocks the single lane** (`LANE_BLOCKING_STATUSES`) — while one request waits for an answer, CC does **not** pick up another `queued` request. This is intentional and simple: no parallel queue handling yet. It also counts toward the request-intake cap (`REQUEST_INTAKE_COUNT_STATUSES`). See `pipeline-mvp.md` § Single-lane vs intake count. **Avvisa** clears a never-answered one. Still **never guess** page, wording, placement, or image usage — that's exactly what the question is for.

#### Content-driven renderer glue (allowed, no per-request approval)

The main safe edit surface stays `src/content/*.ts`. But some content requests can't be shown by editing a content file alone — the page renderer is hardcoded and has no slot for the new content. In that case the operator MAY also make **minimal same-page renderer wiring** to display the new content, **without** stopping to ask each time. This keeps such a request in the **process-normally** path instead of forcing it to `failed + manualFix`.

**Allowed (small, local, display-only):**

- Add a new content field in `src/content/<page>.ts`.
- Update **only the matching page renderer** (e.g. `src/app/<page>/page.tsx`) to display that field.
- Small local display wiring tied directly to the requested page, reusing existing visual tokens.

**Not auto-allowed (still tier 3/4 → stop and ask or `failed + manualFix`):**

- Route changes; API / auth / config changes; admin-pipeline internals.
- Broad layout redesign; global styling / design-system rewrites.
- Unrelated shared-component refactors; changes spanning multiple unrelated pages.

**Guardrails:** if the renderer change grows beyond small local display wiring (a new component, a layout change, cross-page edits) → **stop and ask**. The work stays inside the `req/<id>-<slug>` branch + PR + preview flow; `lint`/`typecheck`/`build` still run; the preview + owner approval (Publicera) are still required before production. The glue allowance covers exactly the content field + the same-page renderer wiring — it does **not** widen the surface to `src/components/`, `src/lib/`, configs, or other pages.

*Live evidence (2026-05-28):* a `/kontakt` request to add a "Vad händer sen?" section needed `src/content/kontakt.ts` **plus** a minimal section in `src/app/kontakt/page.tsx` (the renderer is hardcoded per-section). Processed under this allowance; PR → preview → Publicera → production all worked. See `docs/CLEAN-ROOM-VALIDATION.md`.

### Hard-stop conditions for the listener

At any of these, **stop the listener** (do not schedule the next wake) and surface to the owner:

- **Ambiguity that the *requester* can't resolve** — a genuine owner-policy/scope decision. (Ordinary ambiguous-but-safe *content* questions do **not** stop the listener — they go to `clarification_needed` and the requester answers in the board. See § Four-tier classification rule § Clarification flow.)
- **Unsafe scope** — request needs an edit outside `src/content/*.ts`.
- **Repo conflict** — working tree dirty at iteration start; merge conflict on `main`; a `req/<id>-…` branch already exists for the same id from an earlier session.
- **Failing quality gate** — `lint`, `typecheck`, or `build` fails on the operator's branch.
- **Network / GitHub / Vercel failure** that doesn't recover with one retry.
- **Anything that needs an owner decision** — not the operator's call to make.

Empty queue is **not** a stop condition — emit `loop: queue empty` and schedule the next wake.

### Reporting after each cycle

After every cycle that did real work, the operator reports:

- **Standard block:** repo / branch (`req/*`) / commit / changed files / PR URL / status on `main` / quality gates (lint, typecheck, build all green).
- **Safety section:** no source change on `main` (only on the `req/*` branch + preview URL).
- **Cadence:** whether `ScheduleWakeup` is armed and for how long, or "paused".
- **Single-lane confirmation:** which request is currently the lane occupant, or "lane clear".
- **Anything unexpected:** ambiguities surfaced, gates that failed and how, retries, deviations from the default flow.

**The operator does NOT write `/home/spawn/temp/output_nastaran.md` during Önskemål request-queue processing.** For queue/operator work the source of truth is the request metadata (`requests/<id>.json`), the `req/<id>-<slug>` branch/PR, and GitHub/Vercel state — the per-cycle report goes to the owner in chat, not to the handoff file. `output_nastaran.md` is reserved for **direct owner ↔ Claude Code collaboration outside the queue** (setup, PR review, debugging, docs, refactors, closeout/handoff summaries, or an explicit owner request for a status summary). See [`../CLAUDE.md`](../CLAUDE.md) § Rolling output file.

### Negations — what the foreground listener is NOT

- ❌ Not cron. Not a system daemon. Not a system service.
- ❌ Not a child `claude -p` process.
- ❌ Not unattended after the Claude Code session closes.
- ❌ Does not set `ANTHROPIC_API_KEY`. Claude CLI subscription auth only.
- ❌ Does not auto-merge source PRs. **Publicera always requires the owner clicking it** from `/admin` or `/onskemal-kogen`.
- ❌ Does not edit outside the documented safe edit surface. The main safe surface is `src/content/*.ts`; the **only** approved exceptions are minimal same-page **content-driven renderer glue** (a new content field + the matching `src/app/<page>/page.tsx` wiring to display it) and **approved attachment source-asset copying** (into `public/assets/generated/` + a reference from `src/content/*.ts`) — exactly as documented above. It still does **not** edit routes, API/auth/config, admin-pipeline internals, shared components, broad layout/design-system code, or unrelated pages automatically — those are stop-and-ask or `failed + manualFix`.
- ❌ Does not write anywhere on `main` other than `requests/<the-id-being-processed>.json` via Octokit.

### Recovery if the session dies mid-cycle

The state machine is designed to tolerate this. The general principle: `requests/<id>.json` on `main` is the source of truth. Wherever it says the request is, that's where it is.

| Last status on `main` | What you (or a new operator session) do |
|---|---|
| `queued` | Nothing was claimed. Re-run "check the queue" — it'll start fresh. |
| `in_progress`, no `req/*` branch on origin | The claim landed but the work didn't push. CAS-write status back to `queued` with history `retry_queued`. Re-run. |
| `in_progress`, branch exists, no PR | Push happened; PR-open failed or session died right before. Check out the branch, verify the content edit, run gates, `gh pr create`, then CAS `in_progress → review` with PR info. |
| `in_progress`, PR open, status never flipped | Just do the metadata write — CAS `in_progress → review` with PR URL + number + preview URL + `latestCommitSha`. Don't re-edit. |
| `improve_requested`, no second commit on branch | Same as `in_progress` mid-cycle — pick up, edit, gates, push, CAS to `review`. |
| `publishing`, no `done` flip | `/api/approve` started but didn't finish. Check GitHub: if merged → CAS `publishing → done` with `productionCommitSha`. If not merged → CAS `publishing → failed` with `failureReason: "approve interrupted mid-flight"`, `manualFix: true`. |
| `done` / `rejected` / `failed` | Terminal state. Nothing to recover. |

If the local working tree is in a confused state:

```bash
git stash --include-untracked
git checkout main && git pull
# Look at requests/<id>.json on main and act per the table above
```

The state machine doesn't depend on anything in the local working tree — only on `main`.

---

## Mode B — Cron-driven wrapper (PARKED)

Not implemented in Nastaran. Reference design lives in the source project's `Spec/06b-MS3-loop-cron-and-ops.md` if/when true unattended operation is ever revived.

Adopting Mode B in Nastaran would require:

- A wrapper-level safety net for when `claude -p` ignores the output contract (e.g. `grep -E '^loop: ' | tail -1`).
- Resolution of the child-process sandbox / permission behavior (likely `--permission-mode bypassPermissions` + tool allowlist).
- A way to validate the subscription-auth handoff in a non-TTY cron context.

Until those land, Mode B is **out of scope**. No `.loop/` directory is created. No cron entry is written. No `.loop/env.example` is committed.

---

## Operator starter prompt

> **Canonical location:** [`../docs/PIPELINE-HANDOFF.md`](../docs/PIPELINE-HANDOFF.md) § 6. The version below mirrors it; if the two ever drift, the handoff doc is authoritative.

The owner can paste this at the start of a Claude Code session in this repo to put it into operator mode:

```
You are the queue operator for nastaran-web in Mode A (interactive
Claude Code session as operator — see spec/pipeline-operator-modes.md).

Standing rules:
- Single-lane: at most ONE active request across in_progress /
  clarification_needed / review / improve_requested / publishing
  (LANE_BLOCKING_STATUSES). clarification_needed BLOCKS the lane — while a
  request waits for the requester's answer, do NOT pick up another queued
  request (intentional; no parallel handling yet).
- Four-tier classification: clear content = process; ambiguous-but-safe
  content = CAS to clarification_needed with a Swedish clarificationQuestion
  (no claim/branch/PR; requester answers via Svara → back to queued; do
  NOT stop the listener, do NOT guess); structural / out-of-scope =
  failed + manualFix; unsafe (anything outside src/content/*.ts) =
  failed + manualFix.
  Exception: minimal content-driven renderer glue (a new content field
  plus the matching src/app/<page>/page.tsx wiring only to display it)
  is allowed in the request branch — see § Four-tier classification rule.
- No source commits to main. Only metadata writes to requests/<id>.json
  on main via Octokit / `gh api`. All source changes on req/<id>-<slug>
  branches with a PR.
- Safe edit surface = src/content/{berattelser,home,kontakt,om-mig,site}.ts,
  plus minimal same-page renderer glue (src/app/<page>/page.tsx) only to
  display a new content field. Anything else = unsafe → failed.
- No `claude -p` child processes. No cron. No --permission-mode bypass.
- No ANTHROPIC_API_KEY. Claude CLI subscription auth only.
- Ask before destructive actions (force-push, hard reset, branch delete
  outside the normal Avvisa/Publicera flow, env-var changes).

When I say "check the queue" (or "check the queue now" / "pick it
up" / "process the queue" / similar), you check immediately:
1. git fetch + git pull origin main.
2. Read requests/*.json (skip README.md).
3. Single-lane check; if anything is in_progress / clarification_needed /
   review / improve_requested / publishing, output `loop: lane busy
   (active <id> at <status>)` and stop. clarification_needed counts as
   busy — don't claim anything else while a request awaits its answer.
4. If lane clear and there's a queued or improve_requested request,
   classify it. If ambiguous-but-safe, CAS it to clarification_needed
   with a concise Swedish question (the requester answers in the board)
   — do NOT stop to ask me and do NOT guess.
5. If clear and safe, process it through to review (claim → branch
   → edit → gates → push → PR → flip to review).
6. If improve_requested, REUSE same branch + same PR for the next
   commit.
7. Report the standard reporting block (repo / branch / commit /
   changed files / PR / status / quality gates) + Safety section to
   me IN CHAT.
8. Do NOT write /home/spawn/temp/output_nastaran.md for queue cycles
   — the request metadata + branch/PR + GitHub/Vercel are the record.
   That file is only for direct owner <-> Claude Code work outside
   the queue (setup, PR review, debugging, docs, closeout, or an
   explicit handoff request).

When I say "start the listener", you do the same loop above on a
self-paced ~10-minute cadence via ScheduleWakeup, while this session
stays open. (Pickup needn't be near-instant; ~10 min keeps idle token
spend low — and I can force an immediate check anytime with "check
the queue now" / "pick it up".) Poll QUIETLY: an empty queue is the
steady state, so on an idle poll emit no chat — just re-check and
re-arm. Speak only when
a queued/improve_requested request appears, real work happens, a hard
stop fires, or lane/queue state meaningfully changes; while idle, a
short "listener alive" heartbeat at most about every ~10 minutes, not
every cycle. While a request you pushed is at review awaiting Publicera
/ Förbättra / Avvisa, you MAY switch to a faster quiet ~60 s
decision-watch until that request becomes done / improve_requested /
rejected / failed, then return to ~10 min idle; decision-watch ticks
stay quiet unless state changes or an error fires. STOP the listener
(do not schedule the next wake) and
surface to me on any hard-stop condition: ambiguity the REQUESTER can't
resolve (a genuine owner-policy/scope call — ordinary ambiguous-but-safe
content goes to clarification_needed, not a stop), unsafe scope (anything
outside src/content/*.ts), dirty repo / merge conflict, network or GitHub
or Vercel failure that doesn't recover with one retry, or anything that
needs an owner decision. Closing the session ends the listener — no
persistence.

When I say "stop the listener and save handoff" (or "stop listening
and save project info" / "pause operator and write restart handoff" /
"I need to exit Claude, save restart state" / similar), you: stop the
listener, do NOT schedule another wakeup, do NOT process any request,
and write /home/spawn/temp/output_nastaran.md as a closeout handoff —
the active repo path,
branch, HEAD, clean/dirty tree, open PRs, queue state, any active
request + status, whether a req/<id> branch/PR is mid-flight, CI/Vercel
if quick, confirmation the listener is stopped, and the exact restart
prompt. If a request is mid-flight, state the safe next step and do
NOT imply the queue is idle; if all idle, say the next session can
safely run "start the operator".

Do not enable cron, child `claude -p`, ANTHROPIC_API_KEY, or
auto-merge of source PRs — those are Mode B (parked) and not the
operating model here.
```

