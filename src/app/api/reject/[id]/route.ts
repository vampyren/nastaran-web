/**
 * POST /api/reject/[id] — reject a request and tidy up.
 *
 * Allowed when current status is one of `review`, `improve_requested`,
 * `failed`. Sets status → `rejected`, records the reason, then
 * best-effort:
 *   - closes the PR (if `pullRequestNumber` is set)
 *   - deletes the `req/...` branch (if `branch` is set)
 *
 * Cleanup failures are logged but do not fail the request — the status
 * write is the source of truth.
 *
 * See spec/pipeline-mvp.md § Admin actions — API contracts §
 * POST /api/reject/[id].
 */

import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin, requireAdmin } from "@/lib/auth";
import { isValidRequestId } from "@/lib/github";
import { newGithub, transition, updateRequest } from "@/lib/request-store";

const MAX_REASON = 500;

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

  let body: { reason?: unknown } = {};
  try {
    if (req.headers.get("content-length") !== "0") {
      body = (await req.json()) as { reason?: unknown };
    }
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const reasonRaw = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reasonRaw.length > MAX_REASON) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const reason = reasonRaw.length > 0 ? reasonRaw : undefined;

  let gh;
  try {
    gh = newGithub();
  } catch (err) {
    console.error("[reject] GitHub config missing:", err);
    return NextResponse.json(
      { error: "server_misconfigured" },
      { status: 500 }
    );
  }

  const result = await updateRequest(
    gh,
    id,
    (current) => {
      if (!REJECTABLE.has(current.status)) return null;
      return transition(
        current,
        "rejected",
        "rejected",
        "admin",
        reason,
        (draft) => {
          if (reason) draft.rejectionReason = reason;
        }
      );
    },
    `request: ${id} — reject`
  );

  if (!result.ok) {
    return errorResponse(result);
  }

  const record = result.record;

  // Best-effort cleanup: close PR + delete branch. Failures are logged
  // but don't change the response — the canonical status write succeeded.
  await Promise.allSettled([
    closePullRequestIfAny(gh, record.pullRequestNumber),
    deleteBranchIfAny(gh, record.branch),
  ]);

  return NextResponse.json({ ok: true, status: record.status });
}

const REJECTABLE: ReadonlySet<string> = new Set([
  "review",
  "improve_requested",
  "failed",
]);

async function closePullRequestIfAny(
  gh: ReturnType<typeof newGithub>,
  pullNumber: number | null
): Promise<void> {
  if (!pullNumber) return;
  try {
    await gh.octokit.rest.pulls.update({
      owner: gh.owner,
      repo: gh.repo,
      pull_number: pullNumber,
      state: "closed",
    });
  } catch (err) {
    console.error("[reject] PR close failed:", err);
  }
}

async function deleteBranchIfAny(
  gh: ReturnType<typeof newGithub>,
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
    // 422 = branch already gone; that's fine.
    const status =
      err && typeof err === "object" && "status" in err
        ? (err as { status: number }).status
        : 0;
    if (status !== 422 && status !== 404) {
      console.error("[reject] branch delete failed:", err);
    }
  }
}

function errorResponse(
  result: Exclude<Awaited<ReturnType<typeof updateRequest>>, { ok: true }>
): NextResponse {
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
      console.error("[reject] write failed:", result);
      return NextResponse.json({ error: "write_failed" }, { status: 500 });
  }
}
