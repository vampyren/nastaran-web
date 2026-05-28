/**
 * POST /api/feedback — request intake endpoint.
 *
 * PRE-LAUNCH POLICY (current): admin-gated. Only the site owner submits
 * requests until public launch. The matching server-side gate on the
 * `/onskemal` page redirects anonymous visitors to /admin/login.
 *
 * The full validation stack (body cap, per-field caps, email regex,
 * allowed page IDs, honeypot, per-IP rate limit, queue-depth cap, hard-
 * coded Octokit path via putRequestFile) is retained intentionally — when
 * the auth gate is removed for public launch, those validations remain
 * the in-depth defense the public-write design relies on.
 *
 * Two payload shapes:
 *   - `application/json` — text-only intake (legacy / no attachments).
 *   - `multipart/form-data` — text fields + 1–3 image attachments under
 *     the form-field name `attachments`. Attachments are validated by
 *     declared mime/size, then sniffed by magic bytes (mime in headers
 *     can lie). Each valid image is uploaded to
 *     `requests/<id>/attachments/<server-generated-name>` and its
 *     metadata is embedded in the request JSON.
 *
 * See spec/pipeline-mvp.md § Pre-launch admin-gating for policy + the
 * three-condition removal trigger, and § Attachments for the upload
 * model.
 */

import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { assertSameOrigin, requireAdmin } from "@/lib/auth";
import {
  attachmentPath,
  deleteMainFile,
  getMainFile,
  githubClient,
  type GithubConfig,
  listMainDir,
  putAttachmentFile,
  putRequestFile,
} from "@/lib/github";
import { isValidPageId } from "@/lib/pages";
import {
  ACTIVE_STATUSES,
  type Attachment,
  type AttachmentMime,
  type Request,
  type RequestStatus,
} from "@/lib/request-types";
import {
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  makeStoredFilename,
  sanitizeOriginalFilename,
  sniffImageMime,
  validateAttachmentDeclared,
} from "@/lib/attachments";

// ---------------- Validation caps ----------------

const MAX_BODY_BYTES = 16 * 1024;
// Multipart upload cap covers text fields + up to 3 images (5 MB each).
// 16 MiB gives a small budget for form-data framing overhead.
const MAX_MULTIPART_BYTES = 16 * 1024 * 1024;
const MAX_NAME = 80;
const MAX_EMAIL = 120;
const MAX_MESSAGE = 4000;
const MAX_TITLE = 120;

// Simple, deliberate email shape check — no DNS lookup.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------- Per-IP rate limit (best-effort) ----------------

const RATE_LIMIT = 10; // submissions
const RATE_WINDOW_MS = 60 * 60 * 1000; // per hour
const ipHits = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_LIMIT) return false;
  hits.push(now);
  ipHits.set(ip, hits);
  return true;
}

// ---------------- Queue depth cap ----------------

const QUEUE_DEPTH_CAP = 20;

// ---------------- ID generator ----------------
//
// Matches REQUEST_ID_PATTERN in src/lib/github.ts:
//   YYYYMMDD-HHmmss-<6 lowercase alnum>
// base64url uses [A-Za-z0-9_-]; we lowercase + strip non-alnum + pad to
// guarantee exactly 6 alnum chars even in the rare case that the random
// draw was mostly `_`/`-`.

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function generateId(): string {
  const now = new Date();
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const random = crypto
    .randomBytes(4)
    .toString("base64url")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 6)
    .padEnd(6, "0");
  return `${stamp}-${random}`;
}

// ---------------- Body parsing + validation ----------------

type FeedbackFields = {
  name: string;
  email: string;
  page: string;
  editId: string;
  title: string;
  message: string;
  website: string;
};

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function emptyFields(): FeedbackFields {
  return {
    name: "",
    email: "",
    page: "",
    editId: "",
    title: "",
    message: "",
    website: "",
  };
}

/**
 * Field-level validation shared by the JSON and multipart paths. Returns
 * either a NextResponse (caller returns it directly) or a validated
 * snapshot of the fields for record construction.
 */
