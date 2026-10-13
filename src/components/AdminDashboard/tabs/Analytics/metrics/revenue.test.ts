import { describe, it, expect } from "vitest";
import {
  amountIn,
  buildLedger,
  byMethod,
  cashByCurrency,
  cashSeries,
  defaultCurrency,
  entriesIn,
  estimatedCount,
  expenseSeries,
  expenseTotals,
  expensesByCategory,
  expensesIn,
  invoiceBalance,
  largestExpenses,
  methodTone,
  netByCurrency,
  outstandingSummary,
  owedStatus,
  paymentAmount,
  paymentStats,
  topClients,
  totalIn,
  type LedgerEntry,
} from "./revenue";
import type { Payment } from "@/services/api/payments";
import type { Expense, Invoice } from "@/types";
import type { QuoteSummary } from "@/types/quote";

const pay = (over: Partial<Payment>): Payment => ({
  $id: "p1",
  $createdAt: "2026-10-05T12:00:00Z",
  invoiceNumber: "INV-1",
  clientName: "Ama",
  clientEmail: "ama@example.com",
  amount: 100,
  currency: "GHS",
  method: "card",
  status: "success",
  ...over,
});

const invoice = (over: Partial<Invoice>): Invoice => ({
  $id: "i1",
  invoiceNumber: "INV-1",
  clientName: "Ama",
  clientEmail: "ama@example.com",
  items: "[]",
  currency: "GHS",
  subtotal: 100,
  tax: 0,
  total: 100,
  status: "paid",
  $createdAt: "2026-01-02T00:00:00Z",
  $updatedAt: "2026-03-04T00:00:00Z",
  ...over,
});

describe("buildLedger", () => {
  it("dates a payment by paidAt, not by when its invoice was created", () => {
    const [entry] = buildLedger(
      [pay({ paidAt: "2026-10-07T09:00:00Z" })],
      [invoice({ $createdAt: "2026-01-02T00:00:00Z" })],
    );
    expect(entry).toMatchObject({
      date: "2026-10-07T09:00:00Z",
      amount: 100,
      kind: "invoice",
      estimated: false,
    });
  });

  it("falls back to the row's $createdAt when paidAt is missing", () => {
    expect(buildLedger([pay({ paidAt: undefined })], [])[0].date).toBe("2026-10-05T12:00:00Z");
  });

  it("counts successful quote and invoice payments and nothing else", () => {
    const ledger = buildLedger(
      [
        pay({ $id: "a", kind: "quote", invoiceNumber: "Q-2026-0001-1" }),
        pay({ $id: "b", invoiceNumber: "INV-2" }),
        pay({ $id: "c", status: "failed" }),
        pay({ $id: "d", status: "pending" }),
        pay({ $id: "e", status: "abandoned", archivedAt: "2026-10-06T00:00:00Z" }),
        pay({ $id: "f", status: "duplicate" }),
        pay({ $id: "g", status: "refunded" }),
      ],
      [],
    );
    expect(ledger.map((e) => [e.id, e.kind])).toEqual([
      ["a", "quote"],
      ["b", "invoice"],
    ]);
  });

  it("treats a row with no status as successful, as the Payments tab does", () => {
    expect(buildLedger([pay({ status: undefined })], [])).toHaveLength(1);
  });

  it("uses amountMinor when it is an integer and amount otherwise", () => {
    const ledger = buildLedger(
      [
        pay({ $id: "a", amount: 33.33, amountMinor: 3333 }),
        pay({ $id: "b", amount: 12.5 }),
        pay({ $id: "c", amount: 7, amountMinor: Number.NaN }),
      ],
      [],
    );
    expect(ledger.map((e) => e.amount)).toEqual([33.33, 12.5, 7]);
  });

  it("keeps each currency as it was paid", () => {
    const ledger = buildLedger([pay({ currency: "USD", amount: 10 })], []);
    expect(ledger[0]).toMatchObject({ currency: "USD", amount: 10 });
  });

  it("adds a paid invoice with no payment row, dated by its last update and flagged", () => {
    const ledger = buildLedger([], [invoice({})]);
    expect(ledger).toEqual([
      expect.objectContaining({
        id: "i1",
        kind: "invoice",
        amount: 100,
        date: "2026-03-04T00:00:00Z",
        estimated: true,
      }),
    ]);
  });

  it("does not count a paid invoice twice when its payment row exists", () => {
    const ledger = buildLedger([pay({ invoiceNumber: "INV-1" })], [invoice({})]);
    expect(ledger).toHaveLength(1);
    expect(ledger[0].estimated).toBe(false);
  });

  it("sums a part payment and the manual balance row to the invoice total", () => {
    const ledger = buildLedger(
      [
        pay({ $id: "web", amount: 200, paidAt: "2026-10-01T00:00:00Z" }),
        pay({ $id: "manual", amount: 300, method: "bank", paidAt: "2026-10-09T00:00:00Z" }),
      ],
      [invoice({ total: 500 })],
    );
    expect(ledger.map((e) => e.id)).toEqual(["web", "manual"]);
    expect(ledger.reduce((sum, e) => sum + e.amount, 0)).toBe(500);
  });

  it("still estimates an invoice whose only payment row failed", () => {
    const ledger = buildLedger([pay({ status: "failed" })], [invoice({})]);
    expect(ledger).toHaveLength(1);
    expect(ledger[0].estimated).toBe(true);
  });

  it("ignores unpaid invoices", () => {
    expect(buildLedger([], [invoice({ status: "sent" }), invoice({ status: "draft" })])).toEqual(
      [],
    );
  });
});

