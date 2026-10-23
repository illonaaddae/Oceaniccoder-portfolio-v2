import { useCallback, useEffect, useRef, useState } from "react";
import { getPayments, type Payment } from "@/services/api/payments";

export const POLL_MS = 15_000;

export interface PaymentsFeed {
  payments: Payment[];
  /** Replace rows locally after a write (archive, restore) without refetching. */
  setPayments: React.Dispatch<React.SetStateAction<Payment[]>>;
  loading: boolean;
  /** A visible failure from the first load or a manual refresh. */
  error: string | null;
  clearError: () => void;
  /** When the list last loaded successfully. */
  updatedAt: Date | null;
  /** The last background refresh failed; the list may be out of date. */
  stale: boolean;
  refresh: () => void;
}

const message = (e: unknown) =>
  e instanceof Error && e.message ? e.message : "Couldn't load payments.";

/**
 * Loads the payments list and keeps it fresh while the tab is open.
 *
 * Webhook payments are written on the server, so the list is refetched every
 * POLL_MS while the page is visible, and at once when it becomes visible again.
 */
export function usePaymentsFeed(): PaymentsFeed {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [stale, setStale] = useState(false);
  // Only the newest request may write state, so a slow poll can't overwrite
  // a fresher manual refresh.
  const latest = useRef(0);
  const mounted = useRef(true);
  // Whether any load has succeeded. Until one has, a failed background
  // refetch is the only news there is, so it shows as an error, not "stale".
  const loaded = useRef(false);
  // Manual loads in flight, and whether a local write superseded one. The
  // admin asked for a refresh, so a superseded one runs again rather than
  // being dropped.
  const manualInFlight = useRef(0);
  const rerunManual = useRef(false);

  const load = useCallback(async function run(quiet: boolean): Promise<void> {
    const id = ++latest.current;
    if (!quiet) {
      manualInFlight.current += 1;
      setLoading(true);
    }
    try {
      const rows = await getPayments();
      if (!mounted.current || id !== latest.current) return;
      loaded.current = true;
      setPayments(rows);
      setUpdatedAt(new Date());
      setStale(false);
      if (!quiet) setError(null);
    } catch (e) {
      if (!mounted.current || id !== latest.current) return;
      if (quiet && loaded.current) setStale(true);
      else setError(message(e));
    } finally {
      if (!quiet) {
        manualInFlight.current -= 1;
        // Only the last manual load in flight decides: re-run it, or stop the
        // spinner. Not tied to `latest`, so a poll that overtakes a manual
        // refresh can't leave the spinner running, and a pending re-run
        // keeps it on without a flicker.
        if (mounted.current && manualInFlight.current === 0) {
          if (rerunManual.current) {
            rerunManual.current = false;
            void run(false);
          } else {
            setLoading(false);
          }
        }
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void load(false);
    return () => {
      mounted.current = false;
    };
  }, [load]);

  useEffect(() => {
    const visible = () => document.visibilityState !== "hidden";
    const poll = setInterval(() => {
      if (visible()) void load(true);
    }, POLL_MS);
    const onVisibility = () => {
      if (visible()) void load(true);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  // A local write is newer than any request already in flight, so discard
  // those responses instead of letting them undo the change for one poll. A
  // manual refresh among them is re-run once it returns.
  const setLocal = useCallback<React.Dispatch<React.SetStateAction<Payment[]>>>((update) => {
    latest.current += 1;
    if (manualInFlight.current > 0) rerunManual.current = true;
    setPayments(update);
  }, []);

  return {
    payments,
    setPayments: setLocal,
    loading,
    error,
    clearError: useCallback(() => setError(null), []),
    updatedAt,
    stale,
    refresh: useCallback(() => void load(false), [load]),
  };
}
