/**
 * The one-time link code in an emailed quote link: /q/<token>#k=<code>.
 *
 * src/index.tsx imports this module first, so it runs before React renders,
 * before any third-party script (Paystack loads later, on the pay page) and
 * before the page view goes to /api/visit. It reads the code and drops the
 * fragment from the address bar and history at once, so nothing else on the
 * page sees it. useClientQuote then claims it (POST /api/quote-access).
 * Design: docs/plans/2026-10-20-quote-access-code.md.
 */

// "<nonce>.<minted>.<hmac>", all base64url or base36; the server checks it.
const CODE_SHAPE = /^[\w.-]{1,200}$/;

let captured: { token: string; code: string } | null = null;

export function captureLinkCode(
  location: typeof window.location = window.location,
  history: typeof window.history = window.history,
) {
  const code = new URLSearchParams(location.hash.slice(1)).get("k");
  if (code === null) return;
  history.replaceState(history.state, "", `${location.pathname}${location.search}`);
  // The token is compared as it appears in the path: link tokens are
  // base64url, so it reads the same as the router's decoded param.
  const match = /^\/q\/([^/]+)/.exec(location.pathname);
  captured = match && CODE_SHAPE.test(code) ? { token: match[1], code } : null;
}

/** The code captured for this link, handed out once; null for any other link. */
export function takeLinkCode(token: string): string | null {
  if (!captured || captured.token !== token) return null;
  const { code } = captured;
  captured = null;
  return code;
}

captureLinkCode();
