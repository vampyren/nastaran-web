/**
 * Admin auth helpers — single shared password model.
 *
 * Cookie format: `<expiryMs>.<hmac-sha256-hex>` where the HMAC is keyed by
 * ADMIN_SESSION_SECRET. timingSafeCompare is used for both password and
 * session-signature comparisons. See spec/pipeline-mvp.md § Admin auth.
 *
 * No state, no DB, no per-admin attribution. Everything fits in two env vars
 * (ADMIN_PASSWORD, ADMIN_SESSION_SECRET) plus the httpOnly cookie.
 */

import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";

export const SESSION_COOKIE = "nastaran-admin";
export const SESSION_TTL_SEC = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("ADMIN_SESSION_SECRET is missing or too short (>= 16 chars)");
  }
  return s;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

/**
 * Timing-safe string comparison.
 * Returns false if lengths differ (without revealing the difference).
 */
export function timingSafeCompare(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * Mint a fresh session token.
 * Format: `<expiryMs>.<hex-hmac>`
 */
export function createSession(): string {
  const expiryMs = Date.now() + SESSION_TTL_SEC * 1000;
  const payload = String(expiryMs);
  return `${payload}.${sign(payload)}`;
}

/**
 * Validate a session token (signature + expiry).
 * Returns true iff the token is well-formed, signed by us, and unexpired.
 */
export function verifySession(token: string | undefined): boolean {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return false;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  let expected: string;
  try {
    expected = sign(payload);
  } catch {
    return false;
  }
  if (!timingSafeCompare(signature, expected)) return false;
  const expiryMs = Number.parseInt(payload, 10);
  if (!Number.isFinite(expiryMs)) return false;
  return expiryMs > Date.now();
}

/**
 * Server-side admin guard for route handlers.
 *
 * Returns null when the request is authenticated (caller may proceed).
 * Returns a NextResponse 401 when the cookie is missing or invalid (caller
 * must short-circuit and return it).
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!verifySession(token)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

/**
 * Async variant for server components — returns a boolean only.
 * Use in server pages that need to redirect anonymous visitors to /admin/login.
 */
export async function hasAdminSession(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

/**
 * Defense-in-depth: ensure the request's Origin matches the host header on
 * mutative admin endpoints. Same-site cookies already protect against most
 * CSRF, but this is the cheap extra check the spec requires.
 *
 * Returns true if origin and host match, or if the request has no Origin
 * header (e.g. same-origin server-side fetches). Returns false if the
 * Origin host differs from the request host.
 */
export function assertSameOrigin(req: NextRequest | Request): boolean {
  const headers = "headers" in req ? req.headers : new Headers();
  const origin = headers.get("origin");
  const host = headers.get("host");
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    return Boolean(host) && originHost === host;
  } catch {
    return false;
  }
}