function validateFields(
  f: FeedbackFields
): NextResponse | { name: string; email: string; page: string; title: string; message: string } {
  if (f.name.length > MAX_NAME) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  if (f.email.length > MAX_EMAIL) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  if (f.email.length > 0 && !EMAIL_RE.test(f.email)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const pageRaw = f.page;
  const page = pageRaw.startsWith("/") ? pageRaw.slice(1) : pageRaw;
  if (page.length > 0 && !isValidPageId(page)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  if (f.editId.length > 0) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  if (f.title.length > MAX_TITLE) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  if (f.message.length === 0 || f.message.length > MAX_MESSAGE) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  return { name: f.name, email: f.email, page, title: f.title, message: f.message };
}

// ---------------- Route ----------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 0a. Admin gate (pre-launch). MUST run before any body read,
  // validation, rate-limit accounting, or Octokit call — anonymous
  // direct submission must be rejected with no side effects.
  const authFail = await requireAdmin();
  if (authFail) return authFail;

  // 0b. Same-origin defense-in-depth. /api/feedback is a mutative
  // admin-gated POST; refuse authenticated cross-origin POSTs the same
  // way every other mutative admin route does. Must precede body read,
  // rate-limit accounting, GitHub config init, and any Octokit call.
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }

  // Branch on payload shape. Multipart is only for image attachments;
  // the JSON path covers the legacy text-only submission.
  const contentType = req.headers.get("content-type") ?? "";
  const isMultipart = contentType
    .toLowerCase()
    .startsWith("multipart/form-data");

  // 1+2+3. Parse + validate fields.
  let fields: FeedbackFields;
  const files: File[] = [];
  if (isMultipart) {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    fields = emptyFields();
    fields.name = String(form.get("name") ?? "").trim();
    fields.email = String(form.get("email") ?? "").trim();
    fields.page = String(form.get("page") ?? "").trim();
    fields.editId = String(form.get("edit_id") ?? "").trim();
    fields.title = String(form.get("title") ?? "").trim();
    fields.message = String(form.get("message") ?? "").trim();
    fields.website = String(form.get("website") ?? "");

    // Collect file entries under the documented field name `attachments`.
    const all = form.getAll("attachments");
    for (const entry of all) {
      if (entry instanceof File && entry.size > 0) files.push(entry);
    }
    if (files.length > MAX_ATTACHMENTS) {
      return NextResponse.json(
        { error: "too_many_files" },
        { status: 400 }
      );
    }

    // Total payload guard. Each file's `size` is the browser-reported
    // size; we still enforce per-file max during read below, but this
    // catches obvious payload abuse cheaply.
    let total = 0;
    for (const file of files) total += file.size;
    if (total > MAX_MULTIPART_BYTES) {
      return NextResponse.json(
        { error: "payload_too_large" },
        { status: 413 }
      );
    }
  } else {
    // application/json (default). Existing path.
    let raw: string;
    try {
      raw = await req.text();
    } catch {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    fields = emptyFields();
    fields.name = isString(body.name) ? body.name.trim() : "";
    fields.email = isString(body.email) ? body.email.trim() : "";
    fields.page = isString(body.page) ? body.page.trim() : "";
    fields.editId = isString(body.edit_id) ? body.edit_id.trim() : "";
    fields.title = isString(body.title) ? body.title.trim() : "";
    fields.message = isString(body.message) ? body.message.trim() : "";
    fields.website = isString(body.website) ? body.website : "";
  }

  // 2. Honeypot — silent success if filled (after parse, before further work).
  if (fields.website.length > 0) {
    return NextResponse.json({ ok: true });
  }

  // 3. Field validation.
  const validated = validateFields(fields);
  if (validated instanceof NextResponse) return validated;

  // 4. Per-IP rate limit (best-effort, in-memory).
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "rate_limit" }, { status: 429 });
  }

  // 5. GitHub client + queue-depth cap.
  let gh: GithubConfig;
  try {
    gh = githubClient();
  } catch (err) {
    console.error("[feedback] GitHub config missing:", err);
    return NextResponse.json(
      { error: "server_misconfigured" },
      { status: 500 }
    );
  }

  try {
    const dir = await listMainDir(gh, "requests");
    let active = 0;
    for (const entry of dir) {
      if (!entry.name.endsWith(".json")) continue;
      if (entry.name === "README.md") continue;
      active += 1;
    }
    if (active >= QUEUE_DEPTH_CAP) {
      const truly = await countActive(gh);
      if (truly >= QUEUE_DEPTH_CAP) {
        return NextResponse.json({ error: "queue_full" }, { status: 503 });
      }
    }
  } catch (err) {
    console.error("[feedback] queue depth probe failed:", err);
    // Soft-fail: keep accepting submissions if the depth check fails.
  }

  // 6. Generate id. On 409 collision (extreme corner case), regenerate
  // once during the metadata-file write below.
  const id = generateId();
  const now = new Date().toISOString();

  // 7. If attachments are present, upload them first. We write the
  // binaries before the JSON so a partial upload never gets a queue
  // entry. If any upload fails, best-effort delete the already-uploaded
  // blobs (they'd be orphaned without a parent JSON anyway).
  const uploaded: Array<{ attachment: Attachment; sha: string }> = [];
  if (files.length > 0) {
    let index = 0;
    for (const file of files) {
      index += 1;

      const declaredMime = file.type;
      const declaredSize = file.size;
      const declaredErr = validateAttachmentDeclared(declaredMime, declaredSize);
      if (declaredErr) {
        await rollbackAttachments(gh, id, uploaded);
        return NextResponse.json({ error: declaredErr }, { status: 400 });
      }

      // Read bytes and confirm via magic-byte sniff. Form-reported
      // `file.type` is advisory — bytes are the source of truth.
      let bytes: Uint8Array;
      try {
        const buf = await file.arrayBuffer();
        bytes = new Uint8Array(buf);
      } catch {
        await rollbackAttachments(gh, id, uploaded);
        return NextResponse.json({ error: "invalid_body" }, { status: 400 });
      }
      if (bytes.byteLength > MAX_ATTACHMENT_BYTES) {
        await rollbackAttachments(gh, id, uploaded);
        return NextResponse.json({ error: "file_too_large" }, { status: 400 });
      }
      const sniffed = sniffImageMime(bytes);
      if (sniffed === null || sniffed !== declaredMime) {
        await rollbackAttachments(gh, id, uploaded);
        return NextResponse.json({ error: "file_type_invalid" }, { status: 400 });
      }

      const mime: AttachmentMime = sniffed;
      const storedFilename = makeStoredFilename(index, mime);
      const contentBase64 = Buffer.from(bytes).toString("base64");

      try {
        const { contentSha } = await putAttachmentFile(
          gh,
          id,
          storedFilename,
          `request: ${id} — attachment ${index} (${storedFilename})`,
          contentBase64
        );
        const attachment: Attachment = {
          originalFilename: sanitizeOriginalFilename(file.name),
          storedFilename,
          storedPath: attachmentPath(id, storedFilename),
          mimeType: mime,
          sizeBytes: bytes.byteLength,
          sha: contentSha,
          uploadedAt: now,
        };
        uploaded.push({ attachment, sha: contentSha });
      } catch (err) {
        console.error(
          `[feedback] attachment upload ${index} failed for ${id}:`,
          err
        );
        await rollbackAttachments(gh, id, uploaded);
        return NextResponse.json({ error: "write_failed" }, { status: 500 });
      }
    }
  }

  // 8. Build record. createdBy honors `email` if provided (legacy path
  // never sent it; preserved here for forward-compat).
  const attachmentMeta =
    uploaded.length > 0 ? uploaded.map((u) => u.attachment) : undefined;

  let record: Request = {
    id,
    title: validated.title || validated.message.slice(0, MAX_TITLE).split("\n")[0],
    description: validated.message,
    page: validated.page || undefined,
    edit_id: undefined,
    createdBy: validated.name || "anonymous",
    status: "queued",
    createdAt: now,
    updatedAt: now,
    claimedAt: null,
    reviewReadyAt: null,
    approvedAt: null,
    publishedAt: null,
    rejectedAt: null,
    failedAt: null,
    branch: null,
    pullRequestUrl: null,
    pullRequestNumber: null,
    previewUrl: null,
    latestCommitSha: null,
    productionCommitSha: null,
    productionDeploymentUrl: null,
    attachments: attachmentMeta,
    history: [
      {
        at: now,
        actor: "user",
        event: "created",
        message: validated.name
          ? `Submitted by ${validated.name}${attachmentMeta ? ` with ${attachmentMeta.length} attachment(s)` : ""}`
          : `Submitted anonymously${attachmentMeta ? ` with ${attachmentMeta.length} attachment(s)` : ""}`,
      },
    ],
  };

  // 9. Write the JSON. putRequestFile() validates the id internally via
  // requestPath() and hard-codes the path to requests/<id>.json — there
  // is no way for this route to write anywhere else on main.
  //
  // If an attachment had been uploaded but the JSON write fails, we
  // best-effort clean up the orphaned blobs before reporting the error.
  // Note: id-collision retry is intentionally narrowed for the multipart
  // path — once the binaries are written under requests/<id>/..., the
  // id is taken in practice. For the JSON-only path the old single-id
  // generator was sufficient.
  try {
    await putRequestFile(
      gh,
      id,
      `request: ${id} — ${record.title.slice(0, 60)}`,
      record,
      undefined
    );
    return NextResponse.json({ ok: true, id });
  } catch (err: unknown) {
    const status =
      err && typeof err === "object" && "status" in err
        ? (err as { status: number }).status
        : 0;
    if (
      (status === 409 || status === 422) &&
      uploaded.length === 0
    ) {
      // Text-only path — try once more with a fresh id.
      const id2 = generateId();
      record = { ...record, id: id2 };
      try {
        await putRequestFile(
          gh,
          id2,
          `request: ${id2} — ${record.title.slice(0, 60)}`,
          record,
          undefined
        );
        return NextResponse.json({ ok: true, id: id2 });
      } catch (err2) {
        console.error("[feedback] write failed (retry):", err2);
        return NextResponse.json({ error: "write_failed" }, { status: 500 });
      }
    }
    console.error("[feedback] write failed:", err);
    await rollbackAttachments(gh, id, uploaded);
    return NextResponse.json({ error: "write_failed" }, { status: 500 });
  }
}

