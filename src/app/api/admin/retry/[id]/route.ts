/**
 * POST /api/admin/retry/[id] — re-queue a failed request.
 *
 * Allowed when current status is `failed`. Clears failure context and
 * resets the request to `queued`; the operator will pick it up on its
 * next cycle.
 *
 * See spec/pipeline-mvp.md § Admin actions — API contracts §
 * POST /api/admin/retry/[id].
 */

import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin, requireAdmin } from "@/lib/auth";
import { isValidRequestId } from "@/lib/github";
import { newGithub, transition, updateRequest } from "@/lib/request-store";

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

  let gh;
  try {
    gh = newGithub();
  } catch (err) {
    console.error("[retry] GitHub config missing:", err);
    return NextResponse.json(
      { error: "server_misconfigured" },
      { status: 500 }
    );
  }

  const result = await updateRequest(
    gh,
    id,
    (current) => {
      if (current.status !== "failed") return null;
      return transition(
        current,
        "queued",
        "retry_queued",
        "admin",
        undefined,
        (draft) => {
          draft.failureReason = undefined;
          draft.manualFix = undefined;
          draft.failedAt = null;
        }
      );
    },
    `request: ${id} — retry`
  );

  return toResponse(result);
}

function toResponse(
  result: Awaited<ReturnType<typeof updateRequest>>
): NextResponse {
  if (result.ok) {
    return NextResponse.json({ ok: true, status: result.record.status });
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
      console.error("[retry] write failed:", result);
      return NextResponse.json({ error: "write_failed" }, { status: 500 });
  }
}