describe("paymentAmount", () => {
  it("reads major units", () => {
    expect(paymentAmount({ amount: 5, amountMinor: 501 })).toBe(5.01);
    expect(paymentAmount({ amount: Number.NaN })).toBe(0);
  });
});

describe("invoiceBalance", () => {
  const inv = { invoiceNumber: "INV-1", total: 500, currency: "GHS" };
  const row = (over: Record<string, unknown>) =>
    ({ invoiceNumber: "INV-1", amount: 0, currency: "GHS", status: "success", ...over }) as never;

  it("subtracts successful payments in the invoice's currency only", () => {
    expect(
      invoiceBalance(inv, [
        row({ amount: 150.1 }),
        row({ amount: 49.9, status: undefined }), // predates the field: successful
        row({ amount: 100, status: "failed" }),
        row({ amount: 100, currency: "USD" }),
        row({ amount: 100, invoiceNumber: "INV-2" }),
      ]),
    ).toEqual({ paid: 200, balance: 300 });
  });

  it("uses exact minor units and never goes below zero", () => {
    expect(invoiceBalance(inv, [row({ amount: 0, amountMinor: 50001 })])).toEqual({
      paid: 500.01,
      balance: 0,
    });
    expect(invoiceBalance(inv, [])).toEqual({ paid: 0, balance: 500 });
  });
});

const entry = (over: Partial<LedgerEntry>): LedgerEntry => ({
  id: "e",
  kind: "invoice",
  amount: 100,
  currency: "GHS",
  date: "2026-10-05T10:00:00Z",
  method: "card",
  clientName: "Ama",
  clientEmail: "ama@example.com",
  invoiceNumber: "INV-1",
  estimated: false,
  ...over,
});

const GHS = { kind: "currency", currency: "GHS" } as const;
const APPROX = { kind: "approx" } as const;
const OCT = { from: "2026-10-01", to: "2026-10-31" };

describe("ranges over the ledger", () => {
  const ledger = [
    entry({ id: "a", date: "2026-09-30T23:59:59Z" }),
    entry({ id: "b", date: "2026-10-01T00:00:00Z" }),
    entry({ id: "c", date: "2026-10-31T23:00:00Z", currency: "USD", amount: 10 }),
    entry({ id: "d", date: "2026-11-01T00:00:00Z" }),
  ];

  it("keeps entries dated inside the range, both ends included", () => {
    expect(entriesIn(ledger, OCT).map((e) => e.id)).toEqual(["b", "c"]);
  });

  it("totals per currency without mixing", () => {
    expect(cashByCurrency(entriesIn(ledger, OCT))).toEqual([
      { currency: "GHS", amount: 100 },
      { currency: "USD", amount: 10 },
    ]);
  });

  it("counts estimated entries", () => {
    expect(estimatedCount([entry({}), entry({ estimated: true })])).toBe(1);
  });
});

