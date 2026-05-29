/**
 * Request-record type. Lives on `main` at `requests/<id>.json`.
 * See spec/pipeline-mvp.md § Request data model.
 *
 * Optional image attachments are stored as separate repo files under
 * `requests/<id>/attachments/<safe-filename>` and referenced via the
 * `attachments` field below. See spec/pipeline-mvp.md § Attachments.
 */

/** Allowed mime types for image attachments. */
export type AttachmentMime = "image/png" | "image/jpeg" | "image/webp";

/**
 * Metadata about a single uploaded attachment. The binary lives in the
 * repo at `storedPath`; this record holds only the metadata embedded in
 * the request JSON. Original filename is sanitized for display but never
 * used as a file-system path component.
 */
export type Attachment = {
  originalFilename: string;
  storedFilename: string;
  storedPath: string;
  mimeType: AttachmentMime;
  sizeBytes: number;
  sha: string;
  uploadedAt: string;
};

export type RequestStatus =
  | "queued"
  | "clarification_needed"
  | "in_progress"
  | "review"
  | "improve_requested"
  | "publishing"
  | "done"
  | "rejected"
  | "failed";

/**
 * History event names. The `loop_*` events (and the `"loop"` actor below)
 * refer to the **Mode A operator/listener loop** — the interactive Claude
 * Code session acting as the queue operator (claim → branch → PR → review).
 * It is NOT a daemon, cron job, or background worker; "loop" is just the
 * operator's poll/process cycle. See spec/pipeline-operator-modes.md.
 *
 * `clarification_requested` (actor `loop`) + `clarification_answered`
 * (actor `admin`) cover the ambiguous-but-safe clarification flow — see
 * spec/pipeline-operator-modes.md § Four-tier classification rule.
 */
export type RequestHistoryEvent =
  | "created"
  | "loop_picked_up"
  | "loop_pushed_pr"
  | "loop_iterated"
  | "clarification_requested"
  | "clarification_answered"
  | "improve_requested"
  | "approval_started"
  | "approved"
  | "merged"
  | "rejected"
  | "failed"
  | "retry_queued"
  | "rolled_back";

export type RequestHistoryEntry = {
  at: string;
  actor: "user" | "loop" | "admin";
  event: RequestHistoryEvent;
  message?: string;
};

export type Request = {
  id: string;
  title: string;
  description: string;
  page?: string;
  edit_id?: string;
  createdBy?: string;
  status: RequestStatus;

  // ISO 8601 lifecycle timestamps
  createdAt: string;
  updatedAt: string;
  claimedAt: string | null;
  reviewReadyAt: string | null;
  approvedAt: string | null;
  publishedAt: string | null;
  rejectedAt: string | null;
  failedAt: string | null;

  // Filled by the operator
  branch: string | null;
  pullRequestUrl: string | null;
  pullRequestNumber: number | null;
  previewUrl: string | null;
  latestCommitSha: string | null;

  // Filled by approve
  productionCommitSha: string | null;
  productionDeploymentUrl: string | null;

  // Filled by reject
  rejectionReason?: string;

  // Failure context
  failureReason?: string;
  manualFix?: boolean;

  // Clarification flow (ambiguous-but-safe requests). When the operator
  // can't safely resolve a request, it parks it at `clarification_needed`
  // with a concise Swedish question here; the requester answers in the
  // queue board, the answer lands in `clarificationAnswer`, and the
  // request flips back to `queued`. Both hold the LATEST round; the full
  // Q&A thread lives in `history`. See spec/pipeline-operator-modes.md
  // § Four-tier classification rule.
  clarificationQuestion?: string;
  clarificationAnswer?: string;

  // Optional image attachments (1–3 per request when present).
  // Stored under `requests/<id>/attachments/...`; this array holds only
  // the metadata. Absent on text-only requests for backward compat.
  attachments?: ReadonlyArray<Attachment>;

  history: ReadonlyArray<RequestHistoryEntry>;
};

/**
 * Statuses that COUNT toward the intake queue-depth cap (`POST /api/feedback`).
 *
 * This is a *counting* set — it includes `queued` and `clarification_needed`,
 * which are NOT active work. **It is not the lane-blocking set** (see
 * `LANE_BLOCKING_STATUSES`). Do not use it to decide whether the single-lane
 * operator is busy.
 */
export const QUEUE_DEPTH_STATUSES: ReadonlySet<RequestStatus> =
  new Set<RequestStatus>([
    "queued",
    "clarification_needed",
    "in_progress",
    "review",
    "improve_requested",
    "publishing",
  ]);

/**
 * The single-lane occupants. The Mode A operator processes at most ONE
 * request in these statuses at a time. A request here is *active work*
 * (has, or is about to have, a `req/*` branch + PR).
 *
 * `clarification_needed` is deliberately **NOT** here: it is parked waiting
 * for the requester's answer, has no branch/PR, and must not block other
 * `queued` requests from being processed. Likewise `queued`, `done`,
 * `rejected`, and `failed` are not lane occupants.
 */
export const LANE_BLOCKING_STATUSES: ReadonlySet<RequestStatus> =
  new Set<RequestStatus>([
    "in_progress",
    "review",
    "improve_requested",
    "publishing",
  ]);
