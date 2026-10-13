import type React from "react";
import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Expense } from "@/types";
import { formatMoney } from "../../shared/money";
import { BreakdownTable } from "../BreakdownTable";
import { CHART_COLORS, ChartCard, axisTick, legendLabel, tooltipStyle } from "../ChartCard";
import { ExpenseLog } from "../ExpenseLog";
import { compactNumber } from "../metrics/format";
import type { Bucket, DateRange } from "../metrics/range";
import {
  expenseSeries,
  expensesByCategory,
  expensesIn,
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
}

/** Spending in the range by period and category, and the expense log. */
export function ExpensesSection({
  expenses,
  setExpenses,
  range,
  bucket,
  unit,
  unitLabel,
  loading,
  error,
}: ExpensesSectionProps) {
  const failed = error ? `Expenses couldn't load: ${error}` : null;
  const currency = unitCurrency(unit);
  const approx = unit.kind === "approx";
  const money = (amount: number) => `${approx ? "≈ " : ""}${formatMoney(amount, currency)}`;

  const series = useMemo(
    () => expenseSeries(expenses, range, unit, bucket),
    [expenses, range, unit, bucket],
  );
  const categories = useMemo(
    () => expensesByCategory(expensesIn(expenses, range), unit),
    [expenses, range, unit],
  );
  const hasSpend = series.some((p) => p.amount > 0 || p.previous > 0);

  const table = (
    <table className="w-full text-sm">
      <caption className="sr-only">Expenses per period, {unitLabel}</caption>
      <thead>
        <tr className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
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
          <tr key={p.key} className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Expenses over time"
          description={`Expenses per ${bucket} by their date, in ${unitLabel}. The dashed line is the same slot of the previous period.`}
          loading={loading && expenses.length === 0}
          error={failed}
          empty={hasSpend ? null : `No expenses in ${unitLabel} in this range or the one before.`}
          table={table}
        >
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                minTickGap={12}
              />
              <YAxis
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(v: number) => compactNumber(v)}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: "var(--accent-teal-subtle)" }}
                formatter={(value, name) => [money(Number(value) || 0), String(name)]}
              />
              <Legend formatter={legendLabel} />
              <Bar
                dataKey="amount"
                name="Expenses"
                fill={CHART_COLORS.primary}
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
              <Line
                dataKey="previous"
                name="Previous period"
                // Straight segments: a smoothed curve draws bumps between periods that look like data.
                type="linear"
                stroke={CHART_COLORS.previous}
                strokeDasharray="5 4"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard
          title="By category"
          description={`Expenses in the range by category, in ${unitLabel}.`}
          loading={loading && expenses.length === 0}
          error={failed}
        >
          <BreakdownTable
            caption="Expenses by category"
            keyHeader="Category"
            rows={categories}
            currency={currency}
            approx={approx}
            empty="No expenses in this range."
          />
        </ChartCard>
      </div>
      <ExpenseLog expenses={expenses} setExpenses={setExpenses} loadFailed={Boolean(error)} />
    </div>
  );
}