describe("amountIn and totalIn", () => {
  it("keeps one currency, or converts everything to approx. GHS", () => {
    expect(amountIn(GHS, 5, "GHS")).toBe(5);
    expect(amountIn(GHS, 5, "USD")).toBeNull();
    expect(amountIn(APPROX, 2, "USD")).toBeCloseTo(23.54); // 11.77 per USD in fxRates.ts
    expect(amountIn(APPROX, 2, "XOF")).toBeNull();
    expect(
      totalIn(APPROX, [
        { currency: "GHS", amount: 100 },
        { currency: "USD", amount: 2 },
      ]),
    ).toBeCloseTo(123.54);
  });
});

describe("defaultCurrency", () => {
  it("picks the currency with the most revenue in range, comparing at approx. rates", () => {
    const ledger = [
      entry({ currency: "GHS", amount: 100 }),
      entry({ currency: "USD", amount: 10 }), // ≈ GHS 117.70
    ];
    expect(defaultCurrency(ledger, OCT)).toBe("USD");
  });

  it("falls back to all time, then GHS", () => {
    const old = [entry({ currency: "EUR", date: "2025-01-01T00:00:00Z" })];
    expect(defaultCurrency(old, OCT)).toBe("EUR");
    expect(defaultCurrency([], OCT)).toBe("GHS");
  });
});

describe("cashSeries", () => {
  it("buckets by day, splits invoice and quote, and lines up the previous period", () => {
    const r = { from: "2026-10-11", to: "2026-10-13" };
    const series = cashSeries(
      [
        entry({ date: "2026-10-11T08:00:00Z", amount: 50 }),
        entry({ date: "2026-10-11T20:00:00Z", amount: 25, kind: "quote" }),
        entry({ date: "2026-10-13T08:00:00Z", amount: 10 }),
        entry({ date: "2026-10-13T08:00:00Z", amount: 999, currency: "USD" }), // other currency
        entry({ date: "2026-10-08T12:00:00Z", amount: 40 }), // previous twin of 11 Oct
        entry({ date: "2026-10-07T12:00:00Z", amount: 7 }), // before the previous period
      ],
      r,
      GHS,
    );
    expect(series.map((p) => [p.label, p.invoice, p.quote, p.total, p.previous])).toEqual([
      ["11 Oct", 50, 25, 75, 40],
      ["12 Oct", 0, 0, 0, 0],
      ["13 Oct", 10, 0, 10, 0],
    ]);
  });

  it("sums every currency in approx. GHS mode", () => {
    const r = { from: "2026-10-13", to: "2026-10-13" };
    const [point] = cashSeries(
      [
        entry({ date: "2026-10-13T08:00:00Z", amount: 10 }),
        entry({ date: "2026-10-13T08:00:00Z", amount: 2, currency: "USD" }),
      ],
      r,
      APPROX,
    );
    expect(point.total).toBeCloseTo(33.54);
  });
});

describe("paymentStats", () => {
  it("counts and averages per currency", () => {
    expect(
      paymentStats([
        entry({ amount: 100 }),
        entry({ amount: 50 }),
        entry({ amount: 30, currency: "USD" }),
      ]),
    ).toEqual([
      { currency: "GHS", count: 2, total: 150, average: 75 },
      { currency: "USD", count: 1, total: 30, average: 30 },
    ]);
  });
});

