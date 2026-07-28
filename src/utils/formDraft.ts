/**
 * Saves an in-progress form to sessionStorage so a refresh does not wipe it.
 *
 * sessionStorage rather than localStorage, deliberately: the inquiry form holds
 * a name, email, phone number and project description. sessionStorage survives a
 * refresh — which is the whole point — but is discarded when the tab closes, so
 * personal details are not left sitting on a shared or public machine
 * indefinitely.
 *
 * This also matters because of lazyWithReload: a chunk-load failure after a
 * deploy triggers an automatic page reload, which would otherwise throw away
 * everything the visitor had typed.
 *
 * Drafts are versioned. Bumping the version on a shape change means an old draft
 * is ignored rather than restored into fields that no longer exist.
 */

interface StoredDraft<T> {
  version: number;
  savedAt: number;
  data: T;
}

// A draft older than this is treated as abandoned rather than restored — coming
// back to a half-filled form from days ago is more confusing than helpful.
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function saveDraft<T>(key: string, version: number, data: T, now: number): void {
  try {
    const payload: StoredDraft<T> = { version, savedAt: now, data };
    sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Private-browsing modes and storage quotas both throw here. Losing draft
    // persistence is acceptable; breaking the form is not.
  }
}

export function loadDraft<T>(key: string, version: number, now: number): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredDraft<T> | null;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== version) return null;
    if (typeof parsed.savedAt !== "number" || now - parsed.savedAt > MAX_AGE_MS) return null;
    if (parsed.data === null || typeof parsed.data !== "object") return null;

    return parsed.data;
  } catch {
    // Corrupt JSON or unavailable storage — start clean rather than throw.
    return null;
  }
}

export function clearDraft(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
