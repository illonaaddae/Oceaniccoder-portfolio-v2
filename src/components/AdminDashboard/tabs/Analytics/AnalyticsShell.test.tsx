import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const getPayments = vi.fn();
const getInvoices = vi.fn();
const getExpenses = vi.fn();
const createExpense = vi.fn();
const deleteExpense = vi.fn();
const quoteAdmin = vi.fn();

vi.mock("@/services/api/payments", () => ({ getPayments: () => getPayments() }));
vi.mock("@/services/api/invoices", () => ({ getInvoices: () => getInvoices() }));
vi.mock("@/services/api/expenses", () => ({
  getExpenses: () => getExpenses(),
  createExpense: (e: unknown) => createExpense(e),
  deleteExpense: (id: string) => deleteExpense(id),
}));
vi.mock("@/services/api/quotes", () => ({
  quoteAdmin: (action: string) => quoteAdmin(action),
}));
vi.mock("./BlogReadershipSection", () => ({
  BlogReadershipSection: () => <p>Blog readership stub</p>,
}));
vi.mock("../../ConfirmContext", () => ({ useConfirm: () => async () => true }));

import AnalyticsShell from "./AnalyticsShell";
import AnalyticsTab from "../AnalyticsTab";
import { RANGE_STORAGE_KEY } from "./metrics/range";

// Today is 13 Oct 2026, so 30 days is 14 Sep to 13 Oct and the previous
// period is 15 Aug to 13 Sep.
const NOW = new Date("2026-10-13T12:00:00Z");

const payment = (over: Record<string, unknown>) => ({
  $id: "p",
  $createdAt: "2026-10-01T00:00:00Z",
  invoiceNumber: "INV-1",
  clientName: "Ama Owusu",
  clientEmail: "ama@example.com",
  amount: 0,
  currency: "GHS",
  method: "momo",
  status: "success",
  ...over,
});

const PAYMENTS = [
  payment({ $id: "p1", amount: 500, paidAt: "2026-10-10T09:00:00Z" }),
  payment({
    $id: "p2",
    kind: "quote",
    invoiceNumber: "Q-2026-0001-1",
    clientName: "Kojo Mensah",
    clientEmail: "kojo@example.com",
    amount: 100,
    amountMinor: 10000,
    currency: "USD",
    method: "card",
    paidAt: "2026-10-01T09:00:00Z",
  }),
  payment({ $id: "p3", invoiceNumber: "INV-3", amount: 200, paidAt: "2026-09-01T09:00:00Z" }),
  payment({ $id: "p4", invoiceNumber: "INV-4", amount: 999, status: "failed" }),
];

const invoice = (over: Record<string, unknown>) => ({
  $id: "i",
  invoiceNumber: "INV",
  clientName: "Esi",
  clientEmail: "esi@example.com",
  items: "[]",
  currency: "GHS",
  subtotal: 0,
  tax: 0,
  total: 0,
  status: "sent",
  $createdAt: "2026-09-20T00:00:00Z",
  ...over,
});

const INVOICES = [
  // Paid with no payment row: counted, dated by its last update, estimated.
  invoice({
    $id: "i1",
    invoiceNumber: "INV-OLD",
    total: 50,
    status: "paid",
    $updatedAt: "2026-10-02T00:00:00Z",
  }),
  // Sent and past due: owed and overdue.
  invoice({ $id: "i2", invoiceNumber: "INV-DUE", total: 300, dueDate: "2026-09-30" }),
];

const EXPENSES = [
  {
    $id: "e1",
    description: "Hosting",
    amount: 80,
    currency: "GHS",
    category: "hosting",
    date: "2026-10-05",
  },
  {
    $id: "e2",
    description: "Old tool",
    amount: 10,
    currency: "USD",
    category: "tools",
    date: "2026-06-01",
  },
];

const card = (name: string) => screen.getByRole("region", { name });

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

beforeEach(() => {
  localStorage.clear();
  getPayments.mockReset().mockResolvedValue(PAYMENTS);
  getInvoices.mockReset().mockResolvedValue(INVOICES);
  getExpenses.mockReset().mockResolvedValue(EXPENSES);
  quoteAdmin.mockReset().mockResolvedValue({ quotes: [] });
  createExpense.mockReset();
  deleteExpense.mockReset().mockResolvedValue(undefined);
});

async function renderShell() {
  render(<AnalyticsShell theme="dark" now={NOW} />);
  await screen.findByText(/updated/i);
}

