/**
 * GET /api/list — admin queue listing.
 *
 * Reads every requests/*.json on main, returns them grouped/sorted so the
 * /onskemal-kogen board can render four sections without further work.
 *
 * Auth: requireAdmin only — listing is a read, so no same-origin check
 * (admin uses the board over normal navigation, not from arbitrary
 * origins).
 *
 * See spec/pipeline-mvp.md § Admin actions — API contracts § GET /api/list.
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getMainFile, githubClient, listMainDir } from "@/lib/github";
import type { Request, RequestStatus } from "@/lib/request-types";

const HISTORY_CAP = 30;

// Sort newest-first for terminal statuses (done, rejected), oldest-first
// for active ones (queued, in_progress, review, improve_requested,
// publishing, failed).
const TERMINAL: ReadonlySet<RequestStatus> = new Set<RequestStatus>([
  "done",
  "rejected",
]);

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const authFail = await requireAdmin();
  if (authFail) return authFail;

  let gh;
  try {
    gh = githubClient();
  } catch (err) {
    console.error("[list] GitHub config missing:", err);
    return NextResponse.json(
      { error: "server_misconfigured" },
      { status: 500 }
    );
  }

  let items: Request[] = [];
  try {
    const dir = await listMainDir(gh, "requests");
    const entries = dir.filter(
      (e) => e.name.endsWith(".json") && e.name !== "README.md"
    );
    const fetched = await Promise.all(
      entries.map(async (entry) => {
        const f = await getMainFile<Request>(gh, entry.path);
        return f?.data ?? null;
      })
    );
    items = fetched.filter((x): x is Request => x !== null);
  } catch (err) {
    console.error("[list] read failed:", err);
    return NextResponse.json({ error: "read_failed" }, { status: 500 });
  }

  // Sort: terminal items newest-first, active items oldest-first (FIFO).
  const active = items
    .filter((r) => !TERMINAL.has(r.status))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const terminal = items
    .filter((r) => TERMINAL.has(r.status))
    .sort((a, b) => {
      const aKey =
        a.publishedAt ?? a.approvedAt ?? a.rejectedAt ?? a.updatedAt;
      const bKey =
        b.publishedAt ?? b.approvedAt ?? b.rejectedAt ?? b.updatedAt;
      return bKey.localeCompare(aKey);
    })
    .slice(0, HISTORY_CAP);

  return NextResponse.json(
    { items: [...active, ...terminal] },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
