import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, assertSameOrigin, requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authFail = await requireAdmin();
  if (authFail) return authFail;

  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }

  const store = await cookies();
  store.delete(SESSION_COOKIE);

  return NextResponse.json({ ok: true });
}
