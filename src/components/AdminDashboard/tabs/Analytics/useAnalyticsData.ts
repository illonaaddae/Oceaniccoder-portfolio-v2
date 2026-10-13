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

/** One message per source that failed on the last load. */
export type SourceErrors = Partial<Record<"payments" | "invoices" | "quotes" | "expenses", string>>;

const EMPTY: AnalyticsSources = { payments: [], invoices: [], quotes: [], expenses: [] };

const message = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

/**
 * Loads every business row Analytics needs, once, paging through each table.
 * A source that fails keeps what was on screen and reports its own error, so
 * one bad request doesn't blank the whole tab.
 */
export function useAnalyticsData() {
  const [data, setData] = useState<AnalyticsSources>(EMPTY);
  const [errors, setErrors] = useState<SourceErrors>({});
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const active = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [payments, invoices, quotes, expenses] = await Promise.allSettled([
      getPayments(),
      getInvoices(),
      quoteAdmin<{ quotes: QuoteSummary[] }>("list").then((r) => r.quotes ?? []),
      getExpenses(),
    ]);
    if (!active.current) return;
    const next: SourceErrors = {};
    if (payments.status === "rejected")
      next.payments = message(payments.reason, "Couldn't load payments.");
    if (invoices.status === "rejected")
      next.invoices = message(invoices.reason, "Couldn't load invoices.");
    if (quotes.status === "rejected") next.quotes = message(quotes.reason, "Couldn't load quotes.");
    if (expenses.status === "rejected")
      next.expenses = message(expenses.reason, "Couldn't load expenses.");
    setData((prev) => ({
      payments: payments.status === "fulfilled" ? payments.value : prev.payments,
      invoices: invoices.status === "fulfilled" ? invoices.value : prev.invoices,
      quotes: quotes.status === "fulfilled" ? quotes.value : prev.quotes,
      expenses: expenses.status === "fulfilled" ? expenses.value : prev.expenses,
    }));
    setErrors(next);
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

  return { data, errors, loading, updatedAt, refresh: load, setExpenses };
}
