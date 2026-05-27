import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, assertSameOrigin, requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authFail = await requireAdmin();
  if (authFail) return authFail;

  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }

  // Mirror the login route: clear via NextResponse.cookies.delete()
  // so the Set-Cookie clear is reliably emitted on the response.
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
