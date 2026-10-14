import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
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
import { invoiceIsTop } from "./sections/RevenueSection";
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

const card = (name: string | RegExp) => screen.getByRole("region", { name });
// Scoped: role queries over the whole tab are slow on a loaded machine.
const log = () => within(card(/^Expense log/));
const figure = (name: string) => screen.getByRole("group", { name });

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
    const cash = figure("Cash collected");
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
    const owed = figure("Owed to you");
    expect(
      within(owed).getByText(/1 invoice, 1 overdue\. Not limited to the range\./),
    ).toBeInTheDocument();
    expect(within(owed).getByText("GHS 300.00")).toBeInTheDocument();
    expect(within(owed).getByText("Now")).toBeInTheDocument();
    expect(within(figure("Expenses")).getByText("GHS 80.00")).toBeInTheDocument();
    const net = figure("Net");
    // Named by its heading, not a second copy of the label.
    expect(net).not.toHaveAttribute("aria-label");
    expect(net).toHaveAttribute(
      "aria-labelledby",
      within(net).getByRole("heading", { name: "Net" }).id,
    );
    expect(within(net).getByText("GHS 470.00")).toBeInTheDocument();
    expect(within(net).getByText("USD 100.00")).toBeInTheDocument();
  });

  it("flags paid invoices whose date is estimated, with the fix behind an info tip", async () => {
    await renderShell();
    expect(screen.getByText(/1 paid invoice has an estimated date\./)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Why the dates are estimated" }),
    ).toHaveAccessibleDescription(
      /Running the payments backfill script \(scripts\/backfill-payments\.mjs\) fixes this\.$/,
    );
    // No source file names in the copy.
    expect(
      screen.getByRole("button", { name: "About days and currencies" }),
    ).toHaveAccessibleDescription(/at reference exchange rates as of 13 Oct 2026\./);
    expect(screen.queryByText(/fxRates/)).not.toBeInTheDocument();
  });

  it("recomputes for a new range and remembers it", async () => {
    await renderShell();
    await userEvent.click(screen.getByRole("button", { name: /7 days/ }));
    const cash = figure("Cash collected");
    expect(within(cash).getByText("GHS 500.00")).toBeInTheDocument();
    expect(within(cash).queryByText("USD 100.00")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(RANGE_STORAGE_KEY) ?? "{}")).toEqual({ preset: "7d" });
  });

  it("says payments couldn't load instead of showing zero", async () => {
    getPayments.mockReset().mockRejectedValue(new Error("Network down"));
    await renderShell();
    expect(screen.getByRole("alert")).toHaveTextContent("Network down");
    expect(
      within(figure("Cash collected")).getByText(/Payments couldn.t load/),
    ).toBeInTheDocument();
    expect(within(figure("Cash collected")).queryByText("0.00")).not.toBeInTheDocument();
    // No payment stats, and no "estimated" warning built from missing rows.
    expect(within(figure("Cash collected")).queryByText(/\(avg /)).not.toBeInTheDocument();
    expect(screen.queryByText(/estimated date/)).not.toBeInTheDocument();
    // Other sources still show.
    expect(within(figure("Expenses")).getByText("GHS 80.00")).toBeInTheDocument();
  });
});

