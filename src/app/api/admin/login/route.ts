import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_TTL_SEC,
  createSession,
  timingSafeCompare,
} from "@/lib/auth";

const MAX_BODY_BYTES = 4 * 1024; // 4 KB is plenty for a login post

type LoginBody = { password?: unknown };

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Cheap body-size guard — read text first so we can cap before JSON parse.
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  let body: LoginBody;
  try {
    body = JSON.parse(raw) as LoginBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 8) {
    // Config error — surface generically, log to console.
    console.error("[admin/login] ADMIN_PASSWORD is missing or too short");
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!timingSafeCompare(password, expected)) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  let token: string;
  try {
    token = createSession();
  } catch (err) {
    console.error("[admin/login] createSession failed:", err);
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  // Set the session cookie on the response itself.
  //
  // The `cookies()` helper from `next/headers` is reliable for reads,
  // but in Route Handlers the documented path for emitting Set-Cookie
  // is `NextResponse.cookies.set()`. Going through `cookies().set()`
  // here was observed to drop attributes (notably `maxAge`), turning
  // the persistent 7-day cookie into a session cookie that died on
  // page refresh. Setting it on the response directly guarantees the
  // full attribute set lands in the Set-Cookie header.
  //
  // SameSite=lax (not strict) — strict was blocking the cookie on
  // certain same-site top-level navigations (address-bar entry, some
  // refresh flows), so `/api/admin/me` (same-document fetch) would
  // see the cookie while `/onskemal` page render (top-level
  // navigation) wouldn't. Lax sends the cookie on same-site + cross-
  // site top-level GETs, but still NOT on cross-site POST/PUT/DELETE
  // — so CSRF protection on mutative routes remains intact via
  // SameSite. The mutative POST routes additionally enforce
  // `assertSameOrigin(req)` as a second CSRF layer, so this is not
  // weakening auth — it's matching the recommended default for
  // session cookies in modern apps.
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: SESSION_TTL_SEC,
    path: "/",
  });
  return res;
}
