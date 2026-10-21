import { useCallback, useEffect, useState } from "react";
import {
  claimQuoteLink,
  fetchClientQuote,
  isLockedError,
  QuoteApiError,
} from "@/services/api/quotes";
import { takeLinkCode } from "@/utils/quoteLinkCode";
import type { ClientQuote } from "@/types/quote";

export type ClientQuoteState =
  | { kind: "loading" }
  | { kind: "inactive" }
  | { kind: "error"; message: string }
  /** No unlock for this quote in this browser: show the code screen (QuoteAccessGate). */
  | { kind: "locked" }
  | { kind: "ok"; quote: ClientQuote };

// A link code works once, so a page load claims it once, even when the page
// mounts twice (StrictMode) or reloads the quote. A refused claim (already
// used, from an older email, another browser got there first) or a network
// failure is not an error here: the browser stays locked, the quote fetch
// answers 401 and the code screen asks for an emailed code instead.
const claims = new Map<string, Promise<void>>();

function claimLinkOnce(token: string): Promise<void> {
  const code = takeLinkCode(token);
  if (code)
    claims.set(
      token,
      claimQuoteLink(token, code).then(
        () => undefined,
        () => undefined,
      ),
    );
  return claims.get(token) ?? Promise.resolve();
}

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

  const reload = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      if (!admin) await claimLinkOnce(token);
      const { quote } = await fetchClientQuote(token, { preview, admin });
      setState({ kind: "ok", quote });
    } catch (err) {
      if (isLockedError(err)) setState({ kind: "locked" });
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

  const setQuote = useCallback((quote: ClientQuote) => setState({ kind: "ok", quote }), []);
  /** For a 401 locked from an action on the page (accept, pay): show the code screen. */
  const lock = useCallback(() => setState({ kind: "locked" }), []);
  return { state, reload, setQuote, lock };
}
