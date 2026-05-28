/**
 * GET /api/attachment/[id]/[name] — admin-gated proxy for request
 * attachment images.
 *
 * The repo is private, so the raw `requests/<id>/attachments/...` blobs
 * are not directly viewable in a browser. This route proxies them via
 * the server-side GitHub token, gated by the admin cookie.
 *
 * Both `id` and `name` are independently validated:
 *   - `id` against the documented request id format
 *   - `name` against the server-generated attachment filename shape
 *     (`<1-3>-<6 alnum>.<png|jpg|webp>`)
 *
 * The route reads the request JSON, looks up the attachment by its
 * server-generated `storedFilename` (which the route URL must match
 * exactly), and streams the bytes back with the recorded mime type.
 * The attachment's SHA from the request JSON is what gets fetched —
 * the URL never selects an arbitrary path component.
 *
 * Cache headers: short private cache (60 s) so the queue board's
 * thumbnails don't refetch on every poll, while still allowing the
 * operator to see updates if an attachment is replaced (not part of v1).
 *
 * See spec/pipeline-mvp.md § Attachments.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getMainBlob,
  getMainFile,
  githubClient,
  isValidAttachmentName,
  isValidRequestId,
  requestPath,
} from "@/lib/github";
import type { Attachment, Request } from "@/lib/request-types";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; name: string }> }
): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id, name } = await ctx.params;
  if (!isValidRequestId(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }
  if (!isValidAttachmentName(name)) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }

  let gh;
  try {
    gh = githubClient();
  } catch (err) {
    console.error("[attachment] GitHub config missing:", err);
    return NextResponse.json(
      { error: "server_misconfigured" },
      { status: 500 }
    );
  }

  // Look up the attachment by its stored filename in the request JSON.
  // This makes the request JSON the source of truth for which blob we
  // serve and protects against URL-driven blob lookups.
  let record: { data: Request; sha: string } | null;
  try {
    record = await getMainFile<Request>(gh, requestPath(id));
  } catch (err) {
    console.error(`[attachment] read failed for ${id}:`, err);
    return NextResponse.json({ error: "read_failed" }, { status: 500 });
  }
  if (!record) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const list = record.data.attachments ?? [];
  const found: Attachment | undefined = list.find(
    (a) => a.storedFilename === name
  );
  if (!found) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Fetch the actual bytes by sha (works for any size, unlike the
  // Contents API which returns a placeholder for >1 MB files).
  let bytes: Uint8Array;
  try {
    bytes = await getMainBlob(gh, found.sha);
  } catch (err) {
    console.error(`[attachment] blob fetch failed for ${found.sha}:`, err);
    return NextResponse.json({ error: "read_failed" }, { status: 500 });
  }

  const body = new Uint8Array(bytes);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": found.mimeType,
      "Content-Length": String(body.byteLength),
      "Cache-Control": "private, max-age=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
