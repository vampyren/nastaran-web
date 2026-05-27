"use client";

/**
 * Queue board client component. Fetches /api/list (lands in PR D), groups
 * the response into the four sections defined in spec/pipeline-mvp.md
 * § Swedish UI vocabulary, and renders cards with the four review
 * actions:
 *
 *   - Publicera (POST /api/approve/:id)
 *   - Förbättra (POST /api/iterate/:id, body { message })
 *   - Avvisa    (POST /api/reject/:id,  body { reason })
 *   - Försök igen (POST /api/admin/retry/:id)
 *
 * Until PR D ships the lifecycle APIs, /api/list returns 404 — the board
 * detects that case and renders the empty steady state. Once the APIs
 * ship, the same code path handles the real responses.
 */

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, LogOut } from "lucide-react";
import { pageLabel, routeForPage } from "@/lib/pages";
import type { Request, RequestStatus } from "@/lib/request-types";

type ActionKind = "approve" | "iterate" | "reject" | "retry";
type BusyAction = { id: string; kind: ActionKind } | null;

type ListResponse = { items: Request[] } | { error: string };

const SECTION_DEFS = [
  {
    key: "queued" as const,
    title: "Väntar i kö",
    statuses: new Set<RequestStatus>(["queued"]),
  },
  {
    key: "review" as const,
    title: "Aktivt i review",
    statuses: new Set<RequestStatus>([
      "in_progress",
      "review",
      "improve_requested",
      "publishing",
    ]),
  },
  {
    key: "failed" as const,
    title: "Fel",
    statuses: new Set<RequestStatus>(["failed"]),
  },
  {
    key: "done" as const,
    title: "Klart",
    statuses: new Set<RequestStatus>(["done", "rejected"]),
  },
];

const STATUS_LABEL: Record<RequestStatus, string> = {
  queued: "Väntar i kö",
  in_progress: "Pågår",
  review: "Aktivt i review",
  improve_requested: "Behöver justeras",
  publishing: "Publicerar",
  done: "Klart",
  rejected: "Avvisat",
  failed: "Fel",
};

const STATUS_CLASS: Record<RequestStatus, string> = {
  queued: "bg-paper-deep text-ink",
  in_progress: "bg-lavender text-aubergine",
  review: "bg-accent text-paper",
  improve_requested: "bg-lavender text-aubergine",
  publishing: "bg-aubergine text-paper",
  done: "bg-paper-deep text-aubergine",
  rejected: "bg-red-50 text-red-700",
  failed: "bg-red-600 text-paper",
};

const SECTION_BG: Record<string, string> = {
  queued: "bg-white",
  review: "bg-white",
  failed: "bg-red-50/50",
  done: "bg-paper-deep",
};

type LoadState = "loading" | "ready" | "unauthorized" | "error";

type ModalState =
  | { kind: "iterate"; id: string; title: string }
  | { kind: "reject"; id: string; title: string }
  | null;

