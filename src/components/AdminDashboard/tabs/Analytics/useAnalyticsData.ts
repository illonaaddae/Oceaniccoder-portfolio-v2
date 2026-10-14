import { useCallback, useEffect, useRef, useState } from "react";
import { getPayments, type Payment } from "@/services/api/payments";
import { getInvoices } from "@/services/api/invoices";
import { getExpenses } from "@/services/api/expenses";
import { quoteAdmin } from "@/services/api/quotes";
import type { Expense, Invoice } from "@/types";
import type { QuoteSummary } from "@/types/quote";

export interface AnalyticsSources {
  payments: Payment[];
  invoices: Invoice[];
  quotes: QuoteSummary[];
  expenses: Expense[];
}

export type Source = keyof AnalyticsSources;

/** One message per source that failed on the last load. */
export type SourceErrors = Partial<Record<Source, string>>;

/** Which sources have answered at least once, with data or an error. */
export type SourcesLoaded = Record<Source, boolean>;

const EMPTY: AnalyticsSources = { payments: [], invoices: [], quotes: [], expenses: [] };
const NONE_LOADED: SourcesLoaded = {
  payments: false,
  invoices: false,
  quotes: false,
  expenses: false,
};

const FAILED: Record<Source, string> = {
  payments: "Couldn't load payments.",
  invoices: "Couldn't load invoices.",
  quotes: "Couldn't load quotes.",
  expenses: "Couldn't load expenses.",
};

const message = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

/**
 * Loads every business row Analytics needs, paging through each table. Each
 * source lands as soon as it answers, so a card can show once its own data is
 * in. A source that fails keeps what was on screen and reports its own error,
 * so one bad request doesn't blank the whole tab.
 */
export function useAnalyticsData() {
  const [data, setData] = useState<AnalyticsSources>(EMPTY);
  const [errors, setErrors] = useState<SourceErrors>({});
  const [loaded, setLoaded] = useState<SourcesLoaded>(NONE_LOADED);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const active = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    const track = <K extends Source>(source: K, request: () => Promise<AnalyticsSources[K]>) =>
      request().then(
        (rows) => {
          if (!active.current) return;
          setData((prev) => ({ ...prev, [source]: rows }));
          setErrors(({ [source]: _cleared, ...rest }) => rest);
          setLoaded((prev) => ({ ...prev, [source]: true }));
        },
        (err: unknown) => {
          if (!active.current) return;
          setErrors((prev) => ({ ...prev, [source]: message(err, FAILED[source]) }));
          setLoaded((prev) => ({ ...prev, [source]: true }));
        },
      );
    await Promise.all([
      track("payments", getPayments),
      track("invoices", getInvoices),
      track("quotes", () =>
        quoteAdmin<{ quotes: QuoteSummary[] }>("list").then((r) => r.quotes ?? []),
      ),
      track("expenses", getExpenses),
    ]);
    if (!active.current) return;
    setUpdatedAt(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    active.current = true;
    void load();
    return () => {
      active.current = false;
    };
  }, [load]);

  const setExpenses = useCallback(
    (update: (prev: Expense[]) => Expense[]) =>
      setData((prev) => ({ ...prev, expenses: update(prev.expenses) })),
    [],
  );

  return { data, errors, loaded, loading, updatedAt, refresh: load, setExpenses };
}
