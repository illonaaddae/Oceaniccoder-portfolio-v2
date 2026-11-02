// Pure ledger math for the Finance tab. Balances are derived from transactions
// every time (never stored), mirroring api/shared/finance/model.js, so a
// deposit can only ever be counted once.
import type { Budget, BudgetLine, Fund, FundGroup, Txn } from "@/types/finance";

export const WEALTH_GROUP: FundGroup = "wealth";

/** "2026-11-05" → "2026-11". */
export const monthOf = (date: string) => date.slice(0, 7);

/** The local calendar month, "YYYY-MM". */
export function currentMonth(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** The local date, "YYYY-MM-DD". */
export function today(now = new Date()): string {
  return `${currentMonth(now)}-${String(now.getDate()).padStart(2, "0")}`;
}

/** "2026-11" + 3 → "2027-02". */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** Whole months from `from` to `to` ("2026-11" → "2027-01" is 2). */
export function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return ty * 12 + tm - (fy * 12 + fm);
}

/** How a transaction changes each fund it touches. */
function fundDeltas(t: Txn): [string, number][] {
  switch (t.type) {
    case "deposit":
    case "opening":
      return [[t.fundId, t.amountMinor]];
    case "withdrawal":
    case "fund_spend":
      return [[t.fundId, -t.amountMinor]];
    case "transfer":
      return [
        [t.fundId, -t.amountMinor],
        [t.toFundId, t.amountMinor],
      ];
    default:
      return [];
  }
}

export function fundBalances(txns: Txn[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const t of txns)
    for (const [fundId, delta] of fundDeltas(t)) out.set(fundId, (out.get(fundId) ?? 0) + delta);
  return out;
}

/**
 * Money recorded as in hand: income minus spending, minus what went into
 * funds, plus what came back out. Opening balances, transfers and spending
 * straight from a fund don't touch cash.
 */
export function cashBalance(txns: Txn[]): number {
  let cash = 0;
  for (const t of txns) {
    if (t.type === "income" || t.type === "withdrawal") cash += t.amountMinor;
    else if (t.type === "expense" || t.type === "deposit") cash -= t.amountMinor;
  }
  return cash;
}

const inMonth = (txns: Txn[], month: string) => txns.filter((t) => monthOf(t.date) === month);

/**
 * Net money that went into the given funds in a month from outside them:
 * deposits in, withdrawals and spending out, and transfers counted only when
 * they cross the group's edge (a transfer between two wealth funds is not new
 * saving). Opening balances are history, not saving, so they are left out.
 */
export function netSavedInto(txns: Txn[], fundIds: Set<string>, month: string): number {
  let net = 0;
  for (const t of inMonth(txns, month)) {
    const from = fundIds.has(t.fundId);
    if (t.type === "deposit" && from) net += t.amountMinor;
    else if ((t.type === "withdrawal" || t.type === "fund_spend") && from) net -= t.amountMinor;
    else if (t.type === "transfer") {
      const to = fundIds.has(t.toFundId);
      if (to && !from) net += t.amountMinor;
      if (from && !to) net -= t.amountMinor;
    }
  }
  return net;
}

/**
 * Money put into the given funds in a month, as a contribution: like
 * netSavedInto, but paying for something from the fund (rent from the rent
 * fund, the laptop from its goal) is the fund doing its job, not un-saving, so
 * it is left out. Used for plan-vs-actual and goal projections.
 */
export function contributedInto(txns: Txn[], fundIds: Set<string>, month: string): number {
  return netSavedInto(
    txns.filter((t) => t.type !== "fund_spend"),
    fundIds,
    month,
  );
}

export function idsOf(funds: Fund[], group?: FundGroup): Set<string> {
  return new Set(funds.filter((f) => !group || f.group === group).map((f) => f.id));
}

export interface MonthSummary {
  income: number;
  /** Living costs: expenses only. Money paid out of funds is in paidFromFunds. */
  spent: number;
  savedToWealth: number;
  /** Personal wealth saved as a share of income, 0 to 1; null with no income. */
  savingsRate: number | null;
}

export function monthSummary(txns: Txn[], funds: Fund[], month: string): MonthSummary {
  const rows = inMonth(txns, month);
  const sum = (pred: (t: Txn) => boolean) =>
    rows.filter(pred).reduce((acc, t) => acc + t.amountMinor, 0);
  const income = sum((t) => t.type === "income");
  const savedToWealth = netSavedInto(txns, idsOf(funds, WEALTH_GROUP), month);
  return {
    income,
    spent: sum((t) => t.type === "expense"),
    savedToWealth,
    savingsRate: income > 0 ? savedToWealth / income : null,
  };
}

/** The plan in force for a month: the latest one starting on or before it. */
export function activeBudget(budgets: Budget[], month: string): Budget | null {
  return (
    budgets.filter((b) => b.month <= month).sort((a, b) => b.month.localeCompare(a.month))[0] ??
    null
  );
}

