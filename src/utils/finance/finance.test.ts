import { describe, it, expect } from "vitest";
import type { Budget, Fund, Txn, TxnType } from "@/types/finance";
import {
  activeBudget,
  addMonths,
  contributedInto,
  cashBalance,
  dailyEquivalent,
  essentialsOf,
  fundBalances,
  lineActual,
  livingCostsByMonth,
  monthSummary,
  monthsBetween,
  netSavedInto,
  paidFromFunds,
  spendingByCategory,
  wealthStreak,
} from "./ledger";
import {
  contributionSeries,
  monthsToTarget,
  neededPerMonth,
  progress,
  projectedMonth,
  shortfallByDate,
} from "./projection";

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

describe("one definition of spent", () => {
  it("gives a spending line the same figure in the Budget and Spending views", () => {
    const plan = budget("2027-01", [
      { id: "f", label: "Food", amountMinor: 500, fundId: "" },
      { id: "o", label: "Other", amountMinor: 100, fundId: "" },
    ]);
    const txns = [
      txn("expense", "2027-01-03", 30, { category: "Food" }),
      txn("expense", "2027-01-04", 20, { category: "" }),
      // Paid from a fund but filed under a spending category: not a living cost.
      txn("fund_spend", "2027-01-05", 400, { fundId: "laptop", category: "Food" }),
    ];
    const spending = spendingByCategory(txns, plan, "2027-01");
    for (const line of plan.lines)
      expect(lineActual(line, txns, "2027-01")).toBe(
        spending.find((r) => r.category === line.label)?.spentMinor,
      );
    expect(lineActual(plan.lines[0], txns, "2027-01")).toBe(30);
    expect(lineActual(plan.lines[1], txns, "2027-01")).toBe(20);
    expect(monthSummary(txns, funds, "2027-01").spent).toBe(50);
  });
});

describe("projection", () => {
  it("counts the months to a target and the month it lands in", () => {
    expect(monthsToTarget(100, 50, 300)).toBe(4);
    expect(monthsToTarget(300, 50, 300)).toBe(0);
    expect(monthsToTarget(100, 0, 300)).toBeNull();
    expect(projectedMonth(100, 50, 300, "2026-11")).toBe("2027-02");
  });

  it("works out the monthly amount needed, counting this month but not the target month", () => {
    // Nov to Mar: five contributions before an April date.
    expect(neededPerMonth(0, 1200, "2027-04-28", "2026-11")).toBe(240);
    // Due this month: everything still missing is needed now.
    expect(neededPerMonth(300, 1200, "2026-11-30", "2026-11")).toBe(900);
    expect(neededPerMonth(0, 1200, "2026-10-01", "2026-11")).toBeNull();
    expect(neededPerMonth(5000, 1200, "2027-04-28", "2026-11")).toBe(0);
  });

  it("clamps progress", () => {
    expect(progress(150, 100)).toBe(1);
    expect(progress(-5, 100)).toBe(0);
    expect(progress(5, 0)).toBe(0);
  });
});

describe("shortfall by date", () => {
  it("never counts on a contribution in the due month itself", () => {
    // Rent due early January: only the November and December savings arrive in time.
    expect(shortfallByDate(450, 100, 1000, "2027-01-01", "2026-11")).toBe(350);
    expect(shortfallByDate(450, 300, 1000, "2027-01-01", "2026-11")).toBe(0);
    expect(shortfallByDate(450, 100, 1000, "", "2026-11")).toBeNull();
    expect(shortfallByDate(450, 100, 1000, "2026-10-01", "2026-11")).toBeNull();
  });
});

describe("this month's deposit is never counted twice", () => {
  // November, rent of 1,000 due 1 January, 100 a month, 450 held before November's deposit.
  it("gives the same shortfall before and after the November deposit", () => {
    expect(shortfallByDate(450, 100, 1000, "2027-01-01", "2026-11", 0)).toBe(350);
    expect(shortfallByDate(550, 100, 1000, "2027-01-01", "2026-11", 100)).toBe(350);
  });

  it("asks December to cover everything once November is funded", () => {
    expect(neededPerMonth(550, 1000, "2027-01-01", "2026-11", 100)).toBe(450);
  });

  it("doesn't move the finish month earlier after an on-time deposit", () => {
    expect(projectedMonth(0, 100, 300, "2026-11", 0)).toBe("2027-01");
    expect(projectedMonth(100, 100, 300, "2026-11", 100)).toBe("2027-01");
    expect(contributionSeries(100, 100, 2, 100)).toEqual([100, 100, 200]);
  });
});

describe("paying from a fund is not un-saving", () => {
  it("keeps a rent line's actual at what was put in, even in the month rent is paid", () => {
    const txns = [
      txn("deposit", "2027-01-25", 1000, { fundId: "rent" }),
      txn("fund_spend", "2027-01-26", 12000, { fundId: "rent" }),
    ];
    const line = { id: "r", label: "Rent", amountMinor: 1000, fundId: "rent" };
    expect(lineActual(line, txns, "2027-01")).toBe(1000);
    expect(contributedInto(txns, new Set(["rent"]), "2027-01")).toBe(1000);
  });
});

describe("spending", () => {
  const plan = budget("2026-11", [
    { id: "l1", label: "Food", amountMinor: 800, fundId: "" },
    { id: "l2", label: "Transport", amountMinor: 500, fundId: "" },
    { id: "l3", label: "House", amountMinor: 250, fundId: "house" },
  ]);
  const txns = [
    txn("expense", "2026-11-03", 300, { category: "Food" }),
    txn("expense", "2026-11-09", 250, { category: "Food" }),
    txn("expense", "2026-11-10", 90, { category: "Gifts" }),
    txn("expense", "2026-10-30", 999, { category: "Food" }),
    txn("fund_spend", "2026-11-05", 1000, { fundId: "laptop", category: "laptop" }),
    txn("deposit", "2026-11-01", 250, { fundId: "house" }),
  ];

  it("lists living costs by category next to the plan, biggest first", () => {
    expect(spendingByCategory(txns, plan, "2026-11")).toEqual([
      { category: "Food", spentMinor: 550, plannedMinor: 800 },
      { category: "Gifts", spentMinor: 90, plannedMinor: 0 },
      { category: "Transport", spentMinor: 0, plannedMinor: 500 },
    ]);
  });

  it("keeps money paid out of a fund apart from living costs", () => {
    const rows = spendingByCategory(txns, plan, "2026-11");
    expect(rows.reduce((a, r) => a + r.spentMinor, 0)).toBe(640);
    expect(paidFromFunds(txns, funds, "2026-11")).toEqual([
      { fundId: "laptop", name: "laptop", spentMinor: 1000 },
    ]);
  });

  it("gives each month's living costs and plan, oldest first, before any plan existed too", () => {
    expect(livingCostsByMonth(txns, [plan], "2026-11", 3)).toEqual([
      { month: "2026-09", spentMinor: 0, plannedMinor: 0 },
      { month: "2026-10", spentMinor: 999, plannedMinor: 0 },
      { month: "2026-11", spentMinor: 640, plannedMinor: 1300 },
    ]);
  });
});
