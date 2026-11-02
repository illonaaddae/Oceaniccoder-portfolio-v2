import { useCallback, useEffect, useMemo, useState } from "react";
import { financeApi } from "@/services/api/finance";
import type { FinanceData } from "@/types/finance";
import { cashBalance, fundBalances } from "@/utils/finance/ledger";

const EMPTY: FinanceData = { funds: [], txns: [], budgets: [], expected: [] };

/**
 * The whole ledger, loaded once and reloaded after every change, so balances
 * on screen always come from what the server actually stored.
 */
export function useFinance() {
  const [data, setData] = useState<FinanceData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const next = await financeApi.list();
      setData(next);
      setLoaded(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your finances.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** Runs a change, then reloads. Throws so the calling form can show the error. */
  const mutate = useCallback(
    async <T>(change: () => Promise<T>): Promise<T> => {
      const result = await change();
      await reload();
      return result;
    },
    [reload],
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
