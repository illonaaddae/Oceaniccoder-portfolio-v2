// Where the money went in a month: living costs by category against the plan,
// money paid out of funds kept apart, the last six months, and the biggest
// single costs.
import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  activeBudget,
  addMonths,
  currentMonth,
  livingCostsByMonth,
  monthOf,
  paidFromFunds,
  spendingByCategory,
  type CategorySpend,
} from "@/utils/finance/ledger";
import type { FinanceState } from "./useFinance";
import { TxnForm } from "./TransactionsView";
import { Button, Card, MonthField, cedis, monthLabel, muted, strong } from "./ui";

const OVER: React.CSSProperties = { color: "var(--status-failed-text)" };

function CategoryRow({ row, total }: { row: CategorySpend; total: number }) {
  const over = row.plannedMinor > 0 && row.spentMinor > row.plannedMinor;
  // Against its plan when it has one, otherwise as a share of all spending.
  const base = row.plannedMinor > 0 ? row.plannedMinor : total;
  const pct = base > 0 ? Math.min(100, Math.round((row.spentMinor / base) * 100)) : 0;
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold" style={strong}>
          {row.category}
        </span>
        <span className="tabular-nums" style={strong}>
          {cedis(row.spentMinor)}
          <span style={muted}>
            {row.plannedMinor > 0 ? ` of ${cedis(row.plannedMinor)}` : " · not in the plan"}
          </span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${row.category}: ${cedis(row.spentMinor)}${
          row.plannedMinor > 0 ? ` of ${cedis(row.plannedMinor)} planned` : ""
        }`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="mt-1.5 h-2 w-full overflow-hidden rounded-full"
        style={{ background: "var(--analytics-line)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: over ? "var(--status-failed-text)" : "var(--analytics-accent)",
          }}
        />
      </div>
      {over ? (
        <p className="mt-1 text-xs font-semibold" style={OVER}>
          {cedis(row.spentMinor - row.plannedMinor)} over
        </p>
      ) : (
        row.plannedMinor > 0 && (
          <p className="mt-1 text-xs" style={muted}>
            {cedis(row.plannedMinor - row.spentMinor)} left
          </p>
        )
      )}
    </li>
  );
}

function HeroFigure({
  label,
  value,
  note,
  chip,
}: {
  label: string;
  value: string;
  note?: string;
  chip?: { text: string; tone: "good" | "bad" };
}) {
  return (
    <div className="analytics-hero__fig">
      <h3 className="text-sm font-semibold">{label}</h3>
      <p className="text-2xl font-bold tabular-nums" style={strong}>
        {value}
      </p>
      {chip && (
        <span className="analytics-chip justify-self-start tabular-nums" data-tone={chip.tone}>
          {chip.text}
        </span>
      )}
      {note && (
        <p className="text-xs" style={muted}>
          {note}
        </p>
      )}
    </div>
  );
}

export function SpendingView({ state }: { state: FinanceState }) {
  const [month, setMonth] = useState(currentMonth());
  const [adding, setAdding] = useState(false);
  const { txns, funds, budgets } = state.data;

  const view = useMemo(() => {
    const budget = activeBudget(budgets, month);
    const categories = spendingByCategory(txns, budget, month);
    const spent = categories.reduce((acc, r) => acc + r.spentMinor, 0);
    const planned = categories.reduce((acc, r) => acc + r.plannedMinor, 0);
    const history = livingCostsByMonth(txns, budgets, month, 6);
    const lastMonth = history[history.length - 2]?.spentMinor ?? 0;
    return {
      categories,
      spent,
      planned,
      lastMonth,
      history,
      fromFunds: paidFromFunds(txns, funds, month),
      biggest: txns
        .filter((t) => t.type === "expense" && monthOf(t.date) === month)
        .sort((a, b) => b.amountMinor - a.amountMinor)
        .slice(0, 5),
    };
  }, [budgets, funds, month, txns]);

  const left = view.planned - view.spent;
  const change = view.spent - view.lastMonth;
  const chartData = view.history.map((h) => ({
    label: monthLabel(h.month),
    spent: h.spentMinor / 100,
    planned: h.plannedMinor > 0 ? h.plannedMinor / 100 : null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-60">
          <MonthField label="Month" value={month} onChange={(v) => v && setMonth(v)} />
        </div>
        {!adding && (
          <Button variant="primary" onClick={() => setAdding(true)}>
            Record spending
          </Button>
        )}
      </div>
      {adding && (
        <Card title="Record spending">
          <TxnForm state={state} onDone={() => setAdding(false)} />
        </Card>
      )}

      <div className="analytics-hero">
        <div className="analytics-hero__grid">
          <HeroFigure
            label={`Living costs in ${monthLabel(month)}`}
            value={cedis(view.spent)}
            note="Spending only. Savings and money paid from funds are left out."
          />
          <HeroFigure
            label="Living budget"
            value={view.planned > 0 ? cedis(view.planned) : "No plan"}
            note={view.planned > 0 ? "From your Budget" : "Set one under Budget"}
          />
          <HeroFigure
            label={left < 0 ? "Over budget by" : "Left to spend"}
            value={view.planned > 0 ? cedis(Math.abs(left)) : "No plan"}
            chip={
              view.planned > 0
                ? left < 0
                  ? { text: "Over", tone: "bad" }
                  : { text: "Within plan", tone: "good" }
                : undefined
            }
          />
          <HeroFigure
            label={`Against ${monthLabel(addMonths(month, -1))}`}
            value={`${change > 0 ? "+" : change < 0 ? "−" : ""}${cedis(Math.abs(change))}`}
            chip={
              change === 0
                ? undefined
                : change > 0
                  ? { text: "More spent", tone: "bad" }
                  : { text: "Less spent", tone: "good" }
            }
            note={`${cedis(view.lastMonth)} last month`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Where it went">
          {view.categories.length === 0 ? (
            <p className="text-sm" style={muted}>
              No spending recorded in {monthLabel(month)}, and no plan to compare with yet.
            </p>
          ) : (
            <>
              {view.spent === 0 && (
                <p className="mb-3 text-sm" style={muted}>
                  Nothing recorded yet this month. Use Record spending as it happens, or once a
                  week.
                </p>
              )}
              <ul className="divide-y divide-[var(--analytics-line)]">
                {view.categories.map((r) => (
                  <CategoryRow key={r.category} row={r} total={view.spent} />
                ))}
              </ul>
            </>
          )}
        </Card>

        <div className="space-y-4">
          <Card title="Biggest costs">
            {view.biggest.length === 0 ? (
              <p className="text-sm" style={muted}>
                None yet.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {view.biggest.map((t) => (
                  <li key={t.id} className="flex justify-between gap-3">
                    <span className="min-w-0" style={strong}>
                      {t.note || t.category}
                      <span style={muted}>
                        {" "}
                        · {t.category} · {t.date}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums font-semibold" style={strong}>
                      {cedis(t.amountMinor)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Paid from savings">
            {view.fromFunds.length === 0 ? (
              <p className="text-sm" style={muted}>
                Nothing paid out of a fund in {monthLabel(month)}.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {view.fromFunds.map((f) => (
                  <li key={f.fundId} className="flex justify-between gap-3">
                    <span style={strong}>{f.name}</span>
                    <span className="tabular-nums font-semibold" style={strong}>
                      {cedis(f.spentMinor)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs" style={muted}>
              Money you saved up for this, like rent or the laptop. Not counted as living costs.
            </p>
          </Card>
        </div>
      </div>

      <Card title="Last six months">
        <div className="h-64" role="img" aria-label={chartSummary(view.history)}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 24, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--analytics-line)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} width={56} />
              <Tooltip
                formatter={(v: number, name: string) => [
                  cedis(Math.round(v * 100)),
                  name === "spent" ? "Spent" : "Planned",
                ]}
              />
              <Bar
                isAnimationActive={false}
                dataKey="spent"
                fill="var(--analytics-accent)"
                radius={[4, 4, 0, 0]}
              />
              <Line
                isAnimationActive={false}
                type="stepAfter"
                dataKey="planned"
                stroke="var(--text-secondary)"
                strokeDasharray="4 4"
                dot={{ r: 3, fill: "var(--text-secondary)" }}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs" style={muted}>
          Bars are living costs. The dashed line is what the plan allowed.
        </p>
      </Card>
    </div>
  );
}

function chartSummary(history: { month: string; spentMinor: number }[]): string {
  return `Living costs by month: ${history
    .map((h) => `${monthLabel(h.month)} ${cedis(h.spentMinor)}`)
    .join(", ")}.`;
}
