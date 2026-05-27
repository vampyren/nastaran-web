# Pipeline handoff — set up the request/publish workflow from zero

This is the **canonical start-here guide** for setting up the request/publish pipeline on `nastaran-web`. Adapted from the validated `shadi-web` pipeline (where this pattern was first proven). Cross-references:

- [`../spec/pipeline-mvp.md`](../spec/pipeline-mvp.md) — data model, state machine, API contracts.
- [`../spec/pipeline-operator-modes.md`](../spec/pipeline-operator-modes.md) — Mode A operator (Mode B parked).
- [`REUSABLE-REQUEST-QUEUE-PATTERN.md`](./REUSABLE-REQUEST-QUEUE-PATTERN.md) — the cross-project abstract pattern.
- [`../requests/README.md`](../requests/README.md) — metadata directory + `main`-write exception.

---

## Standing rules (read before any setup step)

These apply throughout. They're the rules that, if broken, cause the most pain.

- **Never paste real secret values into chat.** Tokens, passwords, session secrets, API keys belong in the Vercel dashboard or in a local `.env.local` — never in a conversation transcript, commit, doc, log, or PR body. If you must compute a secret (e.g. `openssl rand -hex 32`), run the command in your local terminal, not via Claude Code's Bash tool. If a Claude Code session needs to know "is the secret set?", the answer is yes/no — never the value.
- **Ask before destructive actions.** Claude Code (the operator) must ask before: `git push --force` of any kind, `rm -rf`, deleting branches that aren't `req/*`, deleting tags, dropping/altering env vars, anything that touches the archived old project at `/home/spawn/Apps/nastaran-web`. Routine `req/*` branch deletion after Avvisa/Publicera is done cleanly by the admin API — that's not destructive.
- **Source changes never go directly to `main`.** Always via `req/*` or `feat/*`/`fix/*`/`chore/*` branch + PR + squash-merge. The ONE documented exception: metadata-only commits to `requests/<id>.json` via Octokit (that's how the state machine records transitions).
- **Single-lane.** At most ONE active request across `in_progress` / `review` / `improve_requested` / `publishing`. The operator does NOT claim a new `queued` request while one is in flight.
- **Old project untouched.** `/home/spawn/Apps/nastaran-web` is archived reference only. Treat as read-only.
- **Pre-launch: form is admin-only.** Both `/onskemal` (page) and `/api/feedback` (endpoint) are admin-gated. Do not lift either gate without the documented removal trigger (see [`../spec/pipeline-mvp.md`](../spec/pipeline-mvp.md) § Pre-launch admin-gating).

---

## Who does what — human vs Claude Code

This pipeline is a collaboration. Some steps **only the human (owner) can do**; others Claude Code can do for them.

| Step | Who | Why Claude Code can / can't do it |
|---|---|---|
| Generate fine-grained GitHub PAT | **Human** | Token must be issued from the human's GitHub account UI. Never share the value in chat. |
| Generate `ADMIN_SESSION_SECRET` | **Either** | Either runs `openssl rand -hex 32` in their local terminal; the human pastes the output into Vercel. Do not paste it back into Claude Code chat. |
| Choose `ADMIN_PASSWORD` | **Human** | A password the human will remember and type. |
| Set Vercel env vars in dashboard | **Human** | The form requires the human's Vercel session. The values are secrets that shouldn't enter chat. |
| Trigger Vercel redeploy after env changes | **Either** | Click "Redeploy" in the Vercel UI, OR push any commit. |
| Verify production deploy is Ready | **Either** | Claude Code can run `gh api repos/vampyren/nastaran-web/commits/<sha>/status`. |
| Submit a request via `/onskemal` | **The owner, logged in** | Pre-launch the form is admin-gated. |
| Log in to `/admin/login` → land on `/admin` | **Human (admin)** | Requires typing the admin password into the login form in a browser. |
| Click Publicera / Förbättra / Avvisa | **Human (admin)** | Browser action. Claude Code can call `/api/approve/[id]` etc. directly with the admin's session cookie if explicitly asked — but the usual path is the human clicks. |
| Process the queue (claim, edit content, push branch, open PR, write status) | **Claude Code (Mode A operator)** | This is the operator role. The owner supervises and answers ambiguity questions. |
| Edit `src/content/*.ts` for a request | **Claude Code (operator)** | Within the safe-path classification. |
| Edit `src/app/`, configs, `package.json`, layout | **Human (or a separate `feat/*`/`fix/*` PR under explicit instruction)** | Out of scope for request work. Unsafe classification = `failed + manualFix`. |
| Read git history / file contents | **Either** | |
| Force-push, hard-reset, delete tags, drop env vars | **Human only, on explicit request** | Destructive. Claude Code must ASK first. |

---

## 1. What this pipeline does

The site owner submits change requests through the in-product form. The requests land as JSON files on `main`. A supervised Claude Code session (the **operator**) reads the queue, classifies each request, edits content on a per-request branch, opens a PR, and Vercel produces a preview URL. The owner reviews the preview on an admin board and clicks **Publicera** (publish), **Förbättra** (improve), or **Avvisa** (reject). Publicera squash-merges to `main` and Vercel deploys production.

**Production is never edited directly.** All source changes flow through `req/<id>-<slug>` branches with a PR + preview + approval.

**One active request at a time** (single-lane). Parallel work is intentionally out of scope.

---

## 2. Prerequisites (outside the repo — done manually)

These steps assume nothing about your environment. Complete them once.

### 2.1 Accounts and tools

- **GitHub account** with the ability to create a fine-grained Personal Access Token (PAT) scoped to `vampyren/nastaran-web`.
- **Vercel account** with the GitHub App already wired (it is — auto-deploys from `main` are working).
- **Local machine** with:
  - Node 22+ (`node --version`)
  - `git` (any modern version)
  - `gh` (GitHub CLI) authenticated (`gh auth status`)
  - The local Claude CLI installed and logged in via subscription (`claude /login`). **Do not set `ANTHROPIC_API_KEY`** — Mode A uses the subscription session.

### 2.2 GitHub fine-grained PAT

Go to `https://github.com/settings/personal-access-tokens/new`.

Configure exactly:

- **Token name:** anything memorable, e.g. `nastaran-web-pipeline-token`.
- **Expiration:** 90 days is a good default. Set a calendar reminder to rotate before expiry.
- **Resource owner:** your account.
- **Repository access:** **"Only select repositories"** → choose `vampyren/nastaran-web`.
- **Repository permissions:**
  - Contents → **Read and write**
  - Pull requests → **Read and write**
  - Metadata → Read-only (auto-granted; appears greyed-out)
- **Do NOT grant** any of: Actions, Workflows, Secrets, Webhooks, Administration, Codespaces, Pages, or any org-level / account-level scopes.

Click **Generate token**. The value starts with `github_pat_...`. **Copy it once now** — GitHub doesn't show it again. Paste it directly into the Vercel env-var UI in the next step; do not paste it into chat, a commit, or any persistent file outside your password manager.

### 2.3 Vercel runtime environment variables

In the Vercel dashboard: `https://vercel.com/aryan-tech/nastaran-web/settings/environment-variables` → click **Add Environment Variable** four times, with these **exact case-sensitive names**:

| Name | Value | Scope (check all three) |
|---|---|---|
| `GITHUB_TOKEN` | the `github_pat_...` from 2.2 | Production, Preview, Development |
| `GITHUB_REPO` | `vampyren/nastaran-web` | Production, Preview, Development |
| `ADMIN_PASSWORD` | a password you'll type at `/admin/login`. Generate with `openssl rand -base64 24` if you don't have a preference. Min 8 chars. | Production, Preview, Development |
| `ADMIN_SESSION_SECRET` | a random hex string ≥16 chars. Run locally: `openssl rand -hex 32`. | Production, Preview, Development |

Optional: `NEXT_PUBLIC_PREVIEW_MODE=1` for future preview-mode UI niceties. Never used for authorization.

**Run `openssl` commands locally**, not via Claude Code's Bash tool — that puts the value in chat history. Save to your password manager AND paste into Vercel. Then forget locally; the Vercel dashboard is the source of truth.

**After saving:** Vercel snapshots env vars at build time. To apply to the current production deployment, **redeploy** it: Deployments → `...` menu on the latest → Redeploy → wait ~30 s for Ready.

**Verify:** open `https://nastaran-web.vercel.app/admin/login` in a browser, type `ADMIN_PASSWORD`. You should land on `/admin` and see the hub. If login returns "Felaktigt lösenord" with the correct password, the deploy didn't pick up the env var — redeploy again. If it returns a 500, check `ADMIN_SESSION_SECRET` length (must be ≥16 chars).

**Common mistake:** naming a variable `nastaran_web_token` instead of `GITHUB_TOKEN`. The variable name must match `process.env.GITHUB_TOKEN` exactly. If `/onskemal` shows "Servern är inte färdig konfigurerad ännu" after a logged-in submission attempt, `githubClient()` couldn't read one of the GitHub env vars.

---

## 3. Repo-side configuration

The following are part of the codebase (most created by later PRs in this pipeline chain):

- `src/lib/auth.ts` — HMAC-signed session cookie auth (cookie name `nastaran-admin`). [PR B]
- `src/lib/github.ts` — Octokit wrapper with SHA-conditional writes. [PR B]
- `src/lib/request-store.ts` — CAS write + state-machine recheck on 409. [PR B]
- `src/lib/request-types.ts` — request data model. [PR B]
- `src/lib/pages.ts` — page-id allowlist and route mapping. [PR B]
- `src/app/admin/*` — owner hub + login. [PR C]
- `src/app/onskemal/*` — owner request form (admin-gated). [PR C]
- `src/app/onskemal-kogen/*` — admin queue board. [PR C]
- `src/components/AdminFAB.tsx` — floating admin menu (logged-in-only). [PR C]
- `src/app/api/*` — feedback / list / approve / reject / iterate / admin/{login,logout,me,retry}. [PR D]
- `requests/` — per-request JSON metadata on `main`. [PR A — this PR]

**Project-specific bits that don't carry over from `shadi-web`:**

- Routes, navigation, content paths, owner name, branding. Already encoded in `src/content/site.ts` and `src/content/*.ts`.
- Cookie name: `nastaran-admin` (not `shadi-admin`).
- Page-ID allowlist in `src/lib/pages.ts`: `index`, `om-mig`, `berattelser`, `kontakt`, `hela-sajten`.
- Safe edit surface: `src/content/{berattelser,home,kontakt,om-mig,site}.ts`.

---

## 4. Validation smoke test (run after every fresh setup)

Once env vars are set and a production deployment is Ready, walk through this checklist. This is the same shape that was validated on `shadi-web`. **This applies to the post-PR-D state** — PR A ships docs only and there is nothing to smoke-test yet.

### 4.1 Admin login works

1. Open `https://nastaran-web.vercel.app/admin/login` in a browser.
2. Type the `ADMIN_PASSWORD`. You should land on `/admin` and see the four-card hub.
3. The floating Admin menu appears bottom-right on every page.

### 4.2 Admin submission works (pre-launch admin-gated)

1. From the hub, click **Skicka önskemål** → lands on `/onskemal`.
2. Pick a page from the chip list, type a tiny content change (e.g. "Change the word X to Y in paragraph Z on /om-mig"), submit.
3. Confirm the success view shows the reference id (`Tack! ... Referens: 20260601-...-xxxxxx`).
4. **Failure mode:** if you see "Servern är inte färdig konfigurerad ännu" — your Vercel env vars are missing or wrong. Go back to § 2.3.

### 4.3 Anonymous cannot submit

1. Open an incognito window. Visit `https://nastaran-web.vercel.app/onskemal` → expect 307 redirect to `/admin/login?next=/onskemal`.
2. Curl directly: `curl -X POST -H "Content-Type: application/json" -d '{"message":"test","page":"index"}' https://nastaran-web.vercel.app/api/feedback` → expect `401 { "error": "unauthorized" }`. No file written to `requests/` on `main`.

### 4.4 The request file appears on `main`

1. `git fetch origin && git pull origin main`.
2. `ls requests/` shows a new `<id>.json` (besides `README.md`).
3. `jq '.status' requests/<id>.json` returns `"queued"`.

### 4.5 Operator claims the request

In a Claude Code session in this repo, say **"check the queue"**. The expected sequence:

1. Operator reads the queue, finds the new `queued` request.
2. If the wording is clear → operator proceeds. If ambiguous → operator asks for clarification (per the four-tier rule).
3. CAS write `queued → in_progress` lands as a metadata commit on `main` (`request: <id> — in_progress`).
4. Local `req/<id>-<slug>` branch is created off `main`.
5. Edit to `src/content/<page>.ts` only.
6. `npm run lint && npx tsc --noEmit && npm run build` all pass.
7. Branch pushed to origin, PR opened via `gh pr create`.
8. Vercel posts a preview URL into the PR comment.
9. CAS write `in_progress → review` with PR + preview metadata.
10. Card moves to `Aktivt i review` on the board with three buttons.

### 4.6 Each terminal action

Once the card is in `review`, test each path at least once:

| Click | Expected effect | Verify |
|---|---|---|
| **Publicera** | PR squash-merges to `main`, branch deletes, request → `done`, prod auto-deploys | `gh pr view <n>` shows MERGED; `git branch -r` no longer shows `req/...`; production reflects the change |
| **Avvisa** (after another test request reaches `review`) | PR closes unmerged, branch deletes, request → `rejected`, prod untouched | `gh pr view <n>` shows CLOSED; `mergedAt` is null; branch gone from origin |
| **Förbättra** (after another test request reaches `review`) | Modal opens, submit a refinement, status → `improve_requested`, operator picks up and reuses **same branch + same PR**, pushes a second commit, returns to `review`. Never opens a new PR. | `gh pr view <n>` still the same PR; `commits` count = 2 |

### 4.7 Single-lane invariant

Submit a second request while the first is in `review`. Tell the operator "check the queue". Expected: operator does NOT claim the second. Output is `loop: lane busy (active <id> at review)`. The new request stays at `queued` until the first reaches a terminal state.

---

## 5. How the owner uses the pipeline (day-to-day, post-PR-D)

1. **Open `/admin`** from the bookmark, the temporary footer "Admin" link, or the floating Admin menu (bottom-right after login).
2. **Click "Skicka önskemål"** from the hub. This opens `/onskemal`. Pick the page, describe the change in plain language. Submit.
3. The owner does **nothing else** until the operator pings them with a preview.
4. The operator processes the request and pings the owner.
5. Owner opens the preview URL or the queue board (`/onskemal-kogen`), looks at the change, decides Publicera / Förbättra / Avvisa.

The owner never touches GitHub, Vercel, or the codebase directly.

---

## 6. Recovery if the operator session dies mid-request

See [`../spec/pipeline-operator-modes.md`](../spec/pipeline-operator-modes.md) § Recovery if the session dies mid-cycle. The state machine is designed for this — wherever `requests/<id>.json` says the request is, that's where it is.

---

## 7. When something fails

### The form returns "Servern är inte färdig konfigurerad ännu"

`/api/feedback` couldn't initialize the GitHub client. Cause: `GITHUB_TOKEN` or `GITHUB_REPO` missing/mistyped, or the deployment wasn't redeployed after the env var was added. See § 2.3.

### The admin board returns 401 for `/api/list`

`ADMIN_SESSION_SECRET` is missing, or the cookie expired (7-day TTL). Log in again at `/admin/login` and check the env var.

### Publicera returns 409 `not_mergeable_*`

The pre-merge gate caught a problem: PR is closed, in draft, has merge conflicts, or required CI checks are failing. Resolve the underlying issue (reopen the PR, push a fix, wait for CI green), then click Publicera again. The request stays at `review` — it doesn't get stuck.

### Publicera returns 500 `post_merge_metadata_write_failed`

Squash-merge succeeded on GitHub, but the operator couldn't write the post-merge status. The request automatically moves to **Fel** with `manualFix: true` and the production commit SHA preserved. The merge is real — production was updated. The only "fix" is to manually edit `requests/<id>.json` to `status: done` if you want it out of Fel (the production change is already live).

### The operator marks something `failed`

Read the card's `failureReason`. Per the four-tier rule:

- "no <text> found in <file>" → ambiguous content. Submit a clearer request.
- "unsafe_request: <path>" → the request asked to edit outside `src/content/*.ts`. Reject and resubmit as content-only.
- "<lint|typecheck|build> failed: <detail>" → the operator's edit broke a gate. Could be a classifier miss; investigate the branch.

Click **Försök igen** to move back to `queued` after fixing whatever caused the failure.

### The operator's Claude Code session is closed

The pipeline pauses gracefully. No requests are lost — they sit at `queued` on `main` until the next session resumes. Reopen Claude Code in the repo and say "check the queue" (or "start the listener").

### You need to roll back a bad Publicera

The merge to `main` is a normal git commit. See [`../spec/pipeline-mvp.md`](../spec/pipeline-mvp.md) § Rollback after bad approval.

### Sensitive content slipped into a request

1. Admin **rejects** with `rejectionReason: "contains sensitive data"`.
2. Admin **deletes** the current `requests/<id>.json` in a follow-up commit on `main` (removes from the tree, not from history).
3. If GDPR removal is legally required: manual `git filter-repo` rewrite + force-push. Emergency procedure; document the action in the project's incident log.

---

## 8. What's NOT in this pipeline (deferred)

Do not enable any of these without explicit approval:

- **Mode B — cron-driven `claude -p` wrapper.** Parked. Needs more hardening before unattended use.
- **Public request intake.** Pre-launch admin-gated only. Removal trigger documented in `spec/pipeline-mvp.md` § Pre-launch admin-gating.
- **`productionDeploymentUrl` polling.** Vercel deployment URL is not currently polled and recorded on Publicera. The `productionCommitSha` is the audit anchor.
- **EditableText granular editing + `edit-registry`.** Page-level requests only in v1.
- **`/api/git/log` + "Senaste ändringar" widget.** Out of v1.
- **Branch protection on `main`.** Deferred decision. The branch-first rule is enforced behaviorally in `CLAUDE.md`. If branch protection is added later, it must allow the request-writing bot to bypass for the `requests/**` path.

---

## 9. Where to read next

- For the data model + state machine + API contracts: [`../spec/pipeline-mvp.md`](../spec/pipeline-mvp.md).
- For operator modes: [`../spec/pipeline-operator-modes.md`](../spec/pipeline-operator-modes.md).
- For the cross-project abstract pattern: [`REUSABLE-REQUEST-QUEUE-PATTERN.md`](./REUSABLE-REQUEST-QUEUE-PATTERN.md).
- For the metadata directory + `main`-write exception: [`../requests/README.md`](../requests/README.md).
- For repo + deployment conventions: [`../CLAUDE.md`](../CLAUDE.md).