describe("AnalyticsShell key figures", () => {
  it("shows the change on the previous period as a chip, worded for screen readers", async () => {
    await renderShell();
    await userEvent.selectOptions(screen.getByLabelText("Show in"), "GHS");
    const cash = figure("Cash collected");
    // GHS 550 now against GHS 200 on 1 Sep: up 175%.
    expect(within(cash).getByText("▲ 175%").closest(".analytics-chip")).toHaveAttribute(
      "data-tone",
      "good",
    );
    expect(
      within(cash).getByText("up 175% on the previous period, in GHS, better than before"),
    ).toBeInTheDocument();
    expect(
      within(cash).getByText(/^2 GHS \(avg GHS 275\.00\), 1 USD \(avg USD 100\.00\)/),
    ).toBeInTheDocument();
  });

  it("counts expenses going down as good", async () => {
    getExpenses
      .mockReset()
      .mockResolvedValue([
        ...EXPENSES,
        { ...EXPENSES[0], $id: "e0", amount: 100, date: "2026-09-01" },
      ]);
    await renderShell();
    await userEvent.selectOptions(screen.getByLabelText("Show in"), "GHS");
    const spent = figure("Expenses");
    expect(within(spent).getByText("▼ 20%").closest(".analytics-chip")).toHaveAttribute(
      "data-tone",
      "good",
    );
    expect(
      within(spent).getByText("down 20% on the previous period, in GHS, better than before"),
    ).toBeInTheDocument();
  });

  it("counts expenses going up as bad, and nets them off cash", async () => {
    getExpenses
      .mockReset()
      .mockResolvedValue([
        ...EXPENSES,
        { ...EXPENSES[0], $id: "e0", amount: 40, date: "2026-09-01" },
      ]);
    await renderShell();
    await userEvent.selectOptions(screen.getByLabelText("Show in"), "GHS");
    // GHS 80 against GHS 40: up 100%, which is bad for expenses.
    const spent = figure("Expenses");
    expect(within(spent).getByText("▲ 100%").closest(".analytics-chip")).toHaveAttribute(
      "data-tone",
      "bad",
    );
    expect(
      within(spent).getByText("up 100% on the previous period, in GHS, worse than before"),
    ).toBeInTheDocument();
    // Net GHS 470 (550 − 80) against GHS 160 (200 − 40): up 194%.
    const net = figure("Net");
    expect(within(net).getByText("▲ 194%").closest(".analytics-chip")).toHaveAttribute(
      "data-tone",
      "good",
    );
    expect(
      within(net).getByText("up 194% on the previous period, in GHS, better than before"),
    ).toBeInTheDocument();
  });
});