function friendlyActionError(id: string, code: string): string {
  const idShort = id.slice(-6);
  switch (code) {
    case "not_mergeable":
      return `${idShort}: Kan inte publicera — PR är inte redo (stängd, draft, konflikt eller checks).`;
    case "not_mergeable_pr_closed":
    case "pr_closed":
      return `${idShort}: PR är stängd — kan inte publicera.`;
    case "pr_is_draft":
      return `${idShort}: PR är i draft-läge — markera som redo först.`;
    case "not_mergeable_dirty":
      return `${idShort}: PR har en konflikt mot main — lös konflikten först.`;
    case "merge_failed":
      return `${idShort}: Sammanslagning misslyckades — försök igen eller kontrollera PR.`;
    case "post_merge_metadata_write_failed":
      return `${idShort}: Sammanslagningen lyckades men status uppdaterades inte. Ärendet visas under Fel — produktionscommit finns dock.`;
    case "invalid_state":
      return `${idShort}: Statusen har redan ändrats — uppdatera och försök igen.`;
    case "conflict":
      return `${idShort}: Två ändringar krockade — uppdatera och försök igen.`;
    case "invalid_id":
      return `${idShort}: Felaktigt ärende-id.`;
    case "invalid_input":
    case "invalid_json":
      return `${idShort}: Felaktig indata.`;
    case "missing_pr":
      return `${idShort}: Ärendet saknar PR-koppling — kan inte publicera.`;
    case "unauthorized":
    case "http_401":
      return `${idShort}: Sessionen har gått ut — logga in igen.`;
    case "bad_origin":
    case "http_403":
      return `${idShort}: Åtgärden tilläts inte (ogiltigt ursprung).`;
    case "server_misconfigured":
      return `${idShort}: Servern är inte färdig konfigurerad.`;
    case "write_failed":
      return `${idShort}: Kunde inte skriva ändringen — försök igen.`;
    case "not_found":
    case "http_404":
      return `${idShort}: Ärendet hittades inte.`;
    case "read_failed":
      return `${idShort}: Kunde inte läsa ärendet — försök igen.`;
    default:
      return `${idShort}: ${code}`;
  }
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("sv-SE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fmtRelative(iso: string | null | undefined, nowMs: number): string {
  if (!iso) return "";
  try {
    const then = new Date(iso).getTime();
    if (!Number.isFinite(then)) return "";
    const diffSec = Math.max(0, Math.floor((nowMs - then) / 1000));
    if (diffSec < 60) return "just nu";
    const min = Math.floor(diffSec / 60);
    if (min < 60) return `${min} min sedan`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} tim sedan`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day} dagar sedan`;
    return "";
  } catch {
    return "";
  }
}

