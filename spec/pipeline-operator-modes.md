# Spec — pipeline operator modes

Companion to [`pipeline-mvp.md`](./pipeline-mvp.md). That spec defines **what** the operator does (state machine, API contracts, hard rules). This spec defines **how** the operator runs.

**Active operating model: Mode A — interactive Claude Code session.** The active Claude Code session itself is the queue operator. Mode A has two usage shapes within the same session model:

- **On-demand (default).** Owner says "check the queue" when work is expected.
- **Foreground listener (opt-in).** Owner says "start the listener"; the same session self-schedules a **~10 min** re-check loop via `ScheduleWakeup` while it stays open. The owner can force an immediate check at any time ("check the queue now", "pick it up", "process the queue").

Both shapes are interactive, supervisor-present, and end the moment the session closes. **No cron, no wrapper, no child `claude -p` process, no `ANTHROPIC_API_KEY`, no auto-merge of source PRs.**

**Mode B — cron-driven `claude -p` wrapper — is PARKED.** Not implemented in this project. Reference design lives in the source project's `Spec/06b-MS3-loop-cron-and-ops.md`. Adopting Mode B would require wrapper-level output-contract enforcement and permission-handoff hardening; it is out of scope until/unless explicitly approved.

---

## Mode A — Interactive Claude Code operator

### Two usage shapes

#### On-demand (default)

The owner opens a Claude Code session in this repo (`/home/spawn/Apps/projects/nastaran-web`) and says **"check the queue"** when work is expected. The session:

1. `git checkout main && git pull origin main` — make sure the local clone is current.
2. Reads `requests/*.json` (skip `README.md`).
3. Single-lane check: if anything is in `in_progress`, `review`, `improve_requested`, or `publishing`, report `loop: lane busy (active <id> at <status>)` and stop.
4. If lane clear, find the oldest `queued` or `improve_requested` request and classify it (four-tier rule below).
5. Clear content-only → claim, branch, edit, gate, push, PR, flip to `review`.
6. Ambiguous → stop and ask. Do NOT mutate the request file.
7. Structural / unsafe → CAS to `failed + manualFix` with a clear `failureReason`, log it, stop.
8. Empty queue → emit `loop: queue empty` and stop.

Nothing runs between owner pings. This is the validated default.

#### Foreground listener (opt-in, this-session-only)

Owner says **"start the listener"** (or equivalent). Claude Code then self-schedules a periodic re-check loop via `ScheduleWakeup` from within the running session. **Default cadence: about every ~10 minutes** while the session is active. Queue pickup does not need to be near-instant — dev work takes time anyway — so a ~10-minute idle poll keeps token spend low. (A faster ~60 s default was tried and judged wasteful; faster pickup is now on-demand only, see *Manual immediate check* below.)

Each wake runs the loop body above; the listener stops the moment any hard-stop condition fires, or when the session itself closes.

**Manual immediate check (override).** The ~10-minute cadence is only the idle default. If the owner says **"check the queue now"**, **"pick it up"**, **"process the queue"**, or anything equivalent, the operator polls and processes immediately per the Mode A flow — regardless of where the timer sits — then returns to the ~10-minute idle cadence.

**Output discipline — poll quietly.** The ~10-minute poll runs silently. On an idle poll (empty queue, nothing meaningful changed) the listener emits **no chat output** — it just re-checks and re-arms. It speaks immediately only when something actionable happens: a `queued`/`improve_requested` request appears, real work is done, a hard stop fires, or lane/queue state meaningfully changes. While idle it emits at most an occasional short "listener alive" heartbeat — no more often than about every ~10 minutes. (The `loop: queue empty` token from the parked Mode B output contract is not surfaced per-poll in interactive Mode A.)

**Closing the session ends the listener — no persistence.** Next session starts cold; the owner explicitly opts in again with "start the listener" if they want the polling shape rather than on-demand.

### Stop / restart handoff (owner command)

When the owner signals they're wrapping up — e.g. **"stop the listener and save handoff"**, **"stop listening and save project info"**, **"pause operator and write restart handoff"**, **"I need to exit Claude, save restart state"**, or anything equivalent — the operator does a clean shutdown + handoff:

1. **Stop the listener.** Do not run another queue cycle.
2. **Do not schedule/re-arm another `ScheduleWakeup`.** The loop ends here.
3. **Do not claim or process any new request.**
4. **Write `/home/spawn/temp/output_nastaran.md`.** This is direct closeout/handoff work — not a queue cycle — so writing the file is correct (see [`../CLAUDE.md`](../CLAUDE.md) § Rolling output file).

