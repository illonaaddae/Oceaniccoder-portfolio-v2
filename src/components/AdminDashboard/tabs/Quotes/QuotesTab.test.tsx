import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const quoteAdmin = vi.fn();
vi.mock("@/services/api/quotes", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/api/quotes")>("@/services/api/quotes");
  return { ...actual, quoteAdmin: (...a: unknown[]) => quoteAdmin(...a) };
});
vi.mock("./QuoteEditor", () => ({ default: () => <div>editor open</div> }));

import QuotesTab from "./QuotesTab";

const summary = {
  id: "q1",
  quoteNumber: "Q-2026-0001",
  title: "Online store",
  clientName: "Kofi Mensah",
  status: "accepted",
  currency: "GHS",
  totalMinor: 1000000,
  paidMinor: 600000,
  complete: false,
  nextDue: { id: "balance", label: "Balance", overdue: false },
  sentAt: "2026-10-01T00:00:00Z",
  viewedAt: "2026-10-01T01:00:00Z",
  updatedAt: null,
};
const detail = {
  quote: {
    ...summary,
    revision: 1,
    hasLink: true,
    items: [],
    schedule: [],
    acceptedName: "Kofi Mensah",
    respondedAt: "2026-10-02T00:00:00Z",
    clientEmail: "kofi@example.com",
  },
  stages: [
    {
      id: "deposit",
      label: "Deposit",
      percent: 60,
      index: 0,
      amountMinor: 600000,
      state: "paid",
      dueAt: null,
      overdue: false,
      invoiceNumber: "Q-2026-0001-INV-1",
      paidAt: "2026-10-02T00:00:00Z",
      reference: "R1",
    },
    {
      id: "balance",
      label: "Balance",
      percent: 40,
      index: 1,
      amountMinor: 400000,
      state: "later",
      dueAt: null,
      overdue: false,
      invoiceNumber: "Q-2026-0001-INV-2",
      paidAt: null,
      reference: null,
    },
  ],
  payments: [],
};

beforeEach(() => {
  quoteAdmin.mockReset();
  quoteAdmin.mockImplementation(async (action: string) => {
    if (action === "list") return { quotes: [summary] };
    if (action === "get") return detail;
    if (action === "requestStage")
      return { ...detail, link: "https://oceaniccoder.dev/q/NEW", emailed: true };
    throw new Error(`unexpected ${action}`);
  });
});

describe("QuotesTab", () => {
  it("lists quotes with amount paid and next stage", async () => {
    render(<QuotesTab theme="dark" />);
    expect(await screen.findByText("Online store")).toBeInTheDocument();
    expect(screen.getByText(/GHS 6,000.00 of GHS 10,000.00/)).toBeInTheDocument();
    expect(screen.getByText(/Next: Balance/)).toBeInTheDocument();
  });

  it("opens the detail and requests the balance", async () => {
    render(<QuotesTab theme="dark" />);
    await userEvent.click(await screen.findByText("Online store"));
    await userEvent.click(await screen.findByRole("button", { name: /request balance/i }));
    await waitFor(() =>
      expect(quoteAdmin).toHaveBeenCalledWith("requestStage", { id: "q1", stageId: "balance" }),
    );
    expect(await screen.findByDisplayValue("https://oceaniccoder.dev/q/NEW")).toBeInTheDocument();
  });

  it("opens the editor for a new quote", async () => {
    render(<QuotesTab theme="dark" />);
    await userEvent.click(await screen.findByRole("button", { name: /new quote/i }));
    expect(screen.getByText("editor open")).toBeInTheDocument();
  });
});