function fmtTime(d: Date): string {
  try {
    return d.toLocaleTimeString("sv-SE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "";
  }
}

function truncate(text: string, max = 220): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

export function QueueBoard() {
  const [items, setItems] = useState<Request[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [tickMs, setTickMs] = useState<number>(() => Date.now());

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/list", { cache: "no-store" });
      if (res.status === 401) {
        setState("unauthorized");
        return;
      }
      // Pre-PR-D: /api/list endpoint not shipped yet. Render empty
      // steady state instead of an alarming error banner. Once PR D
      // lands this branch becomes dead code and can be removed.
      if (res.status === 404) {
        setItems([]);
        setState("ready");
        setLastUpdated(new Date());
        return;
      }
      const data = (await res.json()) as ListResponse;
      if (!res.ok || "error" in data) {
        setError("error" in data ? data.error : `http_${res.status}`);
        setState("error");
        return;
      }
      setItems(data.items);
      setState("ready");
      setLastUpdated(new Date());
    } catch (err) {
      console.error("[QueueBoard] fetch failed:", err);
      setError("network_error");
      setState("error");
    }
  }, []);

  useEffect(() => {
    // The polling pattern (fetch on mount + every 30s) is "syncing external
    // state into the component" — the canonical use case for useEffect. The
    // react-hooks/set-state-in-effect rule is over-eager here because it
    // can't see that load() is async and its setStates happen later.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const t = window.setInterval(() => {
      void load();
    }, 30_000);
    return () => window.clearInterval(t);
  }, [load]);

  // Keep "x min sedan" rolling without re-fetching.
  useEffect(() => {
    const t = window.setInterval(() => {
      setTickMs(Date.now());
    }, 30_000);
    return () => window.clearInterval(t);
  }, []);

  // Auto-clear action errors after ~8s.
  useEffect(() => {
    if (!actionError) return;
    const t = window.setTimeout(() => setActionError(null), 8000);
    return () => window.clearTimeout(t);
  }, [actionError]);

  async function handleLogout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {}
    window.location.assign("/");
  }

  const runAction = useCallback(
    async (
      id: string,
      kind: ActionKind,
      url: string,
      body?: Record<string, unknown>
    ): Promise<boolean> => {
      setBusyAction({ id, kind });
      setActionError(null);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        if (res.ok) {
          await load();
          return true;
        }
        let code = `http_${res.status}`;
        try {
          const data = (await res.json()) as { error?: string };
          if (data?.error) code = data.error;
        } catch {}
        setActionError(friendlyActionError(id, code));
        return false;
      } catch (err) {
        console.error("[QueueBoard] action failed:", err);
        setActionError(`${id.slice(-6)}: Nätverksfel — försök igen.`);
        return false;
      } finally {
        setBusyAction(null);
      }
    },
    [load]
  );

  if (state === "unauthorized") {
    return (
      <div className="rounded-2xl bg-paper-deep p-8 text-center">
        <p className="text-ink-muted">Sessionen har gått ut. Logga in igen.</p>
        <a
          href="/admin/login?next=/onskemal-kogen"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-aubergine px-6 py-3 text-[0.92rem] font-semibold text-paper shadow-cta transition hover:bg-aubergine-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Logga in
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <p
            className="text-[0.85rem] text-ink-muted"
            aria-live="polite"
            aria-atomic="true"
          >
            {state === "loading" && "Laddar…"}
            {state === "ready" && `${items.length} önskemål totalt`}
            {state === "error" && (
              <span className="text-red-700">Kunde inte ladda: {error}</span>
            )}
          </p>
          {lastUpdated && (
            <p className="text-[0.78rem] text-ink-muted">
              Senast uppdaterad: {fmtTime(lastUpdated)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={state === "loading"}
            aria-label={state === "loading" ? "Uppdaterar…" : "Uppdatera"}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-hairline bg-white px-3 text-[0.85rem] font-medium text-ink transition hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw
              size={14}
              aria-hidden="true"
              className={state === "loading" ? "animate-spin" : ""}
            />
            {state === "loading" ? "Uppdaterar…" : "Uppdatera"}
          </button>
          <button
            type="button"
            onClick={() => void handleLogout()}
            aria-label="Logga ut"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-hairline bg-white px-3 text-[0.85rem] font-medium text-ink transition hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <LogOut size={14} aria-hidden="true" />
            Logga ut
          </button>
        </div>
      </div>

      {actionError && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[0.85rem] text-red-700"
        >
          {actionError}
        </p>
      )}

      <div className="grid gap-6">
        {SECTION_DEFS.map((section) => {
          const bucket = items.filter((r) => section.statuses.has(r.status));
          return (
            <section
              key={section.key}
              aria-labelledby={`queue-${section.key}`}
              className={`rounded-2xl border border-hairline p-5 md:p-6 ${SECTION_BG[section.key]}`}
            >
              <div className="mb-4 flex items-baseline justify-between">
                <h2
                  id={`queue-${section.key}`}
                  className="text-[1.15rem] font-semibold text-ink"
                >
                  {section.title}
                </h2>
                <span className="text-[0.85rem] text-ink-muted">
                  {bucket.length} st
                </span>
              </div>

              {bucket.length === 0 ? (
                <p className="text-[0.9rem] text-ink-muted">
                  Inga ärenden här just nu.
                </p>
              ) : (
                <ul className="grid gap-3">
                  {bucket.map((r) => (
                    <RequestCard
                      key={r.id}
                      request={r}
                      nowMs={tickMs}
                      busy={busyAction?.id === r.id}
                      busyKind={
                        busyAction?.id === r.id ? busyAction.kind : null
                      }
                      onApprove={() =>
                        void runAction(r.id, "approve", `/api/approve/${r.id}`)
                      }
                      onIterate={() =>
                        setModal({ kind: "iterate", id: r.id, title: r.title })
                      }
                      onReject={() =>
                        setModal({ kind: "reject", id: r.id, title: r.title })
                      }
                      onRetry={() =>
                        void runAction(
                          r.id,
                          "retry",
                          `/api/admin/retry/${r.id}`
                        )
                      }
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {modal && (
        <ActionModal
          modal={modal}
          busy={busyAction?.id === modal.id}
          onClose={() => setModal(null)}
          onSubmit={async (text) => {
            const url =
              modal.kind === "iterate"
                ? `/api/iterate/${modal.id}`
                : `/api/reject/${modal.id}`;
            const body =
              modal.kind === "iterate"
                ? { message: text }
                : { reason: text };
            const ok = await runAction(modal.id, modal.kind, url, body);
            if (ok) setModal(null);
          }}
        />
      )}
    </div>
  );
}

function RequestCard({
  request,
  nowMs,
  busy,
  busyKind,
  onApprove,
  onIterate,
  onReject,
  onRetry,
}: {
  request: Request;
  nowMs: number;
  busy: boolean;
  busyKind: ActionKind | null;
  onApprove: () => void;
  onIterate: () => void;
  onReject: () => void;
  onRetry: () => void;
}) {
  const statusClass = STATUS_CLASS[request.status];
  const showReviewActions = request.status === "review";
  const showFailedActions = request.status === "failed";
  const pageDisplay = request.page ? pageLabel(request.page) : null;
  const relative = fmtRelative(request.createdAt, nowMs);
  const absolute = fmtDate(request.createdAt);

  const previewHref = request.previewUrl
    ? `${request.previewUrl}${routeForPage(request.page)}`
    : null;

  return (
    <li className="rounded-xl border border-hairline bg-white p-4 md:p-5">
      <div className="flex flex-wrap items-baseline gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.72rem] font-semibold uppercase tracking-[0.05em] ${statusClass}`}
        >
          {STATUS_LABEL[request.status]}
        </span>
        {pageDisplay && (
          <span className="text-[0.78rem] text-ink-muted">{pageDisplay}</span>
        )}
        <span
          className="ml-auto text-right text-[0.78rem] text-ink-muted"
          title={absolute}
        >
          {relative ? (
            <>
              <span>{relative}</span>
              <span className="ml-2 hidden text-[0.72rem] opacity-70 sm:inline">
                {absolute}
              </span>
            </>
          ) : (
            absolute
          )}
        </span>
      </div>

      <h3 className="mt-2 text-[1rem] font-semibold text-ink">
        {request.title}
      </h3>
      <p className="mt-1 text-[0.92rem] leading-[1.55] text-ink-muted">
        {truncate(request.description)}
      </p>

      {request.rejectionReason && (
        <p className="mt-3 whitespace-pre-wrap rounded-md border border-hairline bg-paper-deep px-3 py-2 text-[0.85rem] text-ink-muted">
          <span className="font-semibold text-aubergine">Avvisat:</span>{" "}
          {request.rejectionReason}
        </p>
      )}

      {request.failureReason && (
        <p className="mt-3 whitespace-pre-wrap rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[0.85rem] text-red-700">
          {request.failureReason}
          {request.manualFix ? " · kräver manuell åtgärd" : ""}
        </p>
      )}

      {(request.pullRequestUrl ||
        request.previewUrl ||
        request.productionCommitSha) && (
        <div className="mt-3 flex flex-wrap gap-3 text-[0.82rem]">
          {request.pullRequestUrl && (
            <a
              href={request.pullRequestUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded text-accent transition hover:text-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              PR ↗
            </a>
          )}
          {previewHref && (
            <a
              href={previewHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded text-accent transition hover:text-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Preview
              {pageDisplay && request.page && routeForPage(request.page) !== ""
                ? ` · ${pageDisplay}`
                : ""}{" "}
              ↗
            </a>
          )}
          {request.productionCommitSha && (
            <span className="font-mono text-ink-muted">
              {request.productionCommitSha.slice(0, 7)}
            </span>
          )}
        </div>
      )}

      {(showReviewActions || showFailedActions) && (
        <>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {showReviewActions && (
              <>
                <button
                  type="button"
                  onClick={onApprove}
                  disabled={busy}
                  aria-busy={busyKind === "approve"}
                  className="inline-flex h-9 w-full items-center justify-center rounded-full bg-aubergine px-4 text-[0.85rem] font-semibold text-paper transition hover:bg-aubergine-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:justify-start"
                >
                  {busyKind === "approve" ? "Publicerar…" : "Publicera"}
                </button>
                <button
                  type="button"
                  onClick={onIterate}
                  disabled={busy}
                  aria-busy={busyKind === "iterate"}
                  className="inline-flex h-9 w-full items-center justify-center rounded-full border border-hairline bg-white px-4 text-[0.85rem] font-semibold text-ink transition hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:justify-start"
                >
                  {busyKind === "iterate" ? "Skickar justering…" : "Förbättra"}
                </button>
                <button
                  type="button"
                  onClick={onReject}
                  disabled={busy}
                  aria-busy={busyKind === "reject"}
                  className="inline-flex h-9 w-full items-center justify-center rounded-full border border-red-200 bg-white px-4 text-[0.85rem] font-semibold text-red-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:justify-start"
                >
                  {busyKind === "reject" ? "Avvisar…" : "Avvisa"}
                </button>
              </>
            )}
            {showFailedActions && (
              <>
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={busy}
                  aria-busy={busyKind === "retry"}
                  className="inline-flex h-9 w-full items-center justify-center rounded-full bg-aubergine px-4 text-[0.85rem] font-semibold text-paper transition hover:bg-aubergine-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:justify-start"
                >
                  {busyKind === "retry" ? "Försöker igen…" : "Försök igen"}
                </button>
                <button
                  type="button"
                  onClick={onReject}
                  disabled={busy}
                  aria-busy={busyKind === "reject"}
                  className="inline-flex h-9 w-full items-center justify-center rounded-full border border-red-200 bg-white px-4 text-[0.85rem] font-semibold text-red-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:justify-start"
                >
                  {busyKind === "reject" ? "Avvisar…" : "Avvisa"}
                </button>
              </>
            )}
          </div>
          {busyKind === "approve" && (
            <p
              role="status"
              aria-live="polite"
              className="mt-2 text-[0.82rem] text-ink-muted"
            >
              Publicerar ändringen. Det kan ta en liten stund — squash-merge
              och Vercel-deploy körs.
            </p>
          )}
        </>
      )}
    </li>
  );
}

function ActionModal({
  modal,
  busy,
  onClose,
  onSubmit,
}: {
  modal: Exclude<ModalState, null>;
  busy: boolean;
  onClose: () => void;
  onSubmit: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const isIterate = modal.kind === "iterate";
  const title = isIterate ? "Förbättra" : "Avvisa";
  const placeholder = isIterate
    ? "Vad behöver justeras? T.ex. 'Gör rubriken kortare och flytta CTA högre upp.'"
    : "Varför avvisas det här önskemålet? (valfritt)";
  const submitLabel = isIterate ? "Skicka justering" : "Avvisa";
  const required = isIterate;

  const trimmed = text.trim();
  const disabled = busy || (required && trimmed.length === 0);
  const busyLabel = isIterate ? "Skickar justering…" : "Avvisar…";

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-card">
        <h2
          id="action-modal-title"
          className="text-[1.05rem] font-semibold text-ink"
        >
          {title} — {modal.title}
        </h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          rows={5}
          maxLength={isIterate ? 2000 : 500}
          className="mt-3 w-full rounded-xl border border-hairline bg-paper p-3 text-[0.92rem] text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          autoFocus
        />
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex h-9 items-center rounded-full border border-hairline bg-white px-4 text-[0.85rem] font-semibold text-ink transition hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
          >
            Avbryt
          </button>
          <button
            type="button"
            onClick={() => void onSubmit(trimmed)}
            disabled={disabled}
            className="inline-flex h-9 items-center rounded-full bg-aubergine px-4 text-[0.85rem] font-semibold text-paper transition hover:bg-aubergine-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? busyLabel : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
