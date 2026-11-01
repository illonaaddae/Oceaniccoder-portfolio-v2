import { describe, it, expect } from "vitest";
import type { Budget, Fund, Txn, TxnType } from "@/types/finance";
import {
  activeBudget,
  addMonths,
  cashBalance,
  dailyEquivalent,
  essentialsOf,
  fundBalances,
  lineActual,
  monthSummary,
  monthsBetween,
  netSavedInto,
  wealthStreak,
} from "./ledger";
import { monthsToTarget, neededPerMonth, progress, projectedMonth } from "./projection";

let seq = 0;
const stamp = { scope: "me" as const, createdAt: "", updatedAt: "" };

function fund(id: string, group: Fund["group"]): Fund {
  return {
    ...stamp,
    id,
    kind: "fund",
    name: id,
    group,
    targetMinor: 0,
    targetDate: "",
    monthlyMinor: 0,
    institution: "",
    notes: "",
    archived: false,
    sort: 0,
    items: [],
  };
}

function txn(type: TxnType, date: string, amountMinor: number, extra: Partial<Txn> = {}): Txn {
  seq += 1;
  return {
    ...stamp,
    id: `t${seq}`,
    kind: "txn",
    type,
    date,
    amountMinor,
    fundId: "",
    toFundId: "",
    category: "",
    note: "",
    ...extra,
  };
}

function budget(month: string, lines: Budget["lines"], netIncomeMinor = 0): Budget {
  return { ...stamp, id: `b-${month}`, kind: "budget", month, netIncomeMinor, lines };
}

const funds = [fund("house", "wealth"), fund("travel", "wealth"), fund("laptop", "goal")];

describe("months", () => {
  it("adds and counts months across year ends", () => {
    expect(addMonths("2026-11", 3)).toBe("2027-02");
    expect(addMonths("2027-01", -1)).toBe("2026-12");
    expect(monthsBetween("2026-11", "2027-04")).toBe(5);
  });
});

describe("balances", () => {
  it("derives each fund's balance from its transactions", () => {
    const txns = [
      txn("opening", "2026-11-01", 500, { fundId: "laptop" }),
      txn("deposit", "2026-11-02", 300, { fundId: "laptop" }),
      txn("transfer", "2026-11-03", 100, { fundId: "laptop", toFundId: "house" }),
      txn("fund_spend", "2026-11-04", 50, { fundId: "house" }),
    ];
    const b = fundBalances(txns);
    expect(b.get("laptop")).toBe(700);
    expect(b.get("house")).toBe(50);
  });

  it("counts cash once: deposits leave cash, openings and transfers don't touch it", () => {
    const txns = [
      txn("income", "2026-11-01", 1000),
      txn("expense", "2026-11-02", 200),
      txn("deposit", "2026-11-03", 300, { fundId: "house" }),
      txn("opening", "2026-11-03", 9999, { fundId: "laptop" }),
      txn("transfer", "2026-11-04", 100, { fundId: "laptop", toFundId: "house" }),
      txn("withdrawal", "2026-11-05", 50, { fundId: "house" }),
      txn("fund_spend", "2026-11-06", 40, { fundId: "laptop" }),
    ];
    expect(cashBalance(txns)).toBe(1000 - 200 - 300 + 50);
  });
});

