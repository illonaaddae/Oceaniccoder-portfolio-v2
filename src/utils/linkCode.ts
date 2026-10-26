/**
 * The one-time link code in an emailed document link: /q/<token>#k=<code>,
 * and later /pay/<number>?s=<sig>#k=<code> and /receipt/<ref>?s=<sig>#k=<code>.
 *
 * src/index.tsx imports this module first, so it runs before React renders,
 * before any third-party script (Paystack loads later, on the pay page) and
 * before the page view goes to /api/visit. It reads the code and drops the
 * fragment from the address bar and history at once, so nothing else on the
 * page sees it. The page then claims it (useClientQuote for quotes).
 * Designs: docs/plans/2026-10-20-quote-access-code.md,
 * docs/plans/2026-10-25-invoice-receipt-access-codes.md (8.6).
 */

export type DocumentKind = "quote" | "invoice" | "receipt";

const PATHS: Record<string, DocumentKind> = { q: "quote", pay: "invoice", receipt: "receipt" };

// "<nonce>.<minted>.<hmac>", all base64url or base36; the server checks it.
const CODE_SHAPE = /^[\w.-]{1,200}$/;

let captured: { kind: DocumentKind; key: string; code: string } | null = null;

// The key is the path segment decoded, as the router's params give it, so a
// page compares it with its own param. Quote tokens are base64url and read the
// same either way.
function linkKey(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

export function captureLinkCode(
  location: typeof window.location = window.location,
  history: typeof window.history = window.history,
) {
  const code = new URLSearchParams(location.hash.slice(1)).get("k");
  if (code === null) return;
  history.replaceState(history.state, "", `${location.pathname}${location.search}`);
  captured = null;
  const match = /^\/(q|pay|receipt)\/([^/]+)/.exec(location.pathname);
  if (!match || !CODE_SHAPE.test(code)) return;
  const key = linkKey(match[2]);
  if (key) captured = { kind: PATHS[match[1]], key, code };
}

/** The code captured for this link, handed out once; null for any other link. */
export function takeLinkCode(kind: DocumentKind, key: string): string | null {
  if (!captured || captured.kind !== kind || captured.key !== key) return null;
  const { code } = captured;
  captured = null;
  return code;
}

captureLinkCode();