describe("AnalyticsShell info tips", () => {
  const tip = () => screen.getByRole("button", { name: "How revenue is counted" });

  it("describes the button and shows on focus until Escape", async () => {
    await renderShell();
    expect(tip()).toHaveAccessibleDescription(/Failed, pending, abandoned/);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    act(() => tip().focus());
    expect(screen.getByRole("tooltip")).toHaveTextContent(/dated when the money arrived/);
    userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(tip()).toHaveFocus();
  });

  it("shows on hover and hides when the pointer leaves", async () => {
    await renderShell();
    userEvent.hover(tip());
    expect(screen.getByRole("tooltip")).toHaveTextContent(/dated when the money arrived/);
    userEvent.unhover(tip());
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});

describe("AnalyticsShell when invoices fail", () => {
  it("says cash collected leaves out the estimated invoice rows", async () => {
    getInvoices.mockReset().mockRejectedValue(new Error("Invoices down"));
    await renderShell();
    const cash = figure("Cash collected");
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
    expect(screen.getByLabelText("Show in")).toHaveValue("USD");
  });

  it("lists the payments behind a period from the data table", async () => {
    await renderShell();
    await userEvent.selectOptions(screen.getByLabelText("Show in"), "GHS");
    await userEvent.click(screen.getByRole("button", { name: "Show payments for 10 Oct" }));
    expect(screen.getByRole("heading", { name: "Payments, 10 Oct 2026" })).toBeInTheDocument();
    expect(screen.getAllByText("Ama Owusu").length).toBeGreaterThan(0);
  });

  it("says which currencies an approx. delta leaves out", async () => {
    getPayments.mockReset().mockResolvedValue([
      ...PAYMENTS,
      payment({
        $id: "p5",
        invoiceNumber: "INV-5",
        amount: 1000,
        currency: "XOF",
        paidAt: "2026-10-11T09:00:00Z",
      }),
    ]);
    await renderShell();
    const cash = () => figure("Cash collected");
    expect(within(cash()).queryByText(/vs previous period.*leaves out/)).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Show in"), "approx");
    const delta = within(cash())
      .getByText(/vs previous period \(approx\. GHS\)/)
      .closest("p");
    expect(delta).toHaveTextContent("(leaves out XOF: no rate set)");
  });

  it("breaks money down by method in the chosen unit", async () => {
    await renderShell();
    await userEvent.selectOptions(screen.getByLabelText("Show in"), "approx");
    const methods = screen.getByRole("table", { name: "Money received by payment method" });
    expect(within(methods).getByRole("rowheader", { name: /Card/ })).toBeInTheDocument();
    expect(within(methods).getByText("≈ GHS 1,177.00")).toBeInTheDocument();
  });

  it("gives each method its icon and colour, and an unrecorded one the neutral style", async () => {
    await renderShell();
    await userEvent.selectOptions(screen.getByLabelText("Show in"), "approx");
    const rows = card("By payment method").querySelectorAll("li[data-method]");
    // USD 100 card ≈ GHS 1,177, GHS 500 momo, GHS 50 estimated with no method.
    expect([...rows].map((r) => [r.getAttribute("data-method"), r.textContent])).toEqual([
      ["card", expect.stringMatching(/^Card1/)],
      ["momo", expect.stringMatching(/^Mobile Money1/)],
      ["other", expect.stringMatching(/^Not recorded1/)],
    ]);
    expect(within(card("By payment method")).getByText("3")).toBeInTheDocument();
  });

  it("lists what is owed with a worded status for each item", async () => {
    getInvoices.mockReset().mockResolvedValue([
      ...INVOICES,
      invoice({
        $id: "i3",
        invoiceNumber: "INV-SOON",
        clientName: "Kofi Boateng",
        total: 120,
        dueDate: "2026-10-16",
      }),
      invoice({
        $id: "i4",
        invoiceNumber: "INV-SENT",
        total: 75,
        $createdAt: "2026-10-02T09:00:00Z",
      }),
    ]);
    await renderShell();
    const owed = card("Owed to you now");
    const rows = within(owed).getAllByRole("row").slice(1);
    expect(rows.map((r) => within(r).getAllByRole("cell")[1].textContent)).toEqual([
      "●Overdue 13 days",
      "◐Due in 3 days",
      "○Sent 2 Oct 2026",
    ]);
    expect(within(rows[1]).getByText("INV-SOON")).toBeInTheDocument();
    expect(within(rows[1]).getByText("GHS 120.00")).toBeInTheDocument();
    expect(within(owed).getByText("1 overdue")).toBeInTheDocument();
  });
});

describe("AnalyticsShell expenses", () => {
  it("says expenses couldn't load instead of showing none", async () => {
    getExpenses.mockReset().mockRejectedValue(new Error("Expenses down"));
    await renderShell();
    expect(screen.getByRole("alert")).toHaveTextContent("Expenses down");
    expect(within(figure("Expenses")).getByText(/Expenses couldn.t load/)).toBeInTheDocument();
    expect(within(figure("Net")).getByText(/Needs expenses/)).toBeInTheDocument();
    expect(screen.queryByText(/No expenses logged yet/)).not.toBeInTheDocument();
    // Cash collected is unaffected.
    expect(within(figure("Cash collected")).getByText("GHS 550.00")).toBeInTheDocument();
  });

  it("lists the three largest expenses in the range, each in its own currency", async () => {
    getExpenses
      .mockReset()
      .mockResolvedValue([
        ...EXPENSES,
        { ...EXPENSES[0], $id: "e3", description: "Laptop stand", amount: 40, currency: "USD" },
        { ...EXPENSES[0], $id: "e4", description: "Domain", amount: 120, category: "domain" },
        { ...EXPENSES[0], $id: "e5", description: "Cables", amount: 20 },
      ]);
    await renderShell();
    const largest = within(card("Largest this range")).getAllByRole("listitem");
    // USD 40 ≈ GHS 471 beats GHS 120 and GHS 80; GHS 20 and the June expense miss out.
    expect(largest.map((li) => li.textContent)).toEqual([
      "Laptop standHosting · 5 Oct 2026USD 40.00",
      "DomainDomain · 5 Oct 2026GHS 120.00",
      "HostingHosting · 5 Oct 2026GHS 80.00",
    ]);
  });

  it("marks a largest expense with no rate as unconverted", async () => {
    getExpenses
      .mockReset()
      .mockResolvedValue([
        ...EXPENSES,
        { ...EXPENSES[0], $id: "e6", description: "Visa fee", amount: 5000, currency: "XOF" },
      ]);
    await renderShell();
    const [first] = within(card("Largest this range")).getAllByRole("listitem");
    expect(first).toHaveTextContent("Visa fee");
    expect(first).toHaveTextContent("XOF 5,000.00(unconverted)");
  });

  it("lists expenses per period, with the previous period, behind a table", async () => {
    await renderShell();
    await userEvent.selectOptions(screen.getByLabelText("Show in"), "GHS");
    const table = within(card("Where the money went")).getByRole("table", {
      name: "Expenses per day, GHS",
    });
    const row = within(table).getByRole("row", { name: /^5 Oct/ });
    expect(
      within(row)
        .getAllByRole("cell")
        .map((c) => c.textContent),
    ).toEqual(["GHS 80.00", "GHS 0.00"]);
    // The category list stays readable alongside it.
    expect(within(card("Where the money went")).getByText("Hosting")).toBeInTheDocument();
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
    await userEvent.click(log().getByRole("button", { name: "Add expense" }));
    await userEvent.type(log().getByLabelText("Description"), "Domain");
    await userEvent.type(log().getByLabelText("Amount"), "120");
    await userEvent.click(log().getByRole("button", { name: "Log expense" }));
    expect(createExpense).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Domain", amount: 120, currency: "GHS" }),
    );
    expect(await log().findByRole("button", { name: "Delete Domain" })).toBeInTheDocument();
    expect(within(figure("Expenses")).getByText("GHS 200.00")).toBeInTheDocument();
  });

  it("formats dates stored as timestamps", async () => {
    getExpenses
      .mockReset()
      .mockResolvedValue([{ ...EXPENSES[0], date: "2026-10-05T00:00:00.000+00:00" }]);
    await renderShell();
    expect(log().getByText("Hosting · 5 Oct 2026")).toBeInTheDocument();
  });

  it("pages the log 15 at a time and goes back to page 1 after a change", async () => {
    const many = Array.from({ length: 32 }, (_, i) => ({
      $id: `m${i + 1}`,
      description: `Cost ${i + 1}`,
      amount: 1,
      currency: "GHS",
      category: "other",
      // Latest date first: Cost 1 is newest.
      date: `2026-10-${String(Math.max(13 - Math.floor(i / 3), 1)).padStart(2, "0")}`,
    }));
    getExpenses.mockReset().mockResolvedValue(many);
    createExpense.mockResolvedValue({
      $id: "new",
      description: "Brand new",
      amount: 5,
      currency: "GHS",
      category: "domain",
      date: "2026-10-13",
    });
    await renderShell();
    const deletes = () => log().getAllByRole("button", { name: /^Delete / });
    expect(deletes()).toHaveLength(15);
    await userEvent.click(log().getByRole("button", { name: "Page 3" }));
    expect(deletes()).toHaveLength(2);

    await userEvent.click(log().getByRole("button", { name: "Add expense" }));
    await userEvent.type(log().getByLabelText("Description"), "Brand new");
    await userEvent.type(log().getByLabelText("Amount"), "5");
    await userEvent.click(log().getByRole("button", { name: "Log expense" }));
    expect(await log().findByRole("button", { name: "Delete Brand new" })).toBeInTheDocument();
    expect(deletes()).toHaveLength(15);

    await userEvent.click(log().getByRole("button", { name: "Page 2" }));
    await userEvent.click(deletes()[0]);
    expect(await log().findByRole("button", { name: "Delete Brand new" })).toBeInTheDocument();
  });

  it("deletes an expense after confirming", async () => {
    await renderShell();
    await userEvent.click(screen.getByRole("button", { name: "Delete Hosting" }));
    expect(deleteExpense).toHaveBeenCalledWith("e1");
    expect(await screen.findByText("Deleted Hosting.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete Hosting" })).not.toBeInTheDocument();
  });
});

describe("invoiceIsTop", () => {
  it("rounds the invoice part when the quote part is missing or too short to draw", () => {
    expect(invoiceIsTop(100, { invoice: 500, quote: 0 })).toBe(true);
    // 100px of invoices at 5px per unit: a 2-unit quote is 0.4px, under the 2px gap.
    expect(invoiceIsTop(100, { invoice: 500, quote: 2 })).toBe(true);
    expect(invoiceIsTop(100, { invoice: 500, quote: 10 })).toBe(true);
    expect(invoiceIsTop(100, { invoice: 500, quote: 11 })).toBe(false);
  });
});

describe("AnalyticsTab", () => {
  it("loads the shell lazily", async () => {
    render(<AnalyticsTab theme="light" />);
    expect(await screen.findByRole("heading", { name: "Analytics" })).toBeInTheDocument();
  });
});
