import { postJson } from "./dataApi";

/** Where the browser kept its own visitor id before the server issued them. */
const LEGACY_KEY = "blog_visitor_id";

let pending: Promise<void> | null = null;

function legacyVisitorId(): string | undefined {
  try {
    return localStorage.getItem(LEGACY_KEY) || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Makes sure the browser holds the signed, HttpOnly visitor cookie that
 * /api/counters needs before it counts a read or a reaction. Sends the old
 * localStorage id once so a returning reader keeps their reaction. Runs once
 * per page load; a failed attempt is retried on the next call.
 */
export function ensureVisitor(): Promise<void> {
  pending ??= postJson("/api/counters/visitor", { visitorId: legacyVisitorId() }).then(
    () => undefined,
    (err: unknown) => {
      pending = null;
      throw err;
    },
  );
  return pending;
}
