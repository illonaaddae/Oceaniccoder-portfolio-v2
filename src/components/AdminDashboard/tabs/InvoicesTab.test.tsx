import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const getInvoices = vi.fn();
const quoteAdmin = vi.fn();
vi.mock("@/services/api/invoices", () => ({
  getInvoices: () => getInvoices(),
  updateInvoice: vi.fn(),
  deleteInvoice: vi.fn(),
}));
vi.mock("@/services/api/payments", () => ({ createPayment: vi.fn() }));
vi.mock("@/services/api/adminHeaders", () => ({ adminHeaders: vi.fn().mockResolvedValue({}) }));
vi.mock("@/services/api/quotes", () => ({
  quoteAdmin: (...a: unknown[]) => quoteAdmin(...a),
}));
vi.mock("../ConfirmContext", () => ({ useConfirm: () => vi.fn().mockResolvedValue(true) }));

import InvoicesTab from "./InvoicesTab";

const oneOff = {
  $id: "inv1",
  $createdAt: "2026-09-01T10:00:00Z",
  invoiceNumber: "INV-2026-0042",
  clientName: "Ama Owusu",
  clientEmail: "ama@example.com",
  currency: "GHS",
  total: 500,
  status: "sent",
  items: [],
};

const quotes = [
  {
    id: "q1",
    quoteNumber: "Q-2026-0001",
    title: "Web Application",
    clientName: "Illona",
    status: "accepted",
    currency: "GHS",
    totalMinor: 200,
    paidMinor: 120,
    complete: false,
    nextDue: null,
    sentAt: null,
    viewedAt: null,
    updatedAt: null,
    invoices: [
      {
        stageId: "deposit",
        invoiceNumber: "Q-2026-0001-INV-1",
        label: "Deposit",
        percent: 60,
        amountMinor: 120,
        state: "paid",
        dueBy: null,
        overdue: false,
        paidAt: "2026-10-11T19:01:48Z",
      },
    ],
  },
];

beforeEach(() => {
  getInvoices.mockResolvedValue([oneOff]);
  quoteAdmin.mockResolvedValue({ quotes });
});

describe("InvoicesTab", () => {
  it("lists quote stage invoices alongside one-off invoices", async () => {
    render(<InvoicesTab theme="dark" />);
    expect(await screen.findByText("Q-2026-0001-INV-1")).toBeInTheDocument();
    expect(screen.getByText("INV-2026-0042")).toBeInTheDocument();
    expect(screen.getByText("Quote · Q-2026-0001")).toBeInTheDocument();
  });

  it("filters to quote invoices only", async () => {
    render(<InvoicesTab theme="dark" />);
    await screen.findByText("Q-2026-0001-INV-1");
    await userEvent.click(screen.getByRole("button", { name: /^quotes/i }));
    expect(screen.queryByText("INV-2026-0042")).toBeNull();
    expect(screen.getByText("Q-2026-0001-INV-1")).toBeInTheDocument();
  });

  it("opens the quote a stage invoice belongs to", async () => {
    const onOpenQuote = vi.fn();
    render(<InvoicesTab theme="dark" onOpenQuote={onOpenQuote} />);
    await userEvent.click(await screen.findByRole("button", { name: /open quote/i }));
    expect(onOpenQuote).toHaveBeenCalledWith("q1");
  });

  it("still shows one-off invoices when quote invoices fail to load", async () => {
    quoteAdmin.mockRejectedValue(new Error("Sign in again."));
    render(<InvoicesTab theme="dark" />);
    expect(await screen.findByText("INV-2026-0042")).toBeInTheDocument();
    expect(screen.getByText(/quote invoices couldn't load/i)).toBeInTheDocument();
  });
});
