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
  //
  // Pass `{ name, path }` instead of the bare name string — Set-Cookie
  // semantics require the delete to match the original path attribute
  // to actually clear the cookie. The login route sets `path: "/"`,
  // so the delete must use the same path; otherwise some browsers
  // would create a separate cookie at the default path while leaving
  // the original intact.
  const res = NextResponse.json({ ok: true });
  res.cookies.delete({ name: SESSION_COOKIE, path: "/" });
  return res;
}
