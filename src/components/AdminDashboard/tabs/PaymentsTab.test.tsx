import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Payment } from "@/services/api/payments";

const getPayments = vi.fn();
const quoteAdmin = vi.fn();
const confirm = vi.fn();
vi.mock("@/services/api/payments", () => ({
  getPayments: () => getPayments(),
  subscribeToPayments: () => () => {},
}));
vi.mock("@/services/api/quotes", () => ({
  quoteAdmin: (...a: unknown[]) => quoteAdmin(...a),
}));
vi.mock("../ConfirmContext", () => ({ useConfirm: () => confirm }));

import PaymentsTab from "./PaymentsTab";

/** Opens a CustomSelect by its visible label and picks an option. */
async function pick(label: RegExp, option: string) {
  await userEvent.click(screen.getByRole("combobox", { name: label }));
  await userEvent.click(screen.getByRole("option", { name: option }));
}

// Read the clock once. Reading it per row lets a millisecond tick reorder rows that should tie.
const NOW = Date.now();
const minutesAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();

let seq = 0;
const pay = (over: Partial<Payment> = {}) =>
  ({
    $id: `p${++seq}`,
    $createdAt: minutesAgo(5),
    invoiceNumber: `INV-${seq}`,
    clientName: "Ama Owusu",
    clientEmail: "ama@example.com",
    amount: 100,
    currency: "GHS",
    method: "card",
    status: "success",
    paystackReference: `REF-${seq}`,
    ...over,
  }) as Payment;

const table = () => screen.getByRole("table");
const pill = (name: RegExp) => screen.getByRole("button", { name });

async function renderTab(payments: Payment[], props: { onOpenQuote?: (id: string) => void } = {}) {
  getPayments.mockResolvedValue(payments);
  render(<PaymentsTab theme="light" {...props} />);
  await screen.findByRole("table");
}

beforeEach(() => {
  seq = 0;
  getPayments.mockReset();
  quoteAdmin.mockReset();
  confirm.mockReset();
  confirm.mockResolvedValue(true);
});

