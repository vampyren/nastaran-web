/**
 * Shared mapping of page-id ↔ label, used by /api/feedback (validation,
 * in PR D) and /onskemal (display + prefill from ?page=, in PR C).
 *
 * Page id convention: the nav item's href without leading "/", with "/"
 * itself represented as "index". Plus a "hela-sajten" catch-all for
 * "applies to the whole site" requests.
 *
 * Hash-fragment nav items (e.g. "/#behandlingar" — an anchor on the
 * home page rather than a standalone route) are intentionally excluded
 * from the page-id allowlist. The operator's safe-edit surface only
 * covers standalone routes' content files.
 */

import { navItems } from "@/content/site";

export const ALL_SITE_PAGE_ID = "hela-sajten";
export const HOME_PAGE_ID = "index";

function hrefToId(href: string): string {
  if (href === "/") return HOME_PAGE_ID;
  return href.replace(/^\//, "");
}

const pageNavItems = navItems.filter((item) => !item.href.includes("#"));

/**
 * `Map<pageId, label>` — ordered list of every valid page id with a
 * human-friendly label. Includes home + every standalone subpage +
 * "hela-sajten" catch-all.
 */
export const PAGE_LABELS: ReadonlyMap<string, string> = new Map(
  [
    ...pageNavItems.map((n) => [hrefToId(n.href), n.label] as const),
    [ALL_SITE_PAGE_ID, "Hela sajten"],
  ]
);

/** Set form for fast validation. */
export const ALLOWED_PAGE_IDS: ReadonlySet<string> = new Set(PAGE_LABELS.keys());

/** Returns true if the value is a known page id. */
export function isValidPageId(value: unknown): value is string {
  return typeof value === "string" && ALLOWED_PAGE_IDS.has(value);
}

/**
 * Sanitize a query-string `?page=` value down to a known id, falling back
 * to the "hela-sajten" sentinel when missing / unknown.
 *
 * Also accepts a single leading "/" (e.g. `?page=/om-mig` → `om-mig`) so
 * URL fragments from anchor tags work without extra glue.
 */
export function sanitizePageId(raw: string | undefined | null): string {
  if (!raw) return ALL_SITE_PAGE_ID;
  const trimmed = raw.trim();
  const stripped = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  const normalized = stripped === "" ? HOME_PAGE_ID : stripped;
  return ALLOWED_PAGE_IDS.has(normalized) ? normalized : ALL_SITE_PAGE_ID;
}

/** Returns the human-friendly label for a known id, or "Okänd sida". */
export function pageLabel(id: string): string {
  return PAGE_LABELS.get(id) ?? "Okänd sida";
}

/**
 * Map a page id to its production / preview route path.
 *
 * - `index` (home) → `"/"`
 * - any other valid id (e.g. `om-mig`) → `"/${id}"`
 * - `hela-sajten` (all-site sentinel), `null`, `undefined`, or anything
 *   else not in `ALLOWED_PAGE_IDS` → `""` so callers can fall back to
 *   the deployment root unchanged.
 *
 * Used by the queue board (PR C) to derive a deep-link from
 * `previewUrl + routeForPage(request.page)`. Stored metadata is not
 * touched.
 */
export function routeForPage(id: string | null | undefined): string {
  if (!id || !ALLOWED_PAGE_IDS.has(id)) return "";
  if (id === ALL_SITE_PAGE_ID) return "";
  if (id === HOME_PAGE_ID) return "/";
  return `/${id}`;
}
