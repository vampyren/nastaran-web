/**
 * Request-record type. Lives on `main` at `requests/<id>.json`.
 * See spec/pipeline-mvp.md § Request data model.
 */

export type RequestStatus =
  | "queued"
  | "in_progress"
  | "review"
  | "improve_requested"
  | "publishing"
  | "done"
  | "rejected"
  | "failed";

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
