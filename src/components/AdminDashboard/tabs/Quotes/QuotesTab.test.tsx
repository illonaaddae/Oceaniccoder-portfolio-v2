import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const quoteAdmin = vi.fn();
vi.mock("@/services/api/quotes", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/api/quotes")>("@/services/api/quotes");
  return { ...actual, quoteAdmin: (...a: unknown[]) => quoteAdmin(...a) };
});
vi.mock("./QuoteEditor", () => ({
  default: (p: { initial?: { clientName?: string } }) => (
    <div>editor open{p.initial?.clientName ? ` for ${p.initial.clientName}` : ""}</div>
  ),
}));

import QuotesTab from "./QuotesTab";
import { setPendingQuoteDraft } from "./quoteHandoff";

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

  it("opens the editor for a new quote in place of the list", async () => {
    render(<QuotesTab theme="dark" />);
    await userEvent.click(await screen.findByRole("button", { name: /new quote/i }));
    expect(screen.getByText("editor open")).toBeInTheDocument();
    expect(screen.queryByText("Online store")).not.toBeInTheDocument();
  });

  it("opens the editor prefilled when Client Work hands over a draft", async () => {
    setPendingQuoteDraft({ clientName: "Ama Owusu" });
    render(<QuotesTab theme="dark" />);
    expect(screen.getByText("editor open for Ama Owusu")).toBeInTheDocument();
  });

  const open = async () => {
    render(<QuotesTab theme="dark" />);
    await userEvent.click(await screen.findByText("Online store"));
  };
  const withStatus = (stages: typeof detail.stages, status = "accepted") => ({
    ...detail,
    stages,
    quote: { ...detail.quote, status },
  });

  it("records a manual payment and closes the form", async () => {
    quoteAdmin.mockImplementation(async (action: string) => {
      if (action === "list") return { quotes: [summary] };
      if (action === "get") return detail;
      if (action === "recordManual") return detail;
      throw new Error(`unexpected ${action}`);
    });
    await open();
    await userEvent.click(
      await screen.findByRole("button", { name: "Record payment for Balance" }),
    );
    await userEvent.type(screen.getByLabelText("Note"), "ref 42");
    await userEvent.click(screen.getByRole("button", { name: "Record payment" }));
    await waitFor(() =>
      expect(quoteAdmin).toHaveBeenCalledWith("recordManual", {
        id: "q1",
        stageId: "balance",
        method: "bank",
        note: "ref 42",
      }),
    );
    expect(await screen.findByText(/Payment recorded and receipt emailed/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Note")).toBeNull();
  });

  it("keeps the form and note when recording fails", async () => {
    quoteAdmin.mockImplementation(async (action: string) => {
      if (action === "list") return { quotes: [summary] };
      if (action === "get") return detail;
      throw new Error("Server said no");
    });
    await open();
    await userEvent.click(
      await screen.findByRole("button", { name: "Record payment for Balance" }),
    );
    await userEvent.type(screen.getByLabelText("Note"), "ref 42");
    await userEvent.click(screen.getByRole("button", { name: "Record payment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Server said no");
    expect(screen.getByLabelText("Note")).toHaveValue("ref 42");
  });

  it("hides Cancel quote once a stage is paid", async () => {
    await open();
    await screen.findByText("Payment stages");
    expect(screen.queryByRole("button", { name: /cancel quote/i })).toBeNull();
  });

  it("offers Cancel quote when nothing is paid", async () => {
    quoteAdmin.mockImplementation(async (action: string) => {
      if (action === "list") return { quotes: [summary] };
      return withStatus(
        detail.stages.map((s) => ({ ...s, state: "later", paidAt: null, reference: null })),
        "sent",
      );
    });
    await open();
    expect(await screen.findByRole("button", { name: /cancel quote/i })).toBeInTheDocument();
  });

  it("never offers Request for the deposit or a paid stage", async () => {
    await open();
    await screen.findByText("Payment stages");
    expect(screen.queryByRole("button", { name: /request deposit/i })).toBeNull();
    expect(screen.getAllByRole("button", { name: /^request /i })).toHaveLength(1);
  });

  it("tells the admin to share the link when the send email fails", async () => {
    quoteAdmin.mockImplementation(async (action: string) => {
      if (action === "list") return { quotes: [summary] };
      if (action === "get") return withStatus(detail.stages, "draft");
      if (action === "send")
        return {
          ...withStatus(detail.stages, "sent"),
          link: "https://oceaniccoder.dev/q/X",
          emailed: false,
        };
      throw new Error(`unexpected ${action}`);
    });
    await open();
    await userEvent.click(await screen.findByRole("button", { name: /send to client/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The email didn't send; copy the link below and share it yourself.",
    );
  });
});