describe("byMethod and topClients", () => {
  const entries = [
    entry({ method: "momo", amount: 60, clientEmail: "AMA@example.com " }),
    entry({ method: "card", amount: 100, clientEmail: "ama@example.com" }),
    entry({ method: undefined, amount: 20, clientEmail: "", clientName: "Kojo" }),
    entry({ method: "card", amount: 5, currency: "USD" }),
  ];

  it("totals by method in the chosen unit, labelling a missing method", () => {
    expect(byMethod(entries, GHS)).toEqual([
      { key: "card", label: "Card", count: 1, amount: 100 },
      { key: "momo", label: "Mobile Money", count: 1, amount: 60 },
      { key: "unknown", label: "Not recorded", count: 1, amount: 20 },
    ]);
  });

  it("groups clients by email, case-insensitively, falling back to the name", () => {
    expect(topClients(entries, GHS).map((r) => [r.label, r.count, r.amount])).toEqual([
      ["Ama", 2, 160],
      ["Kojo", 1, 20],
    ]);
    expect(topClients(entries, GHS, 1)).toHaveLength(1);
  });
});

describe("outstandingSummary", () => {
  const NOW = new Date("2026-10-13T12:00:00Z");
  const inv = (over: Partial<Invoice>): Invoice => ({
    $id: "i",
    invoiceNumber: "INV",
    clientName: "Ama",
    clientEmail: "ama@example.com",
    items: "[]",
    currency: "GHS",
    subtotal: 100,
    tax: 0,
    total: 100,
    status: "sent",
    $createdAt: "2026-10-03T00:00:00Z",
    ...over,
  });
  const quote = {
    id: "q1",
    quoteNumber: "Q-2026-0001",
    title: "Shop",
    clientName: "Kojo",
    clientEmail: "kojo@example.com",
    status: "accepted",
    currency: "USD",
    totalMinor: 100000,
    paidMinor: 50000,
    complete: false,
    nextDue: null,
    sentAt: null,
    viewedAt: null,
    updatedAt: null,
    invoices: [
      {
        stageId: "deposit",
        invoiceNumber: "Q-2026-0001-1",
        label: "Deposit",
        percent: 50,
        amountMinor: 50000,
        state: "paid",
        issuedAt: "2026-07-01T00:00:00Z",
        dueBy: null,
        overdue: false,
        paidAt: "2026-07-02T00:00:00Z",
      },
      {
        stageId: "balance",
        invoiceNumber: "Q-2026-0001-2",
        label: "Balance",
        percent: 50,
        amountMinor: 50000,
        state: "due",
        issuedAt: "2026-08-01T00:00:00Z",
        dueBy: "2026-08-15",
        overdue: true,
        paidAt: null,
      },
    ],
  } as QuoteSummary;

  it("counts sent invoices and due quote stages, not drafts, paid or archived ones", () => {
    const s = outstandingSummary(
      [
        inv({ $id: "a", invoiceNumber: "INV-A", dueDate: "2026-10-20" }),
        inv({ $id: "b", status: "draft" }),
        inv({ $id: "c", status: "paid" }),
        inv({ $id: "d", archivedAt: "2026-10-10T00:00:00Z" }),
        inv({ $id: "e", invoiceNumber: "INV-E", dueDate: "2026-10-01", total: 40 }),
      ],
      [quote],
      NOW,
    );
    expect(s.items.map((i) => [i.number, i.overdue, i.ageDays])).toEqual([
      ["Q-2026-0001-2", true, 73],
      ["INV-E", true, 10],
      ["INV-A", false, 10],
    ]);
    expect(s.totals).toEqual([
      { currency: "USD", amount: 500 },
      { currency: "GHS", amount: 140 },
    ]);
    expect(s.overdueCount).toBe(2);
    expect(s.overdue).toEqual([
      { currency: "USD", amount: 500 },
      { currency: "GHS", amount: 40 },
    ]);
    // Due 20 Oct is 7 days out; 1 Oct was 12 days ago.
    expect(s.items.map((i) => [i.number, i.dueInDays])).toEqual([
      ["Q-2026-0001-2", -59],
      ["INV-E", -12],
      ["INV-A", 7],
    ]);
  });
});

