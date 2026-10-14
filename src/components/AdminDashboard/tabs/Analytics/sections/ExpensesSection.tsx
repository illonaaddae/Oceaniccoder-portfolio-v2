import type React from "react";
import { useMemo } from "react";
import type { Expense } from "@/types";
import { formatMoney } from "../../shared/money";
import { ShareList } from "../BreakdownTable";
import { ChartCard, TableDisclosure } from "../ChartCard";
import { ExpenseLog } from "../ExpenseLog";
import { formatDay, toApproxGHS } from "../metrics/format";
import { dayOf, type Bucket, type DateRange } from "../metrics/range";
import {
  EXPENSE_CATEGORY_LABELS,
  expenseSeries,
  expensesByCategory,
  expensesIn,
  largestExpenses,
  unitCurrency,
  type MoneyUnit,
} from "../metrics/revenue";

const muted: React.CSSProperties = { color: "var(--text-secondary)" };
const strong: React.CSSProperties = { color: "var(--text-primary)" };
const headCell = "py-2 pr-3 text-left text-xs font-semibold uppercase";

interface ExpensesSectionProps {
  expenses: Expense[];
  setExpenses: (update: (prev: Expense[]) => Expense[]) => void;
  range: DateRange;
  bucket: Bucket;
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
  bucket,
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
  const money = (amount: number) => `${approx ? "≈ " : ""}${formatMoney(amount, currency)}`;

  const categories = useMemo(
    () => expensesByCategory(expensesIn(expenses, range), unit),
    [expenses, range, unit],
  );
  const largest = useMemo(() => largestExpenses(expenses, range), [expenses, range]);
  const series = useMemo(
    () => expenseSeries(expenses, range, unit, bucket),
    [expenses, range, unit, bucket],
  );

  const table = (
    <table className="w-full text-sm">
      <caption className="sr-only">
        Expenses per {bucket}, {unitLabel}
      </caption>
      <thead>
        <tr className="border-b" style={{ borderColor: "var(--analytics-line)" }}>
          <th scope="col" className={headCell} style={muted}>
            Period
          </th>
          <th scope="col" className={`${headCell} text-right`} style={muted}>
            Expenses
          </th>
          <th scope="col" className={`${headCell} text-right`} style={muted}>
            Previous period
          </th>
        </tr>
      </thead>
      <tbody>
        {series.map((p) => (
          <tr key={p.key} className="border-b" style={{ borderColor: "var(--analytics-line)" }}>
            <th scope="row" className="py-2 pr-3 text-left font-medium" style={strong}>
              {p.label}
            </th>
            <td className="py-2 pr-3 text-right tabular-nums" style={strong}>
              {money(p.amount)}
            </td>
            <td className="py-2 pr-3 text-right tabular-nums" style={muted}>
              {money(p.previous)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="grid min-w-0 lg:col-span-2">
          <ChartCard
            title="Where the money went"
            description={`By category, ${unitLabel}`}
            loading={waiting}
            error={failed}
            footer={
              <TableDisclosure summary={`Show expenses per ${bucket} as a table`}>
                {table}
              </TableDisclosure>
            }
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
                    <span
                      className="block text-sm font-bold [overflow-wrap:anywhere] sm:truncate"
                      style={strong}
                    >
                      {e.description}
                    </span>
                    <span className="block text-xs" style={muted}>
                      {EXPENSE_CATEGORY_LABELS[e.category] ?? e.category} ·{" "}
                      {formatDay(dayOf(e.date) ?? "")}
                    </span>
                  </span>
                  <span className="whitespace-nowrap text-sm font-bold tabular-nums" style={strong}>
                    {formatMoney(Number(e.amount) || 0, e.currency)}
                    {/* Ranked by its raw amount: there's no rate to compare it at. */}
                    {toApproxGHS(Number(e.amount) || 0, e.currency) === null && (
                      <span className="block text-xs font-medium" style={muted}>
                        (unconverted)
                      </span>
                    )}
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
