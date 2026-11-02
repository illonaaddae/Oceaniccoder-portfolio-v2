import { useMemo } from "react";
import type { Fund, FundGroup } from "@/types/finance";
import {
  activeBudget,
  contributedInto,
  currentMonth,
  dailyEquivalent,
  essentialsOf,
  idsOf,
  monthSummary,
  plannedInto,
  wealthStreak,
} from "@/utils/finance/ledger";
import { progress, projectedMonth, shortfallByDate } from "@/utils/finance/projection";
import type { FinanceState } from "./useFinance";
import { Card, ProgressBar, Stat, cedis, monthLabel, muted, strong } from "./ui";

function FundLine({
  fund,
  balance,
  month,
  savedThisMonth,
}: {
  fund: Fund;
  balance: number;
  month: string;
  savedThisMonth: number;
}) {
  const reach =
    fund.targetMinor > 0
      ? projectedMonth(balance, fund.monthlyMinor, fund.targetMinor, month, savedThisMonth)
      : null;
  const short = shortfallByDate(
    balance,
    fund.monthlyMinor,
    fund.targetMinor,
    fund.targetDate,
    month,
    savedThisMonth,
  );
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold" style={strong}>
          {fund.name}
        </span>
        <span className="tabular-nums font-semibold" style={strong}>
          {cedis(balance)}
          {fund.targetMinor > 0 && (
            <span className="font-normal" style={muted}>
              {" "}
              of {cedis(fund.targetMinor)}
            </span>
          )}
        </span>
      </div>
      {fund.targetMinor > 0 && (
        <div className="mt-2">
          <ProgressBar
            value={progress(balance, fund.targetMinor)}
            label={`${fund.name} progress`}
          />
          <p className="mt-1 text-xs" style={muted}>
            {balance >= fund.targetMinor
              ? "Target reached"
              : reach
                ? `At ${cedis(fund.monthlyMinor)} a month: ${monthLabel(reach)}`
                : "No monthly amount set, so no finish date"}
          </p>
          {short !== null && short > 0 && (
            <p
              className="mt-0.5 text-xs font-semibold"
              style={{ color: "var(--status-pending-text)" }}
            >
              {cedis(short)} short by {fund.targetDate} at this pace
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function FundGroupCard({
  title,
  groups,
  state,
  month,
  empty,
}: {
  title: string;
  groups: FundGroup[];
  state: FinanceState;
  month: string;
  empty: string;
}) {
  const funds = state.activeFunds.filter((f) => groups.includes(f.group));
  const total = funds.reduce((acc, f) => acc + (state.balances.get(f.id) ?? 0), 0);
  return (
    <Card
      title={title}
      action={
        <span className="text-sm font-bold tabular-nums" style={strong}>
          {cedis(total)}
        </span>
      }
    >
      {funds.length === 0 ? (
        <p className="text-sm" style={muted}>
          {empty}
        </p>
      ) : (
        <ul className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
          {funds.map((f) => (
            <FundLine
              key={f.id}
              fund={f}
              balance={state.balances.get(f.id) ?? 0}
              month={month}
              savedThisMonth={contributedInto(state.data.txns, new Set([f.id]), month)}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

function HeroFigure({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="analytics-hero__fig">
      <h3 className="text-sm font-semibold">{label}</h3>
      <p className="text-2xl font-bold tabular-nums" style={strong}>
        {value}
      </p>
      {note && (
        <p className="text-xs" style={muted}>
          {note}
        </p>
      )}
    </div>
  );
}

export function OverviewView({ state }: { state: FinanceState }) {
  const month = currentMonth();
  const { funds, txns, budgets, expected } = state.data;

  const view = useMemo(() => {
    const budget = activeBudget(budgets, month);
    const wealthIds = idsOf(funds, "wealth");
    const wealthTotal = [...wealthIds].reduce((acc, id) => acc + (state.balances.get(id) ?? 0), 0);
    const plannedWealth = plannedInto(budget, wealthIds);
    const emergency = [...idsOf(funds, "emergency")].reduce(
      (acc, id) => acc + (state.balances.get(id) ?? 0),
      0,
    );
    const essentials = essentialsOf(budget);
    return {
      budget,
      wealthTotal,
      plannedWealth,
      emergency,
      essentials,
      summary: monthSummary(txns, funds, month),
      streak: wealthStreak(txns, funds, budgets, month),
      pending: expected
        .filter((e) => e.status === "expected")
        .sort((a, b) => (a.expectedDate || "9").localeCompare(b.expectedDate || "9")),
    };
  }, [budgets, expected, funds, month, state.balances, txns]);

  const { summary } = view;
  const rate =
    summary.savingsRate === null
      ? "No income recorded"
      : `${Math.round(summary.savingsRate * 100)}%`;

  return (
    <div className="space-y-6">
      {/* The headline figures sit on the Analytics ocean band. */}
      <div className="analytics-hero">
        <div className="analytics-hero__grid">
          <HeroFigure
            label="Personal wealth"
            value={cedis(view.wealthTotal)}
            note={view.streak > 0 ? `${view.streak}-month saving streak` : "Saved, never spent"}
          />
          <HeroFigure
            label={`Saved to wealth in ${monthLabel(month)}`}
            value={cedis(summary.savedToWealth)}
            note={
              view.plannedWealth > 0
                ? `Plan ${cedis(view.plannedWealth)}, about ${cedis(dailyEquivalent(view.plannedWealth))} a day`
                : view.budget
                  ? "Your budget saves nothing into wealth"
                  : "Set a budget to see the plan"
            }
          />
          <HeroFigure
            label="Emergency fund"
            value={cedis(view.emergency)}
            note={
              view.essentials > 0
                ? `Covers ${(view.emergency / view.essentials).toFixed(1)} months of essentials`
                : undefined
            }
          />
          <HeroFigure
            label="Cash on hand"
            value={cedis(state.cash)}
            note="Income recorded, minus spending and savings"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={`Income in ${monthLabel(month)}`}
          value={cedis(summary.income)}
          note="Received only"
        />
        <Stat
          label={`Living costs in ${monthLabel(month)}`}
          value={cedis(summary.spent)}
          note="Spending only, not money paid from funds"
        />
        <Stat label="Wealth savings rate" value={rate} note="Wealth saved ÷ income this month" />
        <Stat
          label="Take-home in plan"
          value={view.budget ? cedis(view.budget.netIncomeMinor) : "No plan"}
          note={view.budget ? `Plan from ${monthLabel(view.budget.month)}` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FundGroupCard
          title="Wealth being built"
          groups={["wealth"]}
          state={state}
          month={month}
          empty="Add a wealth fund under Funds."
        />
        <FundGroupCard
          title="Reserved for upcoming spending"
          groups={["rent", "goal"]}
          state={state}
          month={month}
          empty="Add rent and goal funds under Funds."
        />
        <FundGroupCard
          title="Emergency"
          groups={["emergency"]}
          state={state}
          month={month}
          empty="Add an emergency fund under Funds."
        />
        <Card title="Expected, not counted yet">
          {view.pending.length === 0 ? (
            <p className="text-sm" style={muted}>
              Nothing expected.
            </p>
          ) : (
            <ul className="space-y-2">
              {view.pending.map((e) => (
                <li key={e.id} className="flex flex-wrap justify-between gap-2 text-sm">
                  <span style={strong}>
                    {e.source}
                    {e.expectedDate && <span style={muted}> · {e.expectedDate}</span>}
                  </span>
                  <span className="tabular-nums" style={muted}>
                    {cedis(e.amountMinor)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
