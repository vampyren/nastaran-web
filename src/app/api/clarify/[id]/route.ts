/**
 * POST /api/clarify/[id] — answer an operator clarification question.
 *
 * Allowed when current status is `clarification_needed`. Records the
 * requester's answer in `clarificationAnswer` + history, then flips the
 * SAME request back to `queued` so the operator picks it up again on its
 * next cycle. No new request, no branch, no PR is created — the operator
 * never built one while the request was parked.
 *
 * See spec/pipeline-mvp.md § Admin actions — API contracts §
 * POST /api/clarify/[id] and spec/pipeline-operator-modes.md
 * § Four-tier classification rule.
 */

import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin, requireAdmin } from "@/lib/auth";
import { isValidRequestId } from "@/lib/github";
import { newGithub, transition, updateRequest } from "@/lib/request-store";

const MAX_ANSWER = 2000;

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

  let body: { answer?: unknown };
  try {
    body = (await req.json()) as { answer?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const answer = typeof body.answer === "string" ? body.answer.trim() : "";
  if (answer.length === 0 || answer.length > MAX_ANSWER) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  let gh;
  try {
    gh = newGithub();
  } catch (err) {
    console.error("[clarify] GitHub config missing:", err);
    return NextResponse.json(
      { error: "server_misconfigured" },
      { status: 500 }
    );
  }

  const result = await updateRequest(
    gh,
    id,
    (current) => {
      if (current.status !== "clarification_needed") return null;
      return transition(
        current,
        "queued",
        "clarification_answered",
        "admin",
        answer,
        (draft) => {
          draft.clarificationAnswer = answer;
        }
      );
    },
    `request: ${id} — clarification answered`
  );

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
      console.error("[clarify] write failed:", result);
      return NextResponse.json({ error: "write_failed" }, { status: 500 });
  }
}
