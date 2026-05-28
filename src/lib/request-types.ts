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
 */
export type RequestHistoryEvent =
  | "created"
  | "loop_picked_up"
  | "loop_pushed_pr"
  | "loop_iterated"
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

  // Optional image attachments (1–3 per request when present).
  // Stored under `requests/<id>/attachments/...`; this array holds only
  // the metadata. Absent on text-only requests for backward compat.
  attachments?: ReadonlyArray<Attachment>;

  history: ReadonlyArray<RequestHistoryEntry>;
};

/** Statuses that count toward the queue-depth cap. */
export const ACTIVE_STATUSES: ReadonlySet<RequestStatus> = new Set<RequestStatus>([
  "queued",
  "in_progress",
  "review",
  "improve_requested",
  "publishing",
]);
