/**
 * Whether this browser may send page views at all.
 *
 * Do Not Track and Global Privacy Control are treated as a "no": nothing is
 * sent, not even an anonymous count. Automated browsers (navigator.webdriver)
 * and the owner's own browser (the `oc_notrack` flag set on admin login) are
 * skipped too. The whole feature is off unless the build sets
 * VITE_ANALYTICS_ENABLED to "true".
 */

const OPT_OUT_KEY = "oc_notrack";

interface PrivacyNavigator {
  doNotTrack?: string | null;
  globalPrivacyControl?: boolean;
  webdriver?: boolean;
}

function readOptOut(): boolean {
  try {
    return localStorage.getItem(OPT_OUT_KEY) === "1";
  } catch {
    // Storage blocked: nothing marks this as the owner's browser.
    return false;
  }
}

export function trackingAllowed(): boolean {
  if (import.meta.env.VITE_ANALYTICS_ENABLED !== "true") return false;
  if (typeof navigator === "undefined") return false;
  const nav = navigator as typeof navigator & PrivacyNavigator;
  const legacyDnt = (window as typeof window & { doNotTrack?: string }).doNotTrack;
  if (nav.doNotTrack === "1" || nav.doNotTrack === "yes" || legacyDnt === "1") return false;
  if (nav.globalPrivacyControl === true) return false;
  if (nav.webdriver === true) return false;
  return !readOptOut();
}

/** Marks this browser as the owner's so its visits are never counted. */
export function optOutOfTracking(): void {
  // With analytics off, store nothing (and let the build drop this code).
  if (import.meta.env.VITE_ANALYTICS_ENABLED !== "true") return;
  try {
    localStorage.setItem(OPT_OUT_KEY, "1");
  } catch {
    // Storage blocked; the admin routes are excluded regardless.
  }
}
