/**
 * POST /api/approve/[id] — squash-merge a request's PR to main.
 *
 * Happy path:
 *   1. Pre-merge checks: PR open, not draft, head SHA present, mergeable,
 *      required checks not failing. If any check fails BEFORE we move to
 *      `publishing`, return 409 and leave status at `review`.
 *   2. CAS: review → publishing (records `approvedAt`).
 *   3. Squash-merge via Octokit.
 *   4. CAS: publishing → done with `productionCommitSha`.
 *   5. Best-effort delete the `req/...` branch.
 *
 * Failure paths:
 *   - Pre-merge gate fails (PR closed/draft/conflicted/checks red):
 *     return 409 with the reason; status stays `review`.
 *   - Merge call fails: CAS publishing → failed (failureReason,
 *     manualFix), return 502 merge_failed.
 *   - Merge succeeds but `publishing → done` write fails: best-effort CAS
 *     publishing → failed with
 *     `failureReason = "post_merge_metadata_write_failed — production
 *     commit <sha>"`, `manualFix: true`, and return 500
 *     `post_merge_metadata_write_failed` with `productionCommitSha` so
 *     the admin sees the request in `Fel` rather than stuck in
 *     `publishing`.
 *
 * Vercel deployment polling is OUT of scope (function timeouts). The
 * merge is the canonical production commit; `productionDeploymentUrl`
 * stays null in v1 per spec/pipeline-mvp.md § Approve route caveat.
 *
 * See spec/pipeline-mvp.md § Admin actions — API contracts §
 * POST /api/approve/[id].
 */

import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin, requireAdmin } from "@/lib/auth";
import {
  getMainFile,
  isValidRequestId,
  requestPath,
  type GithubConfig,
} from "@/lib/github";
import type { Request } from "@/lib/request-types";
import {
  newGithub,
  transition,
  updateRequest,
  type UpdateOutcome,
} from "@/lib/request-store";