describe("PaymentsTab", () => {
  it("renders a row per payment with client, method and amount", async () => {
    await renderTab([
      pay({ clientName: "Kofi Mensah", method: "momo", note: "network:mtn", amount: 1250 }),
    ]);
    const t = within(table());
    expect(t.getByText("Kofi Mensah")).toBeInTheDocument();
    expect(t.getByText("Mobile Money")).toBeInTheDocument();
    expect(t.getByText("MTN MoMo")).toBeInTheDocument();
    expect(t.getByText("GHS 1,250.00")).toBeInTheDocument();
    expect(t.getByText("Paid")).toBeInTheDocument();
  });

  it("shows filter counts and hides abandoned attempts by default", async () => {
    await renderTab([
      pay({ clientName: "Paid Client" }),
      pay({ clientName: "Waiting Client", status: "pending" }),
      pay({ clientName: "Old Attempt", status: "pending", $createdAt: minutesAgo(45) }),
      pay({ clientName: "Failed Client", status: "failed" }),
    ]);
    expect(pill(/^All\s*3$/)).toBeInTheDocument();
    expect(pill(/^Paid\s*1$/)).toBeInTheDocument();
    expect(pill(/^Pending\s*1$/)).toBeInTheDocument();
    expect(pill(/^Failed\s*1$/)).toBeInTheDocument();
    expect(pill(/^Abandoned\s*1$/)).toBeInTheDocument();
    expect(pill(/^Archived\s*0$/)).toBeInTheDocument();
    expect(within(table()).queryByText("Old Attempt")).toBeNull();

    await userEvent.click(pill(/^Abandoned/));
    expect(within(table()).getByText("Old Attempt")).toBeInTheDocument();
    expect(within(table()).queryByText("Paid Client")).toBeNull();
  });

  it("filters by search text and by method", async () => {
    await renderTab([
      pay({ clientName: "Kofi Mensah", paystackReference: "Q-2026-0001-1-XYZ" }),
      pay({ clientName: "Ama Owusu", method: "bank" }),
    ]);
    await userEvent.type(screen.getByRole("searchbox", { name: /search payments/i }), "xyz");
    expect(within(table()).getByText("Kofi Mensah")).toBeInTheDocument();
    expect(within(table()).queryByText("Ama Owusu")).toBeNull();

    await userEvent.clear(screen.getByRole("searchbox", { name: /search payments/i }));
    await pick(/^Method /, "Bank Transfer");
    expect(within(table()).getByText("Ama Owusu")).toBeInTheDocument();
    expect(within(table()).queryByText("Kofi Mensah")).toBeNull();
  });

  it("archives a failed attempt after confirming and moves it to Archived", async () => {
    await renderTab([
      pay({ clientName: "Paid Client" }),
      pay({ status: "failed", clientName: "Failed Client" }),
    ]);
    quoteAdmin.mockResolvedValue({ payment: { id: "p2", archivedAt: "2026-10-12T12:00:00Z" } });

    await userEvent.click(within(table()).getByRole("button", { name: "Actions for REF-2" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Archive" }));

    expect(confirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(quoteAdmin).toHaveBeenCalledWith("archivePayment", { id: "p2" }));
    await waitFor(() => expect(within(table()).queryByText("Failed Client")).toBeNull());
    expect(pill(/^Archived\s*1$/)).toBeInTheDocument();

    await userEvent.click(pill(/^Archived/));
    expect(within(table()).getByText("Failed Client")).toBeInTheDocument();
    quoteAdmin.mockResolvedValue({ payment: { id: "p2", archivedAt: null } });
    await userEvent.click(within(table()).getByRole("button", { name: "Actions for REF-2" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Restore" }));
    expect(quoteAdmin).toHaveBeenLastCalledWith("restorePayment", { id: "p2" });
    await waitFor(() => expect(pill(/^Archived\s*0$/)).toBeInTheDocument());
  });

  it("does not archive when the confirmation is cancelled", async () => {
    confirm.mockResolvedValue(false);
    await renderTab([pay({ status: "failed" })]);
    await userEvent.click(within(table()).getByRole("button", { name: "Actions for REF-1" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Archive" }));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 0));
    expect(quoteAdmin).not.toHaveBeenCalled();
  });

  it("offers no archive action on a successful payment", async () => {
    await renderTab([pay()]);
    await userEvent.click(within(table()).getByRole("button", { name: "Actions for REF-1" }));
    const menu = screen.getByRole("menu");
    expect(within(menu).queryByRole("menuitem", { name: /archive/i })).toBeNull();
    expect(within(menu).getByText(/can't be archived/i)).toBeInTheDocument();
  });

  it.each([
    ["a duplicate charge", { status: "duplicate", paystackId: "99", note: "stage already paid" }],
    ["a captured mismatch", { status: "failed", paystackId: "99", note: "underpaid" }],
  ] as const)("offers no archive action on %s", async (_name, over) => {
    await renderTab([pay(over as Partial<Payment>)]);
    await userEvent.click(within(table()).getByRole("button", { name: "Actions for REF-1" }));
    const menu = screen.getByRole("menu");
    expect(within(menu).queryByRole("menuitem", { name: /archive/i })).toBeNull();
    expect(within(menu).getByText(/money was taken/i)).toBeInTheDocument();
  });

  it("keeps a paid row with a stray archivedAt visible and not marked archived", async () => {
    await renderTab([pay({ archivedAt: "2026-10-11T00:00:00Z", paystackId: "4455" })]);
    expect(pill(/^Paid\s*1$/)).toBeInTheDocument();
    expect(pill(/^Archived\s*0$/)).toBeInTheDocument();
    await userEvent.click(within(table()).getByRole("button", { name: "Details for REF-1" }));
    const details = within(table()).getByLabelText("Details for REF-1", { selector: "dl" });
    const archived = within(details).getByText("Archived").closest("div") as HTMLElement;
    expect(within(archived).getByText("None")).toBeInTheDocument();
  });

  it("shows the server's message when archiving fails", async () => {
    await renderTab([pay({ status: "failed" })]);
    quoteAdmin.mockImplementation(async () => {
      throw new Error("Sign in again.");
    });
    await userEvent.click(within(table()).getByRole("button", { name: "Actions for REF-1" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Archive" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sign in again.");
  });

  it("opens the quote a payment belongs to", async () => {
    const onOpenQuote = vi.fn();
    await renderTab([pay({ quoteId: "q1", quoteNumber: "Q-2026-0001" })], { onOpenQuote });
    await userEvent.click(within(table()).getByRole("button", { name: "Actions for REF-1" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Open quote" }));
    expect(onOpenQuote).toHaveBeenCalledWith("q1");
  });

  it("expands a row to show its details", async () => {
    await renderTab([pay({ paystackId: "4455", recordedBy: "illona@oceaniccoder.dev" })]);
    const toggle = within(table()).getByRole("button", { name: "Details for REF-1" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const details = within(table()).getByLabelText("Details for REF-1", { selector: "dl" });
    expect(within(details).getByText("4455")).toBeInTheDocument();
    expect(within(details).getByText("illona@oceaniccoder.dev")).toBeInTheDocument();
  });

  it("pages at 15 rows and goes back to page 1 when the filter changes", async () => {
    await renderTab(
      Array.from({ length: 20 }, (_, i) =>
        pay({ clientName: `Client ${i + 1}`, $createdAt: minutesAgo(5 + i) }),
      ),
    );
    expect(screen.getByText(/showing/i)).toHaveTextContent("Showing 1-15 of 20");
    expect(within(table()).queryByText("Client 16")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Page 2" }));
    expect(within(table()).getByText("Client 16")).toBeInTheDocument();
    expect(within(table()).queryByText("Client 1")).toBeNull();

    await userEvent.click(pill(/^Paid/));
    expect(screen.getByText(/showing/i)).toHaveTextContent("Showing 1-15 of 20");
  });

  it("totals money received per currency, never mixed", async () => {
    await renderTab([
      pay({ amount: 100, currency: "GHS" }),
      pay({ amount: 50, currency: "GHS" }),
      pay({ amount: 20, currency: "USD" }),
      pay({ amount: 999, currency: "GHS", status: "failed" }),
    ]);
    const allTime = screen.getByRole("region", { name: "Received all time" });
    expect(within(allTime).getByText("GHS 150.00")).toBeInTheDocument();
    expect(within(allTime).getByText("USD 20.00")).toBeInTheDocument();
    expect(within(allTime).queryByText(/170/)).toBeNull();
  });
});
