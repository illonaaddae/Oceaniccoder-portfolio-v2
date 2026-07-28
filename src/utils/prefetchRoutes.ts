/**
 * Warms lazy route chunks once the page is idle.
 *
 * Why: every route is code-split with a content-hashed filename, and an Azure
 * Static Web Apps deploy replaces the whole content snapshot — the previous
 * hashes are deleted, with no retention setting available to keep them. A tab
 * opened before a deploy still points at those files, so navigating to a
 * not-yet-loaded route 404s and drops the visitor on an error screen.
 *
 * Calling the same dynamic import ahead of time puts the module in the browser's
 * module registry. Once it is there, navigation resolves from memory and never
 * touches the network — so a later deploy deleting the file no longer matters.
 * That removes the failure for prefetched routes rather than recovering from it;
 * lazyWithReload remains the fallback for anything not yet warmed.
 *
 * Deliberately conservative about cost:
 *  - one chunk per idle slot, so it never competes with real interaction
 *  - skipped entirely on Save-Data or 2G
 *  - failures are swallowed; a prefetch must never surface to the user
 */

type RouteLoader = () => Promise<unknown>;

const IDLE_TIMEOUT_MS = 3000;

interface IdleWindow {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
}

interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: string;
}

function whenIdle(callback: () => void): void {
  const idle = (window as unknown as IdleWindow).requestIdleCallback;
  if (typeof idle === "function") idle(callback, { timeout: IDLE_TIMEOUT_MS });
  else window.setTimeout(callback, IDLE_TIMEOUT_MS);
}

// Respect the visitor's data preferences — prefetching is an optimisation, never
// something worth spending a metered connection on.
function shouldPrefetch(): boolean {
  const connection = (navigator as unknown as { connection?: NetworkInformation }).connection;
  if (!connection) return true;
  if (connection.saveData) return false;
  return !/(^|-)2g$/.test(connection.effectiveType ?? "");
}

export function prefetchRoutes(loaders: RouteLoader[]): void {
  if (!shouldPrefetch()) return;

  let index = 0;

  const loadNext = () => {
    if (index >= loaders.length) return;
    const loader = loaders[index];
    index += 1;

    loader()
      .catch(() => {
        // A prefetch failure is not actionable — the real navigation will retry
        // and lazyWithReload handles a genuinely stale chunk.
      })
      .finally(() => whenIdle(loadNext));
  };

  whenIdle(loadNext);
}
