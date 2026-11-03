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
  // The load request whose ledger is on screen, set with the ledger itself.
  const [shown, setShown] = useState(0);
  // What the tab's polite status region says; `n` makes a repeat read out again.
  const [announcement, setAnnouncement] = useState({ text: "", n: 0 });
  const announce = useCallback(
    (text: string) => setAnnouncement((a) => ({ text, n: a.n + 1 })),
    [],
  );

  /** Resolves true when this load landed and succeeded. */
  const reload = useCallback(async (): Promise<boolean> => {
    const request = ++latest.current;
    setLoading(true);
    try {
      const next = await financeApi.list();
      if (request !== latest.current) return false;
      setData(next);
      setShown(request);
      setLoaded(true);
      setError(null);
      setLoadFailed(false);
      setUpdatedAt(new Date());
      return true;
    } catch (err) {
      if (request !== latest.current) return false;
      setError(err instanceof Error ? err.message : "Couldn't load your finances.");
      setLoadFailed(true);
      return false;
    } finally {
      if (request === latest.current) setLoading(false);
    }
  }, []);

  // A row a change may take off the screen, where focus goes if it does, and
  // the load request that brings the ledger after the change (`after`).
  const leaving = useRef<{ row: HTMLElement; next: (HTMLElement | null)[]; after: number } | null>(
    null,
  );
  // Runs after every render of the tab. Once the ledger from after the change
  // is on the page, rows removed included, the row is settled either way, so
  // a later removal it had nothing to do with can't move focus.
  useEffect(() => {
    const pending = leaving.current;
    if (!pending || shown < pending.after) return;
    leaving.current = null;
    if (pending.row.isConnected) return;
    // Only when focus went with the row, not when it has moved on since.
    if (document.activeElement && document.activeElement !== document.body) return;
    pending.next.find((el) => el?.isConnected)?.focus();
  });

  useEffect(() => {
    void reload();
  }, [reload]);

  /**
   * Runs a change, then reloads. `change` gets the version of the ledger on
   * screen, for the server to refuse the write if the ledger has moved on;
   * the reload brings the new version for the next change. Throws so the
   * calling form can show the error.
   *
   * `row` is a row the change can take out of its list (archive, delete, a
   * status that moves it to the other list). If it goes, focus moves to the
   * next row's name, else the previous row's, else the list, else the view,
   * instead of dropping to the page. Names carry data-row-name and lists
   * data-row-list, both with tabIndex={-1}.
   *
   * An edit form keeps its values across a reload, so it also sends the
   * record's `updatedAt` from when it opened (`expectedUpdatedAt`); that,
   * not the version, is what stops a save after Refresh putting old values
   * back over a newer edit.
   */
  const version = data.version;
  const mutate = useCallback(
    async <T>(
      change: (version: string | null) => Promise<T>,
      { row }: { row?: HTMLElement | null } = {},
    ): Promise<T> => {
      const nameIn = (el: Element | null | undefined) =>
        el?.querySelector<HTMLElement>("[data-row-name]") ?? null;
      const pending = row
        ? {
            row,
            next: [
              nameIn(row.nextElementSibling),
              nameIn(row.previousElementSibling),
              row.closest<HTMLElement>("[data-row-list]"),
              row.closest<HTMLElement>("[data-finance-view]"),
            ],
            after: Infinity,
          }
        : null;
      leaving.current = pending;
      let result: T;
      try {
        result = await change(version);
      } catch (err) {
        leaving.current = null;
        throw err;
      }
      const reloading = reload();
      if (pending) pending.after = latest.current;
      // A reload that failed or was overtaken never shows this change's
      // ledger, so nothing would settle the row.
      if (!(await reloading) && leaving.current === pending) leaving.current = null;
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
    /** The text of the tab's status region, and `announce` to set it. */
    announcement,
    announce,
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