The handoff must be self-contained for a cold reader / next session and include:

- Active repo path: `/home/spawn/Apps/projects/nastaran-web`.
- A warning to **not** use the archived `/home/spawn/Apps/nastaran-web`.
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
Resume as the nastaran-web Mode A operator. Work ONLY in
/home/spawn/Apps/projects/nastaran-web (NOT /home/spawn/Apps/nastaran-web).
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
| **Minor content ambiguity** | The request references text that doesn't exist on the target page; or "tweak the intro" without saying how | **STOP and ask the owner.** Do NOT mark `failed`. Do NOT invent text. Do NOT mutate the request file. Leave at `queued`. |
| **Structural / out-of-scope** | Asks to add a new page, rename a route, change navigation, alter theme tokens | CAS to `failed + manualFix` with a clear `failureReason` describing what's structural. Surfaces in the `Fel` section of the board. |
| **Unsafe** | Wants to edit `src/app/`, `src/components/`, `src/lib/`, configs, `package.json`, `next.config.mjs`, scripts, workflows — anything outside `src/content/*.ts` | CAS to `failed + manualFix` with `failureReason` naming the unsafe path. Same `Fel` landing. |

The rule is intentionally conservative on ambiguity: an ambiguous-but-safe-in-intent request gets a clarifying question, not an auto-resolution or auto-failure.

### Hard-stop conditions for the listener

At any of these, **stop the listener** (do not schedule the next wake) and surface to the owner:

- **Ambiguity** — intent unclear; multiple plausible outcomes with different blast radius.
- **Unsafe scope** — request needs an edit outside `src/content/*.ts`.
- **Repo conflict** — working tree dirty at iteration start; merge conflict on `main`; a `req/<id>-…` branch already exists for the same id from an earlier session.
- **Failing quality gate** — `lint`, `typecheck`, or `build` fails on the operator's branch.
- **Network / GitHub / Vercel failure** that doesn't recover with one retry.
- **Anything that needs an owner decision** — not the operator's call to make.

Empty queue is **not** a stop condition — emit `loop: queue empty` and schedule the next wake.

### Reporting after each cycle

After every cycle that did real work, the operator reports:

- **Standard block:** repo / branch (`req/*`) / commit / changed files / PR URL / status on `main` / quality gates (lint, typecheck, build all green).
- **Safety section:** old project path not touched (✓/✗), no source change on `main` (only on the `req/*` branch + preview URL).
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
- ❌ Does not edit anything outside `src/content/*.ts` on request branches, ever.
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
- Single-lane: at most ONE active request across in_progress / review /
  improve_requested / publishing.
- Four-tier classification: clear content = process; ambiguous content =
  STOP and ask me; structural / out-of-scope = failed + manualFix;
  unsafe (anything outside src/content/*.ts) = failed + manualFix.
- No source commits to main. Only metadata writes to requests/<id>.json
  on main via Octokit / `gh api`. All source changes on req/<id>-<slug>
  branches with a PR.
- Safe edit surface = src/content/{berattelser,home,kontakt,om-mig,site}.ts
  ONLY. Anything else = unsafe → failed.
- No `claude -p` child processes. No cron. No --permission-mode bypass.
- No ANTHROPIC_API_KEY. Claude CLI subscription auth only.
- Ask before destructive actions (force-push, hard reset, branch delete
  outside the normal Avvisa/Publicera flow, env-var changes, anything
  touching the archived old project at /home/spawn/Apps/nastaran-web).

When I say "check the queue" (or "check the queue now" / "pick it
up" / "process the queue" / similar), you check immediately:
1. git fetch + git pull origin main.
2. Read requests/*.json (skip README.md).
3. Single-lane check; if lane busy, output `loop: lane busy (active
   <id> at <status>)` and stop.
4. If lane clear and there's a queued or improve_requested request,
   classify it. If ambiguous, ASK me with the specific question.
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
every cycle. STOP the listener (do not schedule the next wake) and
surface to me on any hard-stop condition: ambiguity, unsafe scope
(anything outside src/content/*.ts), dirty repo / merge conflict,
network or GitHub or Vercel failure that doesn't recover with one
retry, or anything that needs an owner decision. Closing the session
ends the listener — no persistence.

When I say "stop the listener and save handoff" (or "stop listening
and save project info" / "pause operator and write restart handoff" /
"I need to exit Claude, save restart state" / similar), you: stop the
listener, do NOT schedule another wakeup, do NOT process any request,
and write /home/spawn/temp/output_nastaran.md as a closeout handoff —
active repo path + a warning not to use /home/spawn/Apps/nastaran-web,
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