/** The category an expense counts under; one without a category is "Other". */
const categoryOf = (t: Txn) => t.category || "Other";

/**
 * What actually happened against one budget line in a month. A saving line
 * counts money put into its fund; a spending line counts expenses filed under
 * the same category as the line's label, the same figure the Spending view
 * shows. Money paid out of a fund is not a living cost, so it never counts.
 */
export function lineActual(line: BudgetLine, txns: Txn[], month: string): number {
  if (line.fundId) return contributedInto(txns, new Set([line.fundId]), month);
  return inMonth(txns, month)
    .filter((t) => t.type === "expense" && categoryOf(t) === line.label)
    .reduce((acc, t) => acc + t.amountMinor, 0);
}

/** Monthly essentials from a plan: every line that isn't a saving. */
export function essentialsOf(budget: Budget | null): number {
  if (!budget) return 0;
  return budget.lines.filter((l) => !l.fundId).reduce((acc, l) => acc + l.amountMinor, 0);
}

/** Planned monthly saving into the given funds, from the budget's lines. */
export function plannedInto(budget: Budget | null, fundIds: Set<string>): number {
  if (!budget) return 0;
  return budget.lines
    .filter((l) => l.fundId && fundIds.has(l.fundId))
    .reduce((acc, l) => acc + l.amountMinor, 0);
}

/**
 * Consecutive months, counting back from `month`, in which net saving into the
 * wealth funds met the plan for that month. The current month only counts once
 * it is met, so the streak never drops just because the month isn't over.
 */
export function wealthStreak(txns: Txn[], funds: Fund[], budgets: Budget[], month: string): number {
  const wealth = idsOf(funds, WEALTH_GROUP);
  const met = (m: string) => {
    const planned = plannedInto(activeBudget(budgets, m), wealth);
    return planned > 0 && netSavedInto(txns, wealth, m) >= planned;
  };
  let streak = 0;
  let m = met(month) ? month : addMonths(month, -1);
  const earliest = txns.reduce((min, t) => (monthOf(t.date) < min ? monthOf(t.date) : min), month);
  while (m >= earliest && met(m)) {
    streak += 1;
    m = addMonths(m, -1);
  }
  return streak;
}

/** A monthly amount spread over a year, per day (400 a month is about 13.15 a day). */
export function dailyEquivalent(monthlyMinor: number): number {
  return Math.round((monthlyMinor * 12) / 365);
}

export interface CategorySpend {
  category: string;
  spentMinor: number;
  /** What the month's plan allows for it; 0 when the plan has no such line. */
  plannedMinor: number;
}

/**
 * Living costs in a month by category, biggest first, next to the plan.
 * Every spending line of the plan is listed, even with nothing spent, so an
 * untouched budget still shows. Money paid out of a fund is left out: that is
 * saving being used for what it was for, not overspending (see paidFromFunds).
 */
export function spendingByCategory(
  txns: Txn[],
  budget: Budget | null,
  month: string,
): CategorySpend[] {
  const rows = new Map<string, CategorySpend>();
  const row = (category: string) => {
    const existing = rows.get(category);
    if (existing) return existing;
    const created = { category, spentMinor: 0, plannedMinor: 0 };
    rows.set(category, created);
    return created;
  };
  for (const line of budget?.lines ?? []) {
    if (!line.fundId) row(line.label).plannedMinor += line.amountMinor;
  }
  for (const t of inMonth(txns, month)) {
    if (t.type === "expense") row(categoryOf(t)).spentMinor += t.amountMinor;
  }
  return [...rows.values()].sort(
    (a, b) => b.spentMinor - a.spentMinor || b.plannedMinor - a.plannedMinor,
  );
}

/** Money spent out of funds in a month (rent paid, the laptop bought), by fund, biggest first. */
export function paidFromFunds(
  txns: Txn[],
  funds: Fund[],
  month: string,
): { fundId: string; name: string; spentMinor: number }[] {
  const byFund = new Map<string, number>();
  for (const t of inMonth(txns, month)) {
    if (t.type === "fund_spend") byFund.set(t.fundId, (byFund.get(t.fundId) ?? 0) + t.amountMinor);
  }
  return [...byFund.entries()]
    .map(([fundId, spentMinor]) => ({
      fundId,
      name: funds.find((f) => f.id === fundId)?.name ?? "A deleted fund",
      spentMinor,
    }))
    .sort((a, b) => b.spentMinor - a.spentMinor);
}

/** Living costs (expenses only) for each of the `count` months ending at `month`, oldest first. */
export function livingCostsByMonth(
  txns: Txn[],
  budgets: Budget[],
  month: string,
  count: number,
): { month: string; spentMinor: number; plannedMinor: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const m = addMonths(month, i - count + 1);
    return {
      month: m,
      spentMinor: inMonth(txns, m)
        .filter((t) => t.type === "expense")
        .reduce((acc, t) => acc + t.amountMinor, 0),
      plannedMinor: essentialsOf(activeBudget(budgets, m)),
    };
  });
}
