/**
 * GET /api/admin/me — cheap auth probe used by the AdminFAB (PR C) and any
 * other UI that needs to know whether the current visitor has an admin
 * cookie.
 *
 * Returns 200 { authed: true } when the cookie is valid, 401 otherwise.
 * No DB, no GitHub call — just verifies the cookie signature + expiry.
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const fail = await requireAdmin();
  if (fail) return fail;
  return NextResponse.json(
    { authed: true },
    { headers: { "Cache-Control": "no-store" } }
  );
}
