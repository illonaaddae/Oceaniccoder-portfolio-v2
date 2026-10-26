import { useCallback, useEffect, useRef, useState } from "react";
import { quoteAccessTarget } from "@/services/api/access";
import { fetchClientQuote, isLockedError, QuoteApiError } from "@/services/api/quotes";
import { takeLinkCode } from "@/utils/linkCode";
import type { ClientQuote } from "@/types/quote";

export type ClientQuoteState =
  | { kind: "loading" }
  | { kind: "inactive" }
  | { kind: "error"; message: string }
  /**
   * No unlock for this quote in this browser: show the code screen
   * (QuoteAccessGate). cookieBlocked: it was just signed in and is still
   * locked, so the browser dropped the cookie.
   */
  | { kind: "locked"; cookieBlocked?: boolean }
  | { kind: "ok"; quote: ClientQuote };

// A link code works once, so a page load claims it once, even when the page
// mounts twice (StrictMode) or reloads the quote. A refused claim (already
// used, from an older email, another browser got there first) or a network
// failure is not an error here: the browser stays locked, the quote fetch
// answers 401 and the code screen asks for an emailed code instead.
// Resolves true when the claim signed the browser in. Loads that start while
// it runs share it; once it settles it is forgotten, so a later load (after
// the client is locked out again) doesn't count it as a fresh sign-in.
const claims = new Map<string, Promise<boolean>>();

function claimLinkOnce(token: string): Promise<boolean> {
  const code = takeLinkCode("quote", token);
  if (code) {
    const claim = quoteAccessTarget(token)
      .claim(code)
      .then(
        () => true,
        () => false,
      );
    claims.set(token, claim);
    void claim.then(() => claims.delete(token));
  }
  return claims.get(token) ?? Promise.resolve(false);
}

/** "?preview=admin" for links inside the dashboard's Preview, so it stays one. */
export const previewQuery = (admin: boolean) => (admin ? "?preview=admin" : "");

/**
 * preview: don't record the client's first view. admin: the dashboard's
 * Preview (?preview=admin), checked against the admin session; it never
 * claims a link code.
 */
export function useClientQuote(
  token: string,
  { preview = false, admin = false }: { preview?: boolean; admin?: boolean } = {},
) {
  const [state, setState] = useState<ClientQuoteState>({ kind: "loading" });
  // Set when a code or the status check has just signed this browser in.
  const justUnlocked = useRef(false);

  const reload = useCallback(async () => {
    setState({ kind: "loading" });
    let signedIn = justUnlocked.current;
    justUnlocked.current = false;
    try {
      if (!admin && (await claimLinkOnce(token))) signedIn = true;
      const { quote } = await fetchClientQuote(token, { preview, admin });
      setState({ kind: "ok", quote });
    } catch (err) {
      if (isLockedError(err)) setState({ kind: "locked", cookieBlocked: signedIn });
      else if (err instanceof QuoteApiError && (err.status === 404 || err.inactive))
        setState({ kind: "inactive" });
      else
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "We couldn't load the quote.",
        });
    }
  }, [token, preview, admin]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** The code screen signed the browser in: load the quote. */
  const unlocked = useCallback(() => {
    justUnlocked.current = true;
    void reload();
  }, [reload]);
  const setQuote = useCallback((quote: ClientQuote) => setState({ kind: "ok", quote }), []);
  /** For a 401 locked from an action on the page (accept, pay): show the code screen. */
  const lock = useCallback(() => setState({ kind: "locked" }), []);
  return { state, reload, unlocked, setQuote, lock };
}
