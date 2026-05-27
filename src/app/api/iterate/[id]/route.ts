/**
 * POST /api/iterate/[id] — send an existing request back to the operator
 * with a follow-up message.
 *
 * Allowed when current status is `review`. Records the admin's message
 * in history and flips status to `improve_requested`; the operator
 * picks it up and amends the SAME branch + SAME PR.
 *
 * See spec/pipeline-mvp.md § Admin actions — API contracts §
 * POST /api/iterate/[id].
 */

import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin, requireAdmin } from "@/lib/auth";
import { isValidRequestId } from "@/lib/github";
import { newGithub, transition, updateRequest } from "@/lib/request-store";

const MAX_MESSAGE = 2000;

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

  let body: { message?: unknown };
  try {
    body = (await req.json()) as { message?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length === 0 || message.length > MAX_MESSAGE) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  let gh;
  try {
    gh = newGithub();
  } catch (err) {
    console.error("[iterate] GitHub config missing:", err);
    return NextResponse.json(
      { error: "server_misconfigured" },
      { status: 500 }
    );
  }

  const result = await updateRequest(
    gh,
    id,
    (current) => {
      if (current.status !== "review") return null;
      return transition(
        current,
        "improve_requested",
        "improve_requested",
        "admin",
        message
      );
    },
    `request: ${id} — improve`
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
      console.error("[iterate] write failed:", result);
      return NextResponse.json({ error: "write_failed" }, { status: 500 });
  }
}
