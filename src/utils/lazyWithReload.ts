import React from "react";

/**
 * React.lazy wrapper that recovers from stale-chunk failures.
 *
 * Every route in this app is code-split, and Vite fingerprints each chunk
 * (`InquiryPage-CBSGd73D.js`). A deploy publishes new hashes and removes the old
 * files, but a browser tab opened *before* that deploy still holds the previous
 * module map in memory. Navigating to a not-yet-loaded route then requests a
 * chunk that no longer exists, Azure returns 404, the dynamic import rejects,
 * and React.lazy throws into the ErrorBoundary — "Something went wrong" on a
 * page that is perfectly healthy on a fresh load.
 *
 * The window is not HTTP caching (index.html is max-age=30); it is any tab left
 * open across a deploy. It affects every lazy route, including /pay/:invoice,
 * where it would block a customer from paying.
 *
 * Recovery: on a chunk-load failure, reload once so the browser fetches the
 * current index.html and its current chunk hashes. A per-chunk sessionStorage
 * flag makes this strictly one attempt, so a genuinely missing chunk (bad
 * deploy) surfaces the error instead of reload-looping. Non-chunk errors — a
 * module that throws at import time — are rethrown untouched, so real bugs are
 * never masked by a reload.
 */

const FLAG_PREFIX = "chunk-reload:";

// Browsers word this differently: Chrome "Failed to fetch dynamically imported
// module", Firefox "error loading dynamically imported module", Safari
// "Importing a module script failed".
const CHUNK_ERROR_PATTERN =
  /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|unable to preload/i;

function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return CHUNK_ERROR_PATTERN.test(message);
}

// sessionStorage throws in some locked-down privacy modes; never let bookkeeping
// break the import path.
function readFlag(key: string): boolean {
  try {
    return sessionStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

function writeFlag(key: string): boolean {
  try {
    sessionStorage.setItem(key, "1");
    return true;
  } catch {
    return false;
  }
}

function clearFlag(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

// `any` mirrors React's own React.lazy / ComponentType<any> signature. Narrowing
// it (to unknown or never) erases each component's props and makes wrapped
// routes like AdminDashboard unusable as JSX elements.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithReload<T extends React.ComponentType<any>>(
  name: string,
  factory: () => Promise<{ default: T }>,
): React.LazyExoticComponent<T> {
  return React.lazy(() => {
    const key = `${FLAG_PREFIX}${name}`;

    return factory().then(
      (module: { default: T }) => {
        // Loaded fine — release the flag so a future deploy gets its own attempt.
        clearFlag(key);
        return module;
      },
      (error: unknown) => {
        if (!isChunkLoadError(error) || readFlag(key)) throw error;

        if (!writeFlag(key)) throw error;

        window.location.reload();
        // Reload is underway; never resolve, so nothing renders in the meantime.
        return new Promise<{ default: T }>(() => {});
      },
    );
  });
}
