import { useCallback, useEffect, useState } from "react";
import { fetchClientQuote, QuoteApiError } from "@/services/api/quotes";
import type { ClientQuote } from "@/types/quote";

export type ClientQuoteState =
  | { kind: "loading" }
  | { kind: "inactive" }
  | { kind: "error"; message: string }
  | { kind: "ok"; quote: ClientQuote };

export function useClientQuote(token: string, preview = false) {
  const [state, setState] = useState<ClientQuoteState>({ kind: "loading" });

  const reload = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const { quote } = await fetchClientQuote(token, preview);
      setState({ kind: "ok", quote });
    } catch (err) {
      if (err instanceof QuoteApiError && (err.status === 404 || err.inactive))
        setState({ kind: "inactive" });
      else
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "We couldn't load the quote.",
        });
    }
  }, [token, preview]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setQuote = useCallback((quote: ClientQuote) => setState({ kind: "ok", quote }), []);
  return { state, reload, setQuote };
}