// How long to wait for GitHub to compute mergeability before giving up.
const MERGEABILITY_POLL_ATTEMPTS = 4;
const MERGEABILITY_POLL_DELAY_MS = 500;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (guard) return guard;
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!isValidRequestId(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  let gh: GithubConfig;
  try {
    gh = newGithub();
  } catch (err) {
    console.error("[approve] GitHub config missing:", err);
    return NextResponse.json(
      { error: "server_misconfigured" },
      { status: 500 }
    );
  }

  // -------- 1. Pre-merge checks (status is still `review`) --------
  //
  // Cheap, idempotent probes BEFORE flipping status so failures don't
  // require a rollback. If anything is wrong with the PR, we return 409
  // and leave the request at `review` — admin can wait for CI / retry.

  let current: Request | null;
  try {
    const file = await getMainFile<Request>(gh, requestPath(id));
    current = file?.data ?? null;
  } catch (err) {
    console.error("[approve] read failed:", err);
    return NextResponse.json({ error: "read_failed" }, { status: 500 });
  }
  if (!current) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (current.status !== "review") {
    return NextResponse.json(
      { error: "invalid_state", status: current.status },
      { status: 409 }
    );
  }
  if (!current.pullRequestNumber) {
    return NextResponse.json(
      { error: "missing_pr", message: "request has no pullRequestNumber" },
      { status: 409 }
    );
  }
  const pullNumber = current.pullRequestNumber;

  const preflight = await preflightChecks(gh, pullNumber);
  if (!preflight.ok) {
    return NextResponse.json(
      { error: "not_mergeable", reason: preflight.reason },
      { status: 409 }
    );
  }

  // -------- 2. CAS: review → publishing --------
  const start = await updateRequest(
    gh,
    id,
    (latest) => {
      if (latest.status !== "review") return null;
      if (!latest.pullRequestNumber) return null;
      return transition(latest, "publishing", "approval_started", "admin");
    },
    `request: ${id} — approve (publishing)`
  );
  if (!start.ok) {
    return errorResponse(start, "approve:start");
  }
  const startedRecord = start.record;

  // -------- 3. Squash-merge --------
  let mergeCommitSha: string;
  try {
    const merge = await gh.octokit.rest.pulls.merge({
      owner: gh.owner,
      repo: gh.repo,
      pull_number: pullNumber,
      merge_method: "squash",
      commit_title: `request: ${id} — ${startedRecord.title.slice(0, 60)}`,
    });
    mergeCommitSha = merge.data.sha ?? "";
    if (!merge.data.merged || !mergeCommitSha) {
      throw new Error(
        `merge reported not-merged: ${JSON.stringify(merge.data)}`
      );
    }
  } catch (err) {
    console.error("[approve] merge failed:", err);
    const reason =
      err instanceof Error ? err.message : String(err ?? "merge_failed");
    await markFailed(
      gh,
      id,
      `merge_failed — ${reason}`,
      true,
      `request: ${id} — merge failed`
    );
    return NextResponse.json(
      { error: "merge_failed", reason: reason.slice(0, 500) },
      { status: 502 }
    );
  }

  // -------- 4. CAS: publishing → done --------
  const finish = await updateRequest(
    gh,
    id,
    (latest) => {
      if (latest.status !== "publishing") return null;
      return transition(
        latest,
        "done",
        "merged",
        "admin",
        undefined,
        (draft) => {
          draft.productionCommitSha = mergeCommitSha;
        }
      );
    },
    `request: ${id} — done`
  );

  if (!finish.ok) {
    // CRITICAL: merge happened on `main`, but the metadata write didn't.
    // Without this branch, the request would be stuck in `publishing`
    // forever. Best-effort move it to `failed` so it shows up in the
    // board's Fel section with full context, and surface the failure to
    // the caller.
    console.error("[approve] post-merge metadata write failed:", finish);
    const failureReason = `post_merge_metadata_write_failed — production commit ${mergeCommitSha}`;
    await markFailed(
      gh,
      id,
      failureReason,
      true,
      `request: ${id} — post-merge metadata write failed`,
      (draft) => {
        // Preserve the production commit sha even though we're moving to
        // failed — it's real, the merge happened.
        draft.productionCommitSha = mergeCommitSha;
      }
    );
    return NextResponse.json(
      {
        error: "post_merge_metadata_write_failed",
        productionCommitSha: mergeCommitSha,
        manualFix: true,
      },
      { status: 500 }
    );
  }

  // -------- 5. Delete the source branch (best-effort) --------
  await deleteBranchIfAny(gh, startedRecord.branch);

  return NextResponse.json({
    ok: true,
    status: finish.record.status,
    productionCommitSha: mergeCommitSha,
  });
}

// ---------------------- helpers ----------------------

type PreflightResult = { ok: true } | { ok: false; reason: string };

/**
 * Verify the PR is in a mergeable state before we move the request to
 * `publishing`. GitHub sometimes returns `mergeable: null` while it
 * recomputes — poll a small number of times with a short delay.
 *
 * If checks (combined status / check runs) are missing or failing, we
 * return `not_mergeable` and keep the request at `review` per the spec:
 * "do not leave it in `publishing`".
 */
