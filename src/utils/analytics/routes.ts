/**
 * Turns a router pathname into the path recorded for a page view, or null when
 * the page must not be recorded.
 *
 * Client documents (/q/<token>, /pay/<invoice>, /receipt/<reference>) carry
 * bearer tokens in the URL, and admin pages are the owner's own, so neither is
 * ever sent. /api/visit applies the same rules again server-side.
 */

const MAX_PATH = 150;
const PATH = /^\/[a-z0-9/_-]*$/;
export const NOT_FOUND_PATH = "/(404)";

// The public pages in src/routes/publicRoutes.tsx, minus the client documents
// and the catch-all. /api/visit keeps the same list (TRACKED_ROUTES in
// api/shared/analytics/validate.js); analytics.test.ts fails if either drifts.
export const TRACKED_ROUTES = [
  "/",
  "/about",
  "/skills",
  "/projects",
  "/projects/:slug",
  "/services",
  "/blog",
  "/blog/:slug",
  "/contact",
  "/booking",
  "/inquiry",
  "/privacy",
];

const SPLIT_ROUTES = TRACKED_ROUTES.map((route) => route.split("/"));

function matchesRoute(path: string): boolean {
  const parts = path.split("/");
  return SPLIT_ROUTES.some(
    (route) =>
      route.length === parts.length &&
      route.every((seg, i) => (seg.startsWith(":") ? parts[i] !== "" : seg === parts[i])),
  );
}

/** Admin pages and client documents, by their first path segment. */
export function isExcluded(pathname: string): boolean {
  const first = pathname.toLowerCase().split("/")[1] || "";
  return (
    first.startsWith("admin") ||
    first.startsWith("dashboard") ||
    first === "q" ||
    first === "pay" ||
    first === "receipt"
  );
}

export function normalisePath(pathname: string): string | null {
  const bare = pathname.split(/[?#]/)[0].toLowerCase();
  const path = bare.length > 1 ? bare.replace(/\/+$/, "") || "/" : bare;
  if (isExcluded(path)) return null;
  if (path.length > MAX_PATH || !PATH.test(path)) return null;
  return matchesRoute(path) ? path : NOT_FOUND_PATH;
}
