import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const quoteAdmin = vi.fn();
vi.mock("@/services/api/quotes", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/api/quotes")>("@/services/api/quotes");
  return { ...actual, quoteAdmin: (...a: unknown[]) => quoteAdmin(...a) };
});
vi.mock("../../ConfirmContext", () => ({ useConfirm: () => async () => true }));

import QuoteWorkspace from "./QuoteWorkspace";

const stages = [
  {
    id: "deposit",
    label: "Deposit",
    percent: 60,
    index: 0,
    amountMinor: 300000,
    state: "later",
    dueAt: null,
    overdue: false,
    invoiceNumber: "Q-2026-0002-INV-1",
    paidAt: null,
    reference: null,
  },
];
const quote = {
  id: "q2",
  quoteNumber: "Q-2026-0002",
  title: "Booking site",
  clientName: "Ama Owusu",
  clientEmail: "ama@example.com",
  status: "draft",
  currency: "GHS",
  revision: 1,
  totalMinor: 500000,
  hasLink: false,
  items: [{ id: "item-a", description: "Site build", qty: 1, unitMinor: 500000 }],
  schedule: [
    { id: "deposit", label: "Deposit", percent: 60 },
    { id: "balance", label: "Balance", percent: 40 },
  ],
};
const draftDetail = { quote, stages, payments: [] };
const sentDetail = { ...draftDetail, quote: { ...quote, status: "sent", hasLink: true } };

const sidebar = () => screen.getByRole("complementary", { name: /status and actions/i });

beforeEach(() => {
  quoteAdmin.mockReset();
});

describe("QuoteWorkspace", () => {
  it("blocks the sidebar Send while a price box holds invalid text", async () => {
    quoteAdmin.mockImplementation(async (action: string) => {
      if (action === "get") return draftDetail;
      throw new Error(`unexpected ${action}`);
    });
    render(<QuoteWorkspace id="q2" theme="dark" onBack={vi.fn()} />);
    await userEvent.click(await screen.findByRole("button", { name: /line items/i }));
    const send = within(sidebar()).getByRole("button", { name: /send to client/i });
    expect(send).toBeEnabled();
    // Text appended to the saved amount is invalid, so the draft itself never
    // changes and nothing counts as unsaved.
    await userEvent.type(screen.getByLabelText(/price for item 1/i), "x");
    expect(send).toBeDisabled();
    expect(within(sidebar()).getByText(/enter a valid amount/i)).toBeInTheDocument();
  });

  it("shows the new link in the sent panel after New link", async () => {
    let sent = false;
    quoteAdmin.mockImplementation(async (action: string) => {
      if (action === "get") return sent ? sentDetail : draftDetail;
      if (action === "save") return draftDetail;
      if (action === "send") {
        sent = true;
        return { ...sentDetail, link: "https://oceaniccoder.dev/q/OLD", emailed: true };
      }
      if (action === "rotate")
        return { ...sentDetail, link: "https://oceaniccoder.dev/q/NEW", emailed: false };
      throw new Error(`unexpected ${action}`);
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    render(<QuoteWorkspace id="q2" theme="dark" onBack={vi.fn()} />);
    await userEvent.click(await screen.findByRole("button", { name: /^7\. Review/ }));
    await userEvent.click(screen.getByRole("button", { name: /save and send/i }));
    const panel = await screen.findByRole("region", { name: /quote sent/i });
    expect(within(panel).getByLabelText("Quote link")).toHaveValue(
      "https://oceaniccoder.dev/q/OLD",
    );
    await userEvent.click(within(panel).getByRole("button", { name: /copy link/i }));
    expect(await within(panel).findByRole("button", { name: /copied/i })).toBeInTheDocument();

    await userEvent.click(await within(sidebar()).findByRole("button", { name: /new link/i }));
    await waitFor(() =>
      expect(within(panel).getByLabelText("Quote link")).toHaveValue(
        "https://oceaniccoder.dev/q/NEW",
      ),
    );
    expect(within(panel).getByRole("button", { name: /copy link/i })).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: /open as the client/i })).toHaveAttribute(
      "href",
      "https://oceaniccoder.dev/q/NEW?preview=1",
    );
  });
});