async function preflightChecks(
  gh: GithubConfig,
  pullNumber: number
): Promise<PreflightResult> {
  let pr;
  try {
    pr = await gh.octokit.rest.pulls.get({
      owner: gh.owner,
      repo: gh.repo,
      pull_number: pullNumber,
    });
  } catch (err) {
    console.error("[approve] preflight: pulls.get failed:", err);
    return { ok: false, reason: "pr_fetch_failed" };
  }

  if (pr.data.state !== "open") {
    return { ok: false, reason: `pr_${pr.data.state}` };
  }
  if (pr.data.draft) {
    return { ok: false, reason: "pr_is_draft" };
  }
  const headSha = pr.data.head?.sha;
  if (!headSha) {
    return { ok: false, reason: "pr_head_sha_missing" };
  }

  let mergeable = pr.data.mergeable;
  let mergeableState = pr.data.mergeable_state;
  for (
    let attempt = 0;
    mergeable === null && attempt < MERGEABILITY_POLL_ATTEMPTS;
    attempt++
  ) {
    await sleep(MERGEABILITY_POLL_DELAY_MS);
    try {
      const recheck = await gh.octokit.rest.pulls.get({
        owner: gh.owner,
        repo: gh.repo,
        pull_number: pullNumber,
      });
      mergeable = recheck.data.mergeable;
      mergeableState = recheck.data.mergeable_state;
    } catch (err) {
      console.error("[approve] preflight: pulls.get re-poll failed:", err);
      return { ok: false, reason: "pr_fetch_failed" };
    }
  }
  if (mergeable === false) {
    return {
      ok: false,
      reason: `not_mergeable_${mergeableState ?? "unknown"}`,
    };
  }
  if (mergeable === null) {
    return { ok: false, reason: "mergeability_unknown_after_retry" };
  }

  // Check combined commit status + check runs on the head sha. Pending
  // or failing → 409. Empty (no checks configured) → allow.
  try {
    const [status, runs] = await Promise.all([
      gh.octokit.rest.repos.getCombinedStatusForRef({
        owner: gh.owner,
        repo: gh.repo,
        ref: headSha,
      }),
      gh.octokit.rest.checks.listForRef({
        owner: gh.owner,
        repo: gh.repo,
        ref: headSha,
      }),
    ]);

    if (status.data.statuses.length > 0) {
      if (status.data.state === "failure" || status.data.state === "error") {
        return { ok: false, reason: `commit_status_${status.data.state}` };
      }
      if (status.data.state === "pending") {
        return { ok: false, reason: "commit_status_pending" };
      }
    }

    for (const run of runs.data.check_runs) {
      if (run.status !== "completed") {
        return { ok: false, reason: `check_${run.name}_pending` };
      }
      const c = run.conclusion;
      if (c === null) {
        return { ok: false, reason: `check_${run.name}_no_conclusion` };
      }
      if (c === "success" || c === "neutral" || c === "skipped") continue;
      return { ok: false, reason: `check_${run.name}_${c}` };
    }
  } catch (err) {
    // Don't block on a flaky checks API — log and proceed. Branch
    // protection on the GitHub side will refuse the merge if it's
    // truly not ready, and we'll catch that as `merge_failed`.
    console.error(
      "[approve] preflight: checks probe failed (proceeding):",
      err
    );
  }

  return { ok: true };
}

/**
 * Best-effort CAS from `publishing` → `failed`. Used in the two
 * post-`publishing` failure paths. Never throws; logs if the write
 * itself fails so we don't mask the original error.
 */
async function markFailed(
  gh: GithubConfig,
  id: string,
  reason: string,
  manualFix: boolean,
  commitMessage: string,
  mutate?: (draft: Request) => void
): Promise<void> {
  try {
    const result = await updateRequest(
      gh,
      id,
      (latest) => {
        if (latest.status !== "publishing") return null;
        return transition(
          latest,
          "failed",
          "failed",
          "admin",
          reason,
          (draft) => {
            draft.failureReason = reason.slice(0, 500);
            draft.manualFix = manualFix;
            if (mutate) mutate(draft);
          }
        );
      },
      commitMessage
    );
    if (!result.ok) {
      console.error("[approve] markFailed write didn't apply:", result);
    }
  } catch (err) {
    console.error("[approve] markFailed threw:", err);
  }
}

async function deleteBranchIfAny(
  gh: GithubConfig,
  branch: string | null
): Promise<void> {
  if (!branch || !branch.startsWith("req/")) return;
  try {
    await gh.octokit.rest.git.deleteRef({
      owner: gh.owner,
      repo: gh.repo,
      ref: `heads/${branch}`,
    });
  } catch (err) {
    const status =
      err && typeof err === "object" && "status" in err
        ? (err as { status: number }).status
        : 0;
    if (status !== 422 && status !== 404) {
      console.error("[approve] branch delete failed:", err);
    }
  }
}

function errorResponse(
  result: UpdateOutcome,
  context: string
): NextResponse {
  if (result.ok) {
    return NextResponse.json({ ok: true });
  }
  switch (result.reason) {
    case "not_found":
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    case "precondition_failed":
      return NextResponse.json(
        { error: "invalid_state", status: result.status },
        { status: 409 }
      );
    case "conflict_after_retries":
      return NextResponse.json({ error: "conflict" }, { status: 409 });
    case "write_error":
    default:
      console.error(`[${context}] write failed:`, result);
      return NextResponse.json({ error: "write_failed" }, { status: 500 });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
