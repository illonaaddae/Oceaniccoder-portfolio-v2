import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const getInvoices = vi.fn();
const updateInvoice = vi.fn();
const createPayment = vi.fn();
const getPaymentsForInvoice = vi.fn();
const quoteAdmin = vi.fn();
const confirm = vi.fn();
vi.mock("@/services/api/invoices", () => ({
  getInvoices: () => getInvoices(),
  updateInvoice: (...a: unknown[]) => updateInvoice(...a),
}));
vi.mock("@/services/api/payments", () => ({
  createPayment: (...a: unknown[]) => createPayment(...a),
  getPaymentsForInvoice: (n: string) => getPaymentsForInvoice(n),
}));
vi.mock("@/services/api/adminHeaders", () => ({ adminHeaders: vi.fn().mockResolvedValue({}) }));
vi.mock("@/services/api/quotes", () => ({
  quoteAdmin: (...a: unknown[]) => quoteAdmin(...a),
}));
vi.mock("../ConfirmContext", () => ({ useConfirm: () => confirm }));

import InvoicesTab from "./InvoicesTab";

/** Opens a CustomSelect by its visible label and picks an option. */
async function pick(label: RegExp, option: string) {
  await userEvent.click(screen.getByRole("button", { name: label }));
  await userEvent.click(screen.getByRole("option", { name: option }));
}

const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

const oneOff = {
  $id: "inv1",
  $createdAt: "2026-09-01T10:00:00Z",
  invoiceNumber: "INV-2026-0042",
  clientName: "Ama Owusu",
  clientEmail: "ama@example.com",
  currency: "GHS",
  subtotal: 500,
  tax: 0,
  total: 500,
  status: "sent",
  dueDate: daysFromNow(10),
  notes: "Thanks for the work",
  items: JSON.stringify([
    { description: "Landing page", quantity: 1, unitPrice: 300 },
    { description: "Hosting setup", quantity: 2, unitPrice: 100 },
  ]),
};

const stage = (over = {}) => ({
  stageId: "deposit",
  invoiceNumber: "Q-2026-0001-INV-1",
  label: "Deposit",
  percent: 60,
  amountMinor: 120,
  state: "paid",
  issuedAt: "2026-10-10T19:01:48Z",
  dueBy: null,
  overdue: false,
  paidAt: "2026-10-11T19:01:48Z",
  ...over,
});

const quote = (invoices: unknown[]) => ({
  id: "q1",
  quoteNumber: "Q-2026-0001",
  title: "Web Application",
  clientName: "Illona",
  clientEmail: "illona@example.com",
  status: "accepted",
  currency: "GHS",
  totalMinor: 200,
  paidMinor: 120,
  complete: false,
  nextDue: null,
  sentAt: null,
  viewedAt: null,
  updatedAt: null,
  invoices,
});

let quotes = [quote([stage()])];

// The list call and the archive calls share the quoteAdmin mock.
function routeQuoteAdmin(archive: () => Promise<unknown>) {
  quoteAdmin.mockImplementation(async (action: string) =>
    action === "list" ? { quotes } : archive(),
  );
}

const table = () => screen.getByRole("table", { name: "Invoices" });
const pill = (name: RegExp) => screen.getByRole("button", { name });
const openMenu = async (number: string) => {
  await userEvent.click(within(table()).getByRole("button", { name: `Actions for ${number}` }));
  return screen.getByRole("menu");
};
const menuItems = (menu: HTMLElement) =>
  within(menu)
    .getAllByRole("menuitem")
    .map((i) => i.textContent);

async function renderTab(props: { onOpenQuote?: (id: string) => void } = {}) {
  render(<InvoicesTab theme="light" {...props} />);
  await screen.findByRole("table", { name: "Invoices" });
}

beforeEach(() => {
  quotes = [quote([stage()])];
  getInvoices.mockReset();
  getInvoices.mockResolvedValue([oneOff]);
  updateInvoice.mockReset();
  updateInvoice.mockResolvedValue({});
  createPayment.mockReset();
  createPayment.mockResolvedValue({});
  getPaymentsForInvoice.mockReset();
  getPaymentsForInvoice.mockResolvedValue([]);
  quoteAdmin.mockReset();
  routeQuoteAdmin(async () => ({}));
  confirm.mockReset();
  confirm.mockResolvedValue(true);
  global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
});

