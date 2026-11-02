import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { financeApi } from "@/services/api/finance";
import type { FinanceData } from "@/types/finance";
import { cashBalance, fundBalances } from "@/utils/finance/ledger";

const EMPTY: FinanceData = { funds: [], txns: [], budgets: [], expected: [], version: null };

/**
 * The whole ledger, loaded once and reloaded after every change, so balances
 * on screen always come from what the server actually stored. Only the latest
 * reload lands: an older one that answers late is dropped, so it can't put
 * back a ledger from before a change.
 */
export function useFinance() {
  const [data, setData] = useState<FinanceData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  // Set only by a failed load, not by a failed change, so "Couldn't refresh"
  // never shows for a refused delete.
  const [loadFailed, setLoadFailed] = useState(false);
  const latest = useRef(0);

  const reload = useCallback(async () => {
    const request = ++latest.current;
    setLoading(true);
    try {
      const next = await financeApi.list();
      if (request !== latest.current) return;
      setData(next);
      setLoaded(true);
      setError(null);
      setLoadFailed(false);
      setUpdatedAt(new Date());
    } catch (err) {
      if (request !== latest.current) return;
      setError(err instanceof Error ? err.message : "Couldn't load your finances.");
      setLoadFailed(true);
    } finally {
      if (request === latest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  /**
   * Runs a change, then reloads. `change` gets the version of the ledger on
   * screen, for the server to refuse the write if the ledger has moved on;
   * the reload brings the new version for the next change. Throws so the
   * calling form can show the error.
   */
  const version = data.version;
  const mutate = useCallback(
    async <T>(change: (version: string | null) => Promise<T>): Promise<T> => {
      const result = await change(version);
      await reload();
      return result;
    },
    [reload, version],
  );

  const balances = useMemo(() => fundBalances(data.txns), [data.txns]);
  const cash = useMemo(() => cashBalance(data.txns), [data.txns]);
  const activeFunds = useMemo(
    () =>
      data.funds
        .filter((f) => !f.archived)
        .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name)),
    [data.funds],
  );

  /**
   * A saved fund id as a starting value for a fund select, whose options are
   * the active funds only. An archived or deleted fund starts as "" instead of
   * a value the select can't show.
   */
  const selectableFundId = useCallback(
    (fundId: string) => (activeFunds.some((f) => f.id === fundId) ? fundId : ""),
    [activeFunds],
  );

  /** Shows a failed change in the tab's error banner. */
  const report = useCallback((err: unknown, fallback: string) => {
    setError(err instanceof Error ? err.message : fallback);
  }, []);

  return {
    data,
    loading,
    loaded,
    error,
    updatedAt,
    /** The last load failed, so what is on screen is from `updatedAt`. */
    stale: loadFailed && updatedAt !== null,
    report,
    clearError: () => setError(null),
    reload,
    mutate,
    balances,
    cash,
    activeFunds,
    selectableFundId,
  };
}

export type FinanceState = ReturnType<typeof useFinance>;