describe("owedStatus", () => {
  const item = { overdue: false, dueInDays: null, issuedAt: "2026-10-02T09:00:00Z" };

  it("says how long an overdue item has been overdue", () => {
    expect(owedStatus({ ...item, overdue: true, dueInDays: -6 })).toEqual({
      kind: "overdue",
      label: "Overdue 6 days",
    });
    expect(owedStatus({ ...item, overdue: true, dueInDays: -1 }).label).toBe("Overdue 1 day");
    expect(owedStatus({ ...item, overdue: true }).label).toBe("Overdue");
  });

  it("calls an item due soon within a week of its due date", () => {
    expect(owedStatus({ ...item, dueInDays: 3 })).toEqual({ kind: "due", label: "Due in 3 days" });
    expect(owedStatus({ ...item, dueInDays: 0 }).label).toBe("Due today");
    expect(owedStatus({ ...item, dueInDays: 8 }).kind).toBe("sent");
  });

  it("otherwise says when it was sent", () => {
    expect(owedStatus(item)).toEqual({ kind: "sent", label: "Sent 2 Oct 2026" });
    expect(owedStatus({ ...item, issuedAt: null }).label).toBe("Sent");
  });
});

describe("methodTone", () => {
  it("maps the recorded methods and sends anything else to other", () => {
    expect(
      ["card", "momo", "bank", "apple_pay", "cash", "unknown", "paypal"].map(methodTone),
    ).toEqual(["card", "momo", "bank", "apple", "other", "other", "other"]);
  });
});

describe("expenses", () => {
  const exp = (over: Partial<Expense>): Expense => ({
    $id: "x",
    description: "Domain",
    amount: 10,
    currency: "GHS",
    category: "domain",
    date: "2026-10-05",
    ...over,
  });
  const expenses = [
    exp({ amount: 10 }),
    exp({ amount: 30, category: "hosting", date: "2026-10-31" }),
    exp({ amount: 4, currency: "USD", category: "tools" }),
    exp({ amount: 99, date: "2026-09-30" }), // previous period
  ];

  it("keeps expenses dated in range and totals them per currency", () => {
    const inOct = expensesIn(expenses, OCT);
    expect(inOct).toHaveLength(3);
    expect(expenseTotals(inOct)).toEqual([
      { currency: "GHS", amount: 40 },
      { currency: "USD", amount: 4 },
    ]);
  });

  it("buckets them with the previous period lined up", () => {
    const r = { from: "2026-10-01", to: "2026-10-31" };
    const series = expenseSeries(expenses, r, GHS, "month");
    expect(series).toEqual([
      expect.objectContaining({ label: "Oct 2026", amount: 40, previous: 99 }),
    ]);
  });

  it("breaks them down by category in the chosen unit", () => {
    expect(expensesByCategory(expensesIn(expenses, OCT), GHS)).toEqual([
      { key: "hosting", label: "Hosting", count: 1, amount: 30 },
      { key: "domain", label: "Domain", count: 1, amount: 10 },
    ]);
  });

  it("picks the largest expenses in the range, comparing currencies at the approx. rates", () => {
    // USD 4 ≈ GHS 47 beats GHS 30 and GHS 10; the GHS 99 is outside the range.
    expect(largestExpenses(expenses, OCT).map((e) => [e.currency, e.amount])).toEqual([
      ["USD", 4],
      ["GHS", 30],
      ["GHS", 10],
    ]);
    expect(largestExpenses(expenses, OCT, 1)).toHaveLength(1);
  });

  it("nets per currency and never across currencies", () => {
    expect(
      netByCurrency(
        [
          { currency: "GHS", amount: 100 },
          { currency: "USD", amount: 50 },
        ],
        [
          { currency: "GHS", amount: 140 },
          { currency: "EUR", amount: 5 },
        ],
      ),
    ).toEqual([
      { currency: "USD", amount: 50 },
      { currency: "EUR", amount: -5 },
      { currency: "GHS", amount: -40 },
    ]);
  });
});