describe("InvoicesTab", () => {
  it("lists quote stage invoices alongside one-off invoices, in one money format", async () => {
    await renderTab();
    const t = within(table());
    expect(t.getByText("Q-2026-0001-INV-1")).toBeInTheDocument();
    expect(t.getByText("INV-2026-0042")).toBeInTheDocument();
    expect(t.getByText("Q-2026-0001 · Deposit")).toBeInTheDocument();
    expect(t.getByText("One-off · 2 items")).toBeInTheDocument();
    expect(t.getByText("GHS 500.00")).toBeInTheDocument();
    expect(t.getByText("GHS 1.20")).toBeInTheDocument();
    expect(t.queryByText(/₵/)).toBeNull();
  });

  it("filters by source and by search", async () => {
    await renderTab();
    await pick(/^Source /, "Quote stages");
    expect(within(table()).queryByText("INV-2026-0042")).toBeNull();
    expect(within(table()).getByText("Q-2026-0001-INV-1")).toBeInTheDocument();

    await pick(/^Source /, "All sources");
    await userEvent.type(screen.getByRole("searchbox", { name: /search invoices/i }), "ama@");
    expect(within(table()).getByText("INV-2026-0042")).toBeInTheDocument();
    expect(within(table()).queryByText("Q-2026-0001-INV-1")).toBeNull();
  });

  it("finds a quote stage invoice by its quote number", async () => {
    await renderTab();
    await userEvent.type(
      screen.getByRole("searchbox", { name: /search invoices/i }),
      "Q-2026-0001",
    );
    expect(await within(table()).findByText("Q-2026-0001-INV-1")).toBeInTheDocument();
    expect(within(table()).queryByText("INV-2026-0042")).toBeNull();
    // Let the last keystroke's updates settle before the next test renders.
    expect(await screen.findByRole("searchbox", { name: /search invoices/i })).toHaveValue(
      "Q-2026-0001",
    );
  });

  it("shows a banner and keeps quote invoices when one-off invoices fail to load", async () => {
    getInvoices.mockImplementation(async () => {
      throw new Error("Network down");
    });
    await renderTab();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "One-off invoices couldn't load: Network down",
    );
    expect(within(table()).getByText("Q-2026-0001-INV-1")).toBeInTheDocument();
  });

  it("offers Open quote and Copy on a quote stage invoice, and opens the quote", async () => {
    const onOpenQuote = vi.fn();
    await renderTab({ onOpenQuote });
    const menu = await openMenu("Q-2026-0001-INV-1");
    expect(menuItems(menu)).toEqual(["Details", "Open quote", "Copy invoice number"]);
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Open quote" }));
    expect(onOpenQuote).toHaveBeenCalledWith("q1");
  });

  it("offers pay page, mark as paid, copy and archive on an unpaid one-off invoice", async () => {
    await renderTab();
    const menu = await openMenu("INV-2026-0042");
    expect(menuItems(menu)).toEqual([
      "Details",
      "View pay page",
      "Mark as paid",
      "Copy invoice number",
      "Archive",
    ]);
  });

  it("opens the pay page in a new tab", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    await renderTab();
    const menu = await openMenu("INV-2026-0042");
    await userEvent.click(within(menu).getByRole("menuitem", { name: "View pay page" }));
    expect(open).toHaveBeenCalledWith("/pay/INV-2026-0042", "_blank", "noopener,noreferrer");
    open.mockRestore();
  });

  it("marks a one-off invoice paid and records the payment", async () => {
    confirm.mockResolvedValue("momo");
    await renderTab();
    const menu = await openMenu("INV-2026-0042");
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Mark as paid" }));
    await waitFor(() => expect(updateInvoice).toHaveBeenCalledWith("inv1", { status: "paid" }));
    await waitFor(() =>
      expect(createPayment).toHaveBeenCalledWith(
        expect.objectContaining({ invoiceNumber: "INV-2026-0042", method: "momo", amount: 500 }),
      ),
    );
    await waitFor(() => expect(pill(/^Paid\s*2$/)).toBeInTheDocument());
  });

  it("records only the balance when part of the invoice is already paid", async () => {
    getPaymentsForInvoice.mockResolvedValue([
      { invoiceNumber: "INV-2026-0042", amount: 200, currency: "GHS", status: "success" },
      { invoiceNumber: "INV-2026-0042", amount: 300, currency: "GHS", status: "failed" },
    ]);
    confirm.mockResolvedValue("bank");
    await renderTab();
    const menu = await openMenu("INV-2026-0042");
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Mark as paid" }));
    await waitFor(() => expect(createPayment).toHaveBeenCalledTimes(1));
    expect(getPaymentsForInvoice).toHaveBeenCalledWith("INV-2026-0042");
    expect(confirm.mock.calls[0][0].description).toMatch(
      /Records the balance of GHS 300.00 \(GHS 200.00 is already recorded\)/,
    );
    expect(createPayment).toHaveBeenCalledWith(
      expect.objectContaining({ invoiceNumber: "INV-2026-0042", amount: 300, method: "bank" }),
    );
  });

  it("marks a fully recorded invoice paid without adding a payment", async () => {
    getPaymentsForInvoice.mockResolvedValue([
      { invoiceNumber: "INV-2026-0042", amount: 500, currency: "GHS", status: "success" },
    ]);
    await renderTab();
    const menu = await openMenu("INV-2026-0042");
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Mark as paid" }));
    await waitFor(() => expect(updateInvoice).toHaveBeenCalledWith("inv1", { status: "paid" }));
    expect(confirm.mock.calls[0][0]).not.toHaveProperty("choices");
    expect(confirm.mock.calls[0][0].description).toMatch(/already recorded, so no new payment/);
    expect(createPayment).not.toHaveBeenCalled();
  });

  it("changes nothing when the recorded payments can't be read", async () => {
    getPaymentsForInvoice.mockImplementation(async () => {
      throw new Error("Network down");
    });
    await renderTab();
    const menu = await openMenu("INV-2026-0042");
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Mark as paid" }));
    expect(
      await screen.findByText(/Couldn't check the payments already recorded/),
    ).toBeInTheDocument();
    expect(confirm).not.toHaveBeenCalled();
    expect(updateInvoice).not.toHaveBeenCalled();
  });

  it("still shows one-off invoices when quote invoices fail to load", async () => {
    quoteAdmin.mockImplementation(async () => {
      throw new Error("Sign in again.");
    });
    await renderTab();
    expect(within(table()).getByText("INV-2026-0042")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/quote invoices couldn't load/i);
  });

  it("shows the summary and filters when only quote invoices exist", async () => {
    getInvoices.mockResolvedValue([]);
    await renderTab();
    expect(screen.getByRole("region", { name: "Invoiced" })).toBeInTheDocument();
    expect(pill(/^All\s*1$/)).toBeInTheDocument();
  });

  it("counts statuses in the filter pills and splits due from overdue", async () => {
    quotes = [
      quote([
        stage(),
        stage({
          stageId: "balance",
          invoiceNumber: "Q-2026-0001-INV-2",
          label: "Balance",
          percent: 40,
          amountMinor: 80,
          state: "due",
          dueBy: daysFromNow(-2),
          overdue: true,
          paidAt: null,
        }),
      ]),
    ];
    getInvoices.mockResolvedValue([
      oneOff,
      { ...oneOff, $id: "inv2", invoiceNumber: "INV-2", dueDate: daysFromNow(-3) },
      { ...oneOff, $id: "inv3", invoiceNumber: "INV-3", status: "draft" },
    ]);
    await renderTab();
    expect(pill(/^All\s*5$/)).toBeInTheDocument();
    expect(pill(/^Draft\s*1$/)).toBeInTheDocument();
    expect(pill(/^Due\s*1$/)).toBeInTheDocument();
    expect(pill(/^Overdue\s*2$/)).toBeInTheDocument();
    expect(pill(/^Paid\s*1$/)).toBeInTheDocument();

    await userEvent.click(pill(/^Overdue/));
    expect(within(table()).getByText("INV-2")).toBeInTheDocument();
    expect(within(table()).getByText("Q-2026-0001-INV-2")).toBeInTheDocument();
    expect(within(table()).queryByText("INV-2026-0042")).toBeNull();
  });

  it("totals the KPI cards per currency and counts overdue invoices", async () => {
    getInvoices.mockResolvedValue([
      oneOff,
      { ...oneOff, $id: "inv2", invoiceNumber: "INV-2", currency: "USD", total: 40 },
      { ...oneOff, $id: "inv3", invoiceNumber: "INV-3", total: 25, dueDate: daysFromNow(-1) },
      { ...oneOff, $id: "inv4", invoiceNumber: "INV-4", status: "draft", total: 999 },
    ]);
    await renderTab();
    const outstanding = within(screen.getByRole("region", { name: "Outstanding" }));
    expect(outstanding.getByText("3 invoices")).toBeInTheDocument();
    expect(outstanding.getByText("GHS 525.00")).toBeInTheDocument();
    expect(outstanding.getByText("USD 40.00")).toBeInTheDocument();
    const overdue = within(screen.getByRole("region", { name: "Overdue" }));
    expect(overdue.getByText("1 invoice")).toBeInTheDocument();
    expect(overdue.getByText("GHS 25.00")).toBeInTheDocument();
    // Paid: only the quote deposit. Drafts count nowhere.
    expect(
      within(screen.getByRole("region", { name: "Paid" })).getByText("GHS 1.20"),
    ).toBeInTheDocument();
    expect(screen.queryByText("GHS 999.00", { selector: "li, p" })).toBeNull();
  });

  it("shows line items and totals for a one-off invoice", async () => {
    await renderTab();
    await userEvent.click(
      within(table()).getByRole("button", { name: "Details for INV-2026-0042" }),
    );
    const details = within(table()).getByRole("group", { name: "Details for INV-2026-0042" });
    expect(within(details).getByText("Landing page")).toBeInTheDocument();
    expect(within(details).getByText("Hosting setup")).toBeInTheDocument();
    expect(within(details).getByText("GHS 200.00")).toBeInTheDocument(); // 2 x 100
    expect(within(details).getByText("Thanks for the work")).toBeInTheDocument();
  });

  it("shows stage facts for a quote stage invoice", async () => {
    await renderTab();
    await userEvent.click(
      within(table()).getByRole("button", { name: "Details for Q-2026-0001-INV-1" }),
    );
    const details = within(table()).getByLabelText("Details for Q-2026-0001-INV-1", {
      selector: "dl",
    });
    expect(within(details).getByText("Deposit (60%)")).toBeInTheDocument();
    expect(within(details).getByText("Q-2026-0001 · Web Application")).toBeInTheDocument();
  });

  it("archives a one-off invoice after confirming and moves it to Archived", async () => {
    routeQuoteAdmin(async () => ({ invoice: { id: "inv1", archivedAt: "2026-10-12T12:00:00Z" } }));
    await renderTab();
    const menu = await openMenu("INV-2026-0042");
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Archive" }));
    expect(confirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(quoteAdmin).toHaveBeenCalledWith("archiveInvoice", { id: "inv1" }));
    await waitFor(() => expect(within(table()).queryByText("INV-2026-0042")).toBeNull());
    expect(pill(/^Archived\s*1$/)).toBeInTheDocument();
  });

  it("lists archived invoices under Archived and restores them, without Mark as paid", async () => {
    getInvoices.mockResolvedValue([{ ...oneOff, archivedAt: "2026-10-11T00:00:00Z" }]);
    routeQuoteAdmin(async () => ({ invoice: { id: "inv1", archivedAt: null } }));
    await renderTab();
    expect(within(table()).queryByText("INV-2026-0042")).toBeNull();
    await userEvent.click(pill(/^Archived\s*1$/));
    expect(within(table()).getByText("INV-2026-0042")).toBeInTheDocument();
    const menu = await openMenu("INV-2026-0042");
    expect(menuItems(menu)).not.toContain("Mark as paid");
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Restore" }));
    await waitFor(() => expect(quoteAdmin).toHaveBeenCalledWith("restoreInvoice", { id: "inv1" }));
    await waitFor(() => expect(pill(/^Archived\s*0$/)).toBeInTheDocument());
  });

  it("does not archive when the confirmation is cancelled", async () => {
    confirm.mockResolvedValue(false);
    await renderTab();
    const menu = await openMenu("INV-2026-0042");
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Archive" }));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(quoteAdmin).not.toHaveBeenCalledWith("archiveInvoice", expect.anything());
  });

  it("shows the server's message when an archive is refused", async () => {
    routeQuoteAdmin(async () => {
      throw new Error("This invoice has a payment recorded against it, so it can't be archived.");
    });
    await renderTab();
    const menu = await openMenu("INV-2026-0042");
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Archive" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/payment recorded against it/i);
  });

  it("offers no archive or mark as paid on a paid one-off invoice", async () => {
    getInvoices.mockResolvedValue([{ ...oneOff, status: "paid" }]);
    await renderTab();
    const menu = await openMenu("INV-2026-0042");
    expect(menuItems(menu)).toEqual(["Details", "View pay page", "Copy invoice number"]);
  });

  it("counts a paid invoice with a stray archivedAt as paid, not archived", async () => {
    getInvoices.mockResolvedValue([
      { ...oneOff, status: "paid", archivedAt: "2026-10-11T00:00:00Z" },
    ]);
    await renderTab();
    expect(pill(/^Archived\s*0$/)).toBeInTheDocument();
    expect(pill(/^Paid\s*2$/)).toBeInTheDocument();
  });

  it("pages at 15 rows and goes back to page 1 when the filter changes", async () => {
    getInvoices.mockResolvedValue(
      Array.from({ length: 20 }, (_, i) => ({
        ...oneOff,
        $id: `inv${i}`,
        invoiceNumber: `INV-${String(i).padStart(2, "0")}`,
        $createdAt: daysFromNow(-i),
      })),
    );
    await renderTab();
    expect(screen.getByText(/showing/i)).toHaveTextContent("Showing 1-15 of 21");
    await userEvent.click(screen.getByRole("button", { name: "Page 2" }));
    expect(screen.getByText(/showing/i)).toHaveTextContent("Showing 16-21 of 21");
    await userEvent.click(pill(/^Due/));
    expect(screen.getByText(/showing/i)).toHaveTextContent("Showing 1-15 of 20");
  });
});