describe("saving", () => {
  const wealth = new Set(["house", "travel"]);

  it("does not count a transfer between two wealth funds as new saving", () => {
    const txns = [
      txn("deposit", "2026-11-01", 400, { fundId: "house" }),
      txn("transfer", "2026-11-02", 100, { fundId: "house", toFundId: "travel" }),
      txn("transfer", "2026-11-03", 60, { fundId: "laptop", toFundId: "travel" }),
      txn("transfer", "2026-11-04", 10, { fundId: "travel", toFundId: "laptop" }),
    ];
    expect(netSavedInto(txns, wealth, "2026-11")).toBe(400 + 60 - 10);
  });

  it("leaves opening balances out of a month's saving", () => {
    const txns = [txn("opening", "2026-11-01", 5000, { fundId: "house" })];
    expect(netSavedInto(txns, wealth, "2026-11")).toBe(0);
  });

  it("works out the savings rate against income recorded that month", () => {
    const txns = [
      txn("income", "2026-11-25", 1000),
      txn("deposit", "2026-11-25", 100, { fundId: "house" }),
      txn("deposit", "2026-11-25", 300, { fundId: "laptop" }),
      txn("expense", "2026-11-26", 200),
    ];
    const s = monthSummary(txns, funds, "2026-11");
    expect(s).toMatchObject({ income: 1000, spent: 200, savedToWealth: 100 });
    expect(s.savingsRate).toBeCloseTo(0.1);
    expect(monthSummary([], funds, "2026-11").savingsRate).toBeNull();
  });

  it("counts a streak of months that met the wealth plan, without breaking on the current month", () => {
    const plan = budget("2026-09", [
      { id: "w", label: "House", amountMinor: 100, fundId: "house" },
    ]);
    const txns = [
      txn("deposit", "2026-09-25", 100, { fundId: "house" }),
      txn("deposit", "2026-10-25", 150, { fundId: "house" }),
    ];
    expect(wealthStreak(txns, funds, [plan], "2026-11")).toBe(2);
    txns.push(txn("deposit", "2026-11-25", 100, { fundId: "house" }));
    expect(wealthStreak(txns, funds, [plan], "2026-11")).toBe(3);
    txns.push(txn("withdrawal", "2026-10-28", 100, { fundId: "house" }));
    expect(wealthStreak(txns, funds, [plan], "2026-11")).toBe(1);
  });

  it("spreads a monthly amount over the days of a year", () => {
    expect(dailyEquivalent(36500)).toBe(1200);
  });
});

describe("budgets", () => {
  const nov = budget("2026-11", [{ id: "a", label: "Food", amountMinor: 100, fundId: "" }]);
  const jan = budget("2027-01", [
    { id: "a", label: "Food", amountMinor: 120, fundId: "" },
    { id: "b", label: "Laptop", amountMinor: 50, fundId: "laptop" },
  ]);

  it("uses the latest plan that has started", () => {
    expect(activeBudget([jan, nov], "2026-12")?.id).toBe(nov.id);
    expect(activeBudget([jan, nov], "2027-03")?.id).toBe(jan.id);
    expect(activeBudget([jan, nov], "2026-10")).toBeNull();
  });

  it("matches spending lines by category and saving lines by fund", () => {
    const txns = [
      txn("expense", "2027-01-03", 30, { category: "Food" }),
      txn("expense", "2027-01-04", 999, { category: "Other" }),
      txn("deposit", "2027-01-25", 50, { fundId: "laptop" }),
    ];
    expect(lineActual(jan.lines[0], txns, "2027-01")).toBe(30);
    expect(lineActual(jan.lines[1], txns, "2027-01")).toBe(50);
    expect(essentialsOf(jan)).toBe(120);
  });
});

describe("projection", () => {
  it("counts the months to a target and the month it lands in", () => {
    expect(monthsToTarget(100, 50, 300)).toBe(4);
    expect(monthsToTarget(300, 50, 300)).toBe(0);
    expect(monthsToTarget(100, 0, 300)).toBeNull();
    expect(projectedMonth(100, 50, 300, "2026-11")).toBe("2027-02");
  });

  it("works out the monthly amount needed by a target date, counting this month", () => {
    expect(neededPerMonth(0, 1200, "2027-04-28", "2026-11")).toBe(200);
    expect(neededPerMonth(0, 1200, "2026-10-01", "2026-11")).toBeNull();
    expect(neededPerMonth(5000, 1200, "2027-04-28", "2026-11")).toBe(0);
  });

  it("clamps progress", () => {
    expect(progress(150, 100)).toBe(1);
    expect(progress(-5, 100)).toBe(0);
    expect(progress(5, 0)).toBe(0);
  });
});
