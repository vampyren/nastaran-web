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
 * See spec/pipeline-mvp.md § Pre-launch admin-gating for policy + the
 * three-condition removal trigger.
 */

import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { assertSameOrigin, requireAdmin } from "@/lib/auth";
import {
  getMainFile,
  githubClient,
  listMainDir,
  putRequestFile,
} from "@/lib/github";
import { isValidPageId } from "@/lib/pages";
import {
  ACTIVE_STATUSES,
  type Request,
  type RequestStatus,
} from "@/lib/request-types";

// ---------------- Validation caps ----------------

const MAX_BODY_BYTES = 16 * 1024;
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

type FeedbackBody = {
  name?: string;
  email?: string;
  page?: string;
  edit_id?: string;
  title?: string;
  message?: string;
  website?: string;
};

function isString(v: unknown): v is string {
  return typeof v === "string";
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

  // 1. Body size guard.
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  let body: FeedbackBody;
  try {
    body = JSON.parse(raw) as FeedbackBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // 2. Honeypot — silent success if filled.
  if (isString(body.website) && body.website.length > 0) {
    return NextResponse.json({ ok: true });
  }

  // 3. Field validation (generic error code; don't reveal which field).
  const name = isString(body.name) ? body.name.trim() : "";
  if (name.length > MAX_NAME) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const email = isString(body.email) ? body.email.trim() : "";
  if (email.length > MAX_EMAIL) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  if (email.length > 0 && !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const pageRaw = isString(body.page) ? body.page.trim() : "";
  const page = pageRaw.startsWith("/") ? pageRaw.slice(1) : pageRaw;
  if (page.length > 0 && !isValidPageId(page)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  // edit_id is reserved for a future granular edit-registry (deferred in
  // v1 per CLAUDE.md decision 10). If a client sends one, reject it so we
  // don't silently store a value we can't validate. Empty/absent is fine.
  const editId = isString(body.edit_id) ? body.edit_id.trim() : "";
  if (editId.length > 0) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const title = isString(body.title) ? body.title.trim() : "";
  if (title.length > MAX_TITLE) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const message = isString(body.message) ? body.message.trim() : "";
  if (message.length === 0 || message.length > MAX_MESSAGE) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  // 4. Per-IP rate limit (best-effort, in-memory).
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "rate_limit" }, { status: 429 });
  }

  // 5. Queue-depth cap.
  let gh;
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
      // Cheap depth check: only need to count files. To get a precise
      // active count we'd have to fetch each — too expensive. Approximate:
      // assume any file in the directory is potentially active. Strict
      // over-counting is fine for a safety cap; admins can clean stale
      // files via reject/done flows.
      active += 1;
    }
    // Refine the cap to active-only with a parallel body-fetch if the
    // approximate count is at the threshold.
    if (active >= QUEUE_DEPTH_CAP) {
      const truly = await countActive(gh);
      if (truly >= QUEUE_DEPTH_CAP) {
        return NextResponse.json({ error: "queue_full" }, { status: 503 });
      }
    }
  } catch (err) {
    console.error("[feedback] queue depth probe failed:", err);
    // Soft-fail: keep accepting submissions if the depth check fails. The
    // alternative would be denial-of-service when GitHub is flaky.
  }

  // 6. Generate id + record. On 409 collision (extreme corner case),
  // regenerate once.
  let id = generateId();
  const now = new Date().toISOString();
  let record: Request = {
    id,
    title: title || message.slice(0, MAX_TITLE).split("\n")[0],
    description: message,
    page: page || undefined,
    edit_id: undefined,
    createdBy: name || "anonymous",
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
    history: [
      {
        at: now,
        actor: "user",
        event: "created",
        message: name ? `Submitted by ${name}` : "Submitted anonymously",
      },
    ],
  };

  // 7. Write to main. putRequestFile() validates the id internally via
  // requestPath() and hard-codes the path to requests/<id>.json — there
  // is no way for this route to write anywhere else on main. Initial
  // write has no sha (file doesn't exist). On 409 (rare collision),
  // regenerate id and retry once.
  for (let attempt = 0; attempt < 2; attempt++) {
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
      if ((status === 409 || status === 422) && attempt === 0) {
        id = generateId();
        record = { ...record, id };
        continue;
      }
      console.error("[feedback] write failed:", err);
      return NextResponse.json({ error: "write_failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "write_failed" }, { status: 500 });
}

/**
 * Precise active-count fallback for the queue-depth cap. Called only when
 * the cheap directory-size check is at the threshold, so this is cold-
 * path.
 */
async function countActive(
  gh: ReturnType<typeof githubClient>
): Promise<number> {
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
