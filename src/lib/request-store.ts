/**
 * Request-record CAS helpers.
 *
 * Every status mutation writes to `requests/<id>.json` on `main` via Octokit
 * with optimistic concurrency. The helpers below centralize:
 *
 *   - read-just-before-write (always fetch the latest SHA)
 *   - state-machine precondition checks (refresh + re-evaluate on 409)
 *   - retry-on-409 up to 3 attempts (50/200/500ms backoff)
 *
 * See spec/pipeline-mvp.md § Optimistic concurrency.
 */

import {
  getMainFile,
  githubClient,
  putRequestFile,
  requestPath,
  type GithubConfig,
} from "@/lib/github";
import type {
  Request,
  RequestHistoryEntry,
  RequestStatus,
} from "@/lib/request-types";

const BACKOFFS_MS = [50, 200, 500];

export type UpdateOutcome =
  | { ok: true; record: Request }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "precondition_failed"; status: RequestStatus }
  | { ok: false; reason: "conflict_after_retries" }
  | { ok: false; reason: "write_error"; message: string };

/**
 * Read-modify-write `requests/<id>.json` with CAS + state-machine recheck.
 *
 * `precondition` runs on the freshly-read record. Returning `null` means
 * "abort — current state is invalid for this transition" (caller gets a
 * 409). Returning a record means "write this back".
 */
export async function updateRequest(
  gh: GithubConfig,
  id: string,
  precondition: (current: Request) => Request | null,
  commitMessage: string
): Promise<UpdateOutcome> {
  // Validate the id once up front. requestPath() throws on malformed ids;
  // we collapse that into "not_found" so callers don't need a separate
  // outcome variant. Same id flows to putRequestFile below, so the
  // validation only needs to happen here.
  let path: string;
  try {
    path = requestPath(id);
  } catch {
    return { ok: false, reason: "not_found" };
  }

  for (let attempt = 0; attempt < BACKOFFS_MS.length + 1; attempt++) {
    const file = await getMainFile<Request>(gh, path);
    if (!file) return { ok: false, reason: "not_found" };

    const next = precondition(file.data);
    if (!next) {
      return {
        ok: false,
        reason: "precondition_failed",
        status: file.data.status,
      };
    }

    try {
      await putRequestFile(gh, id, commitMessage, next, file.sha);
      return { ok: true, record: next };
    } catch (err: unknown) {
      const status =
        err && typeof err === "object" && "status" in err
          ? (err as { status: number }).status
          : 0;
      if (status === 409 || status === 422) {
        // Race — refetch + reapply precondition. Backoff a bit.
        if (attempt < BACKOFFS_MS.length) {
          await sleep(BACKOFFS_MS[attempt]);
          continue;
        }
        return { ok: false, reason: "conflict_after_retries" };
      }
      const message =
        err instanceof Error ? err.message : String(err ?? "unknown");
      return { ok: false, reason: "write_error", message };
    }
  }
  return { ok: false, reason: "conflict_after_retries" };
}

/**
 * Convenience: write a transition (status + timestamps + history entry).
 * Caller can layer extra field updates via `mutate`.
 */
export function transition(
  current: Request,
  to: RequestStatus,
  event: RequestHistoryEntry["event"],
  actor: RequestHistoryEntry["actor"],
  message?: string,
  mutate?: (draft: Request) => void
): Request {
  const now = new Date().toISOString();
  const next: Request = {
    ...current,
    status: to,
    updatedAt: now,
    history: [
      ...current.history,
      { at: now, actor, event, ...(message ? { message } : {}) },
    ],
  };

  // Auto-fill the lifecycle timestamps when entering specific terminal/active
  // states. Callers can still override via `mutate`.
  if (to === "in_progress" && !next.claimedAt) next.claimedAt = now;
  if (to === "review" && !next.reviewReadyAt) next.reviewReadyAt = now;
  if (to === "publishing") next.approvedAt = next.approvedAt ?? now;
  if (to === "done") {
    next.approvedAt = next.approvedAt ?? now;
    next.publishedAt = now;
    next.manualFix = undefined;
    next.failureReason = undefined;
  }
  if (to === "rejected") next.rejectedAt = now;
  if (to === "failed") next.failedAt = now;

  if (mutate) mutate(next);
  return next;
}

export function newGithub(): GithubConfig {
  return githubClient();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