/**
 * Best-effort cleanup: deletes any attachment blobs that were written
 * before a downstream failure. Failures here are logged but never
 * surfaced to the client — the request itself already failed, and the
 * orphan blobs are harmless without a parent JSON (the queue board
 * never lists them).
 */
async function rollbackAttachments(
  gh: GithubConfig,
  id: string,
  uploaded: Array<{ attachment: Attachment; sha: string }>
): Promise<void> {
  for (const u of uploaded) {
    try {
      await deleteMainFile(
        gh,
        u.attachment.storedPath,
        u.sha,
        `request: ${id} — rollback attachment ${u.attachment.storedFilename}`
      );
    } catch (err) {
      console.error(
        `[feedback] rollback delete failed for ${u.attachment.storedPath}:`,
        err
      );
    }
  }
}

/**
 * Precise active-count fallback for the queue-depth cap. Called only when
 * the cheap directory-size check is at the threshold, so this is cold-
 * path.
 */
async function countActive(gh: GithubConfig): Promise<number> {
  const dir = await listMainDir(gh, "requests");
  let active = 0;
  await Promise.all(
    dir
      .filter((e) => e.name.endsWith(".json"))
      .map(async (e) => {
        const f = await getMainFile<{ status: RequestStatus }>(gh, e.path);
        if (f && ACTIVE_STATUSES.has(f.data.status)) active += 1;
      })
  );
  return active;
}
