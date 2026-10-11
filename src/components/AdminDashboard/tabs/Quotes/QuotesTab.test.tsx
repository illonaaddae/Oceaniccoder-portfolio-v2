import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const quoteAdmin = vi.fn();
vi.mock("@/services/api/quotes", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/api/quotes")>("@/services/api/quotes");
  return { ...actual, quoteAdmin: (...a: unknown[]) => quoteAdmin(...a) };
});
// Revise and Cancel ask first; the tests answer yes.
vi.mock("../../ConfirmContext", () => ({ useConfirm: () => async () => true }));

import QuotesTab from "./QuotesTab";
import { setPendingQuoteDraft, setPendingQuoteOpen } from "./quoteHandoff";

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

const withStatus = (stages: typeof detail.stages, status = "accepted") => ({
  ...detail,
  stages,
  quote: { ...detail.quote, status },
});
const unpaidStages = detail.stages.map((s) => ({
  ...s,
  state: "later",
  paidAt: null,
  reference: null,
}));
const draftSummary = {
  ...summary,
  id: "q2",
  quoteNumber: "Q-2026-0002",
  title: "Booking site",
  clientName: "Ama Owusu",
  status: "draft",
  paidMinor: 0,
  nextDue: null,
  sentAt: null,
  viewedAt: null,
};
const draftDetail = {
  quote: {
    ...draftSummary,
    revision: 1,
    hasLink: false,
    items: [{ id: "item-a", description: "Site build", qty: 1, unitMinor: 500000 }],
    schedule: [],
    clientEmail: "ama@example.com",
  },
  stages: unpaidStages,
  payments: [],
};

// The read-only page also has a "Payment stages" section, so look in the sidebar.
const sidebar = () => screen.findByRole("complementary", { name: /status and actions/i });

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
    expect(screen.getByRole("heading", { name: "New quote" })).toBeInTheDocument();
    expect(screen.getByLabelText(/client name/i)).toHaveValue("");
    expect(screen.queryByText("Online store")).not.toBeInTheDocument();
  });

  it("opens the editor prefilled when Client Work hands over a draft", async () => {
    setPendingQuoteDraft({ clientName: "Ama Owusu" });
    render(<QuotesTab theme="dark" />);
    expect(screen.getByRole("heading", { name: "New quote" })).toBeInTheDocument();
    expect(screen.getByLabelText(/client name/i)).toHaveValue("Ama Owusu");
  });

  it("switches a new quote to its own page after the first save", async () => {
    quoteAdmin.mockImplementation(async (action: string, payload?: { id?: string }) => {
      if (action === "list") return { quotes: [summary] };
      if (action === "create") return draftDetail;
      if (action === "get" && payload?.id === "q2") return draftDetail;
      throw new Error(`unexpected ${action}`);
    });
    render(<QuotesTab theme="dark" />);
    await userEvent.click(await screen.findByRole("button", { name: /new quote/i }));
    await userEvent.type(screen.getByLabelText(/client name/i), "Ama Owusu");
    await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
    expect(await screen.findByText("Q-2026-0002")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "New quote" })).toBeNull();
    expect(screen.getByLabelText(/client name/i)).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /all quotes/i })).toBeInTheDocument();
  });

  it("opens the quote page when the Invoices tab hands over a quote", async () => {
    setPendingQuoteOpen("q1");
    render(<QuotesTab theme="dark" />);
    expect(await screen.findByRole("button", { name: /all quotes/i })).toBeInTheDocument();
    expect(await within(await sidebar()).findByText("Payment stages")).toBeInTheDocument();
    expect(quoteAdmin).toHaveBeenCalledWith("get", { id: "q1" });
  });

  it("opens a sent quote as a read-only page with its actions", async () => {
    quoteAdmin.mockImplementation(async (action: string) => {
      if (action === "list") return { quotes: [{ ...summary, status: "sent" }, draftSummary] };
      if (action === "get") return withStatus(unpaidStages, "sent");
      throw new Error(`unexpected ${action}`);
    });
    render(<QuotesTab theme="dark" />);
    await userEvent.click(await screen.findByText("Q-2026-0001"));
    expect(await screen.findByRole("button", { name: /all quotes/i })).toBeInTheDocument();
    // The header renders before the quote's detail arrives; wait for the form.
    expect(await screen.findByLabelText(/client name/i)).toBeDisabled();
    expect(screen.getByLabelText(/description for item 1/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /revise/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^next/i })).toBeNull();
  });

  it("opens a draft as the editable stepper and stays there after saving", async () => {
    quoteAdmin.mockImplementation(async (action: string, payload?: { id?: string }) => {
      if (action === "list") return { quotes: [summary, draftSummary] };
      if (action === "get" && payload?.id === "q2") return draftDetail;
      if (action === "save") return draftDetail;
      throw new Error(`unexpected ${action}`);
    });
    render(<QuotesTab theme="dark" />);
    await userEvent.click(await screen.findByText("Q-2026-0002"));
    const name = await screen.findByLabelText(/client name/i);
    expect(name).not.toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() =>
      expect(quoteAdmin).toHaveBeenCalledWith("save", expect.objectContaining({ id: "q2" })),
    );
    expect(await screen.findByRole("button", { name: /all quotes/i })).toBeInTheDocument();
    expect(await screen.findByLabelText(/client name/i)).not.toBeDisabled();
  });

  it("goes back to the list", async () => {
    render(<QuotesTab theme="dark" />);
    await userEvent.click(await screen.findByText("Q-2026-0001"));
    await userEvent.click(await screen.findByRole("button", { name: /all quotes/i }));
    expect(await screen.findByRole("button", { name: /new quote/i })).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: /status and actions/i })).toBeNull();
  });

  it("turns the page back into the editable stepper after Revise", async () => {
    quoteAdmin.mockImplementation(async (action: string) => {
      if (action === "list") return { quotes: [{ ...summary, status: "sent" }] };
      if (action === "get") return withStatus(unpaidStages, "sent");
      if (action === "revise") return withStatus(unpaidStages, "draft");
      throw new Error(`unexpected ${action}`);
    });
    render(<QuotesTab theme="dark" />);
    await userEvent.click(await screen.findByText("Q-2026-0001"));
    expect(await screen.findByLabelText(/client name/i)).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: /revise/i }));
    await waitFor(() => expect(quoteAdmin).toHaveBeenCalledWith("revise", { id: "q1" }));
    expect(await screen.findByText(/Back to draft/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(/client name/i)).not.toBeDisabled());
    expect(screen.getByRole("navigation", { name: /quote steps/i })).toBeInTheDocument();
  });

  const open = async () => {
    render(<QuotesTab theme="dark" />);
    await userEvent.click(await screen.findByText("Online store"));
  };

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
    await within(await sidebar()).findByText("Payment stages");
    expect(screen.queryByRole("button", { name: /cancel quote/i })).toBeNull();
  });

  it("offers Cancel quote when nothing is paid", async () => {
    quoteAdmin.mockImplementation(async (action: string) => {
      if (action === "list") return { quotes: [summary] };
      return withStatus(unpaidStages, "sent");
    });
    await open();
    expect(await screen.findByRole("button", { name: /cancel quote/i })).toBeInTheDocument();
  });

  it("never offers Request for the deposit or a paid stage", async () => {
    await open();
    await within(await sidebar()).findByText("Payment stages");
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
