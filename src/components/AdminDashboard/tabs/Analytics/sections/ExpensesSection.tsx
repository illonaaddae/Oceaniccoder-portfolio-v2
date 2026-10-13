import type React from "react";
import { useMemo } from "react";
import type { Expense } from "@/types";
import { formatMoney } from "../../shared/money";
import { ShareList } from "../BreakdownTable";
import { ChartCard } from "../ChartCard";
import { ExpenseLog } from "../ExpenseLog";
import { formatDay } from "../metrics/format";
import { dayOf, type DateRange } from "../metrics/range";
import {
  EXPENSE_CATEGORY_LABELS,
  expensesByCategory,
  expensesIn,
  largestExpenses,
  unitCurrency,
  type MoneyUnit,
} from "../metrics/revenue";

const muted: React.CSSProperties = { color: "var(--text-secondary)" };
const strong: React.CSSProperties = { color: "var(--text-primary)" };

interface ExpensesSectionProps {
  expenses: Expense[];
  setExpenses: (update: (prev: Expense[]) => Expense[]) => void;
  range: DateRange;
  unit: MoneyUnit;
  unitLabel: string;
  loading: boolean;
  /** Set when the expenses couldn't be read. */
  error?: string;
  theme: "light" | "dark";
}

/** Spending in the range by category, the largest items, and the expense log. */
export function ExpensesSection({
  expenses,
  setExpenses,
  range,
  unit,
  unitLabel,
  loading,
  error,
  theme,
}: ExpensesSectionProps) {
  const failed = error ? `Expenses couldn't load: ${error}` : null;
  const currency = unitCurrency(unit);
  const approx = unit.kind === "approx";
  const waiting = loading && expenses.length === 0;

  const categories = useMemo(
    () => expensesByCategory(expensesIn(expenses, range), unit),
    [expenses, range, unit],
  );
  const largest = useMemo(() => largestExpenses(expenses, range), [expenses, range]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="grid min-w-0 lg:col-span-2">
          <ChartCard
            title="Where the money went"
            description={`By category, ${unitLabel}`}
            loading={waiting}
            error={failed}
          >
            <ShareList
              rows={categories}
              currency={currency}
              approx={approx}
              noun={["expense", "expenses"]}
              empty="No expenses in this range."
            />
          </ChartCard>
        </div>
        <ChartCard
          title="Largest this range"
          description="Each in its own currency. Full log below."
          loading={waiting}
          error={failed}
        >
          {largest.length === 0 ? (
            <p className="text-sm" style={muted}>
              No expenses in this range.
            </p>
          ) : (
            <ul className="grid gap-3">
              {largest.map((e) => (
                <li key={e.$id} className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold" style={strong}>
                      {e.description}
                    </span>
                    <span className="block text-xs" style={muted}>
                      {EXPENSE_CATEGORY_LABELS[e.category] ?? e.category} ·{" "}
                      {formatDay(dayOf(e.date) ?? "")}
                    </span>
                  </span>
                  <span className="whitespace-nowrap text-sm font-bold tabular-nums" style={strong}>
                    {formatMoney(Number(e.amount) || 0, e.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>
      <ExpenseLog
        expenses={expenses}
        setExpenses={setExpenses}
        loadFailed={Boolean(error)}
        theme={theme}
      />
    </div>
  );
}