describe("AnalyticsShell summary", () => {
  it("shows cash collected per currency for the range, with an approx. GHS total", async () => {
    await renderShell();
    const cash = card("Cash collected");
    // GHS 500 paid 10 Oct + GHS 50 estimated 2 Oct; USD 100 on 1 Oct.
    // Not the 1 Sep payment (previous period) or the failed one.
    expect(within(cash).getByText("GHS 550.00")).toBeInTheDocument();
    expect(within(cash).getByText("USD 100.00")).toBeInTheDocument();
    // 550 + 100 × 11.77 at the fxRates.ts rates.
    expect(
      within(cash).getByText(/≈ GHS 1,727.00 approx\. combined, at rates as of/),
    ).toBeInTheDocument();
  });

  it("shows what is owed now, net and expenses in their own currencies", async () => {
    await renderShell();
    expect(within(card("Owed to you now")).getByText("1 invoice")).toBeInTheDocument();
    expect(within(card("Owed to you now")).getByText("GHS 300.00")).toBeInTheDocument();
    expect(within(card("Owed to you now")).getByText(/1 overdue/)).toBeInTheDocument();
    expect(within(card("Expenses")).getByText("GHS 80.00")).toBeInTheDocument();
    const net = card("Net (collected minus expenses)");
    expect(within(net).getByText("GHS 470.00")).toBeInTheDocument();
    expect(within(net).getByText("USD 100.00")).toBeInTheDocument();
  });

  it("flags paid invoices whose date is estimated", async () => {
    await renderShell();
    expect(screen.getByText(/1 paid invoice has no payment record/)).toBeInTheDocument();
  });

  it("recomputes for a new range and remembers it", async () => {
    await renderShell();
    await userEvent.click(screen.getByRole("button", { name: "7 days" }));
    const cash = card("Cash collected");
    expect(within(cash).getByText("GHS 500.00")).toBeInTheDocument();
    expect(within(cash).queryByText("USD 100.00")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(RANGE_STORAGE_KEY) ?? "{}")).toEqual({ preset: "7d" });
  });

  it("says payments couldn't load instead of showing zero", async () => {
    getPayments.mockReset().mockRejectedValue(new Error("Network down"));
    await renderShell();
    expect(screen.getByRole("alert")).toHaveTextContent("Network down");
    expect(within(card("Cash collected")).getByText(/Payments couldn.t load/)).toBeInTheDocument();
    expect(within(card("Cash collected")).queryByText("0.00")).not.toBeInTheDocument();
    // No payment stats, and no "estimated" warning built from missing rows.
    expect(
      within(card("Payments received")).getByText(/Payments couldn.t load/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/no payment record/)).not.toBeInTheDocument();
    // Other sources still show.
    expect(within(card("Expenses")).getByText("GHS 80.00")).toBeInTheDocument();
  });
});

describe("AnalyticsShell when invoices fail", () => {
  it("says cash collected leaves out the estimated invoice rows", async () => {
    getInvoices.mockReset().mockRejectedValue(new Error("Invoices down"));
    await renderShell();
    const cash = card("Cash collected");
    // Only the GHS 500 payment row; the estimated GHS 50 invoice is unknown.
    expect(within(cash).getByText("GHS 500.00")).toBeInTheDocument();
    expect(
      within(cash).getByText(/Leaves out paid invoices with no payment record/),
    ).toBeInTheDocument();
  });
});

describe("AnalyticsShell revenue", () => {
  it("defaults the charts to the currency with the most revenue, compared at approx. rates", async () => {
    await renderShell();
    // USD 100 ≈ GHS 1,177 beats GHS 550.
    expect(screen.getByLabelText("Charts in")).toHaveValue("USD");
  });

  it("lists the payments behind a period from the data table", async () => {
    await renderShell();
    await userEvent.selectOptions(screen.getByLabelText("Charts in"), "GHS");
    await userEvent.click(screen.getByRole("button", { name: "Show payments for 10 Oct" }));
    expect(screen.getByRole("heading", { name: "Payments, 10 Oct 2026" })).toBeInTheDocument();
    expect(screen.getAllByText("Ama Owusu").length).toBeGreaterThan(0);
  });

  it("breaks money down by method in the chosen unit", async () => {
    await renderShell();
    await userEvent.selectOptions(screen.getByLabelText("Charts in"), "approx");
    const methods = screen.getByRole("table", { name: "Money received by payment method" });
    expect(within(methods).getByRole("rowheader", { name: /Card/ })).toBeInTheDocument();
    expect(within(methods).getByText("≈ GHS 1,177.00")).toBeInTheDocument();
  });
});

describe("AnalyticsShell expenses", () => {
  it("says expenses couldn't load instead of showing none", async () => {
    getExpenses.mockReset().mockRejectedValue(new Error("Expenses down"));
    await renderShell();
    expect(screen.getByRole("alert")).toHaveTextContent("Expenses down");
    expect(within(card("Expenses")).getByText(/Expenses couldn.t load/)).toBeInTheDocument();
    expect(
      within(card("Net (collected minus expenses)")).getByText(/Needs expenses/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/No expenses logged yet/)).not.toBeInTheDocument();
    // Cash collected is unaffected.
    expect(within(card("Cash collected")).getByText("GHS 550.00")).toBeInTheDocument();
  });

  it("logs a new expense", async () => {
    createExpense.mockResolvedValue({
      $id: "e3",
      description: "Domain",
      amount: 120,
      currency: "GHS",
      category: "domain",
      date: "2026-10-12",
    });
    await renderShell();
    await userEvent.click(screen.getByRole("button", { name: "Add expense" }));
    await userEvent.type(screen.getByLabelText("Description"), "Domain");
    await userEvent.type(screen.getByLabelText("Amount"), "120");
    await userEvent.click(screen.getByRole("button", { name: "Log expense" }));
    expect(createExpense).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Domain", amount: 120, currency: "GHS" }),
    );
    expect(await screen.findByRole("button", { name: "Delete Domain" })).toBeInTheDocument();
    expect(within(card("Expenses")).getByText("GHS 200.00")).toBeInTheDocument();
  });

  it("deletes an expense after confirming", async () => {
    await renderShell();
    await userEvent.click(screen.getByRole("button", { name: "Delete Hosting" }));
    expect(deleteExpense).toHaveBeenCalledWith("e1");
    expect(await screen.findByText("Deleted Hosting.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete Hosting" })).not.toBeInTheDocument();
  });
});

describe("AnalyticsTab", () => {
  it("loads the shell lazily", async () => {
    render(<AnalyticsTab theme="light" />);
    expect(await screen.findByRole("heading", { name: "Analytics" })).toBeInTheDocument();
  });
});
