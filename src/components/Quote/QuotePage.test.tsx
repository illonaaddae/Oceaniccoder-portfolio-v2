import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import type { ClientQuote } from "@/types/quote";

const fetchClientQuote = vi.fn();
const respondToQuote = vi.fn();
vi.mock("@/services/api/quotes", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/api/quotes")>("@/services/api/quotes");
  return {
    ...actual,
    fetchClientQuote: (...a: unknown[]) => fetchClientQuote(...a),
    respondToQuote: (...a: unknown[]) => respondToQuote(...a),
  };
});

import QuotePage from "./QuotePage";
import { QuoteApiError } from "@/services/api/quotes";

const baseQuote: ClientQuote = {
  quoteNumber: "Q-2026-0001",
  revision: 1,
  status: "sent",
  currency: "GHS",
  title: "Online store",
  overview: "We build your store.",
  scope: "- Catalogue\n- Checkout",
  timeline: "",
  notes: "",
  terms: "- Pay on time",
  clientName: "Kofi Mensah",
  clientCompany: "",
  clientEmail: "kofi@example.com",
  items: [
    {
      id: "item-1",
      description: "Store build",
      qty: 1,
      unitMinor: 1000000,
      lineMinor: 1000000,
      detail: "",
    },
  ],
  highlights: [],
  discountLabel: "",
  runningCosts: [],
  exclusions: "",
  assumptions: "",
  nextSteps: "",
  optionalTitle: "",
  optionalItems: [],
  optionalTotalMinor: 0,
  subtotalMinor: 1000000,
  discountMinor: 0,
  totalMinor: 1000000,
  issuedAt: "2026-10-01T00:00:00Z",
  validUntil: "2026-10-15T00:00:00Z",
  acceptedName: null,
  respondedAt: null,
  stages: [
    {
      id: "deposit",
      label: "Deposit",
      percent: 60,
      index: 0,
      amountMinor: 600000,
      state: "later",
      dueAt: null,
      dueBy: null,
      overdue: false,
      invoiceNumber: "Q-2026-0001-INV-1",
      paidAt: null,
      receiptPath: null,
      note: "",
    },
    {
      id: "balance",
      label: "Balance",
      percent: 40,
      index: 1,
      amountMinor: 400000,
      state: "later",
      dueAt: null,
      dueBy: null,
      overdue: false,
      invoiceNumber: "Q-2026-0001-INV-2",
      paidAt: null,
      receiptPath: null,
      note: "",
    },
  ],
  summary: { paidMinor: 0, balanceMinor: 1000000, complete: false },
  contact: { email: "hello@oceaniccoder.dev", whatsapp: "" },
};

const renderAt = (path = "/q/tok") =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/q/:token" element={<QuotePage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );

beforeEach(() => {
  fetchClientQuote.mockReset();
  respondToQuote.mockReset();
});

describe("QuotePage", () => {
  it("marks a paid stage with a tick instead of its number", async () => {
    fetchClientQuote.mockResolvedValue({
      quote: {
        ...baseQuote,
        status: "accepted",
        acceptedName: "Kofi Mensah",
        stages: baseQuote.stages.map((s, i) =>
          i === 0 ? { ...s, state: "paid", paidAt: "2026-10-11T19:01:48Z" } : s,
        ),
      },
    });
    renderAt();
    const plan = (await screen.findByText("How you pay")).closest("section, div")!.parentElement!;
    expect(within(plan).getAllByText("Paid").length).toBeGreaterThan(0);
    expect(within(plan).getByText("Paid", { selector: ".sr-only" })).toBeInTheDocument();
  });

  it("shows the full quote document", async () => {
    fetchClientQuote.mockResolvedValue({ quote: baseQuote });
    renderAt();
    expect(await screen.findByRole("heading", { name: "Online store" })).toBeInTheDocument();
    expect(screen.getByText("Store build")).toBeInTheDocument();
    expect(screen.getAllByText("GHS 10,000.00").length).toBeGreaterThan(0);
    expect(screen.getByText("Catalogue")).toBeInTheDocument();
    expect(screen.getByText(/GHS 6,000.00/)).toBeInTheDocument();
    expect(screen.queryByText("Standard value")).toBeNull();
  });

  it("shows the inactive screen for a dead link", async () => {
    fetchClientQuote.mockRejectedValue(new QuoteApiError("This link is no longer active.", 404));
    renderAt();
    expect(await screen.findByText(/no longer active/i)).toBeInTheDocument();
  });

  it("accepts with a typed name and agreement, then offers the deposit", async () => {
    fetchClientQuote.mockResolvedValue({ quote: baseQuote });
    const accepted: ClientQuote = {
      ...baseQuote,
      status: "accepted",
      acceptedName: "Kofi Mensah",
      respondedAt: "2026-10-02T00:00:00Z",
      stages: [
        { ...baseQuote.stages[0], state: "due", dueAt: "2026-10-02T00:00:00Z" },
        baseQuote.stages[1],
      ],
    };
    respondToQuote.mockResolvedValue({ quote: accepted });
    renderAt();
    const user = userEvent; // user-event v13 has no setup()
    await user.type(await screen.findByLabelText(/full name/i), "Kofi Mensah");
    const button = screen.getByRole("button", { name: /accept quote/i });
    expect(button).toBeDisabled();
    await user.click(screen.getByRole("checkbox"));
    await user.click(button);
    await waitFor(() =>
      expect(respondToQuote).toHaveBeenCalledWith("tok", {
        action: "accept",
        name: "Kofi Mensah",
        agree: true,
      }),
    );
    expect((await screen.findAllByRole("link", { name: /pay the deposit/i }))[0]).toHaveAttribute(
      "href",
      "/q/tok/pay/deposit",
    );
  });

  it("offers one full payment, with no deposit or balance step, for a one-stage quote", async () => {
    fetchClientQuote.mockResolvedValue({
      quote: {
        ...baseQuote,
        status: "accepted",
        acceptedName: "Kofi Mensah",
        respondedAt: "2026-10-02T00:00:00Z",
        stages: [
          {
            ...baseQuote.stages[0],
            id: "full",
            label: "Full payment",
            percent: 100,
            amountMinor: 1000000,
            state: "due",
            dueAt: "2026-10-02T00:00:00Z",
          },
        ],
      },
    });
    renderAt();
    expect(await screen.findByText(/your payment is ready/i)).toBeInTheDocument();
    for (const link of screen.getAllByRole("link", { name: /^pay now$/i })) {
      expect(link).toHaveAttribute("href", "/q/tok/pay/full");
    }
    expect(screen.queryByText(/deposit/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^balance$/i)).not.toBeInTheDocument();
  });

  it("passes preview=1 through without counting a view", async () => {
    fetchClientQuote.mockResolvedValue({ quote: baseQuote });
    renderAt("/q/tok?preview=1");
    await screen.findByRole("heading", { name: "Online store" });
    expect(fetchClientQuote).toHaveBeenCalledWith("tok", true);
  });

  it("declines with a reason", async () => {
    fetchClientQuote.mockResolvedValue({ quote: baseQuote });
    respondToQuote.mockResolvedValue({
      quote: { ...baseQuote, status: "declined", respondedAt: "2026-10-02T00:00:00Z" },
    });
    renderAt();
    await userEvent.click(await screen.findByRole("button", { name: "Decline" }));
    await userEvent.type(screen.getByLabelText(/anything we should know/i), "Too pricey");
    await userEvent.click(screen.getByRole("button", { name: /decline quote/i }));
    await waitFor(() =>
      expect(respondToQuote).toHaveBeenCalledWith("tok", {
        action: "decline",
        reason: "Too pricey",
      }),
    );
    expect(
      await screen.findByRole("link", { name: /email us at hello@oceaniccoder.dev/i }),
    ).toHaveAttribute("href", expect.stringContaining("mailto:hello@oceaniccoder.dev"));
  });

  it("renders proposal sections only when filled", async () => {
    fetchClientQuote.mockResolvedValue({ quote: baseQuote });
    renderAt();
    await screen.findByText("Online store");
    for (const t of [
      /at a glance/i,
      /running costs/i,
      /not included/i,
      /scope notes/i,
      /next steps/i,
      /optional extras/i,
    ])
      expect(screen.queryByText(t)).toBeNull();
  });

  it("shows the full proposal with optional extras kept out of the price", async () => {
    fetchClientQuote.mockResolvedValue({
      quote: {
        ...baseQuote,
        highlights: ["Live in about 14 weeks"],
        discountLabel: "First-client discount",
        discountMinor: 100000,
        subtotalMinor: 1100000,
        totalMinor: 1000000,
        items: [{ ...baseQuote.items[0], detail: "Pages, cart and checkout" }],
        runningCosts: [{ service: "Appwrite Pro", purpose: "Hosting", cost: "USD 25 / month" }],
        exclusions: "Logo design",
        assumptions: "Content on time",
        nextSteps: "Review\nAccept",
        optionalTitle: "Phase 2",
        optionalItems: [
          {
            id: "o1",
            description: "SMS",
            qty: 1,
            unitMinor: 250000,
            lineMinor: 250000,
            detail: "",
          },
        ],
        optionalTotalMinor: 250000,
        stages: baseQuote.stages.map((s, i) => ({
          ...s,
          note: i === 0 ? "To start the project" : "",
        })),
      },
    });
    renderAt();
    expect(await screen.findByText("Live in about 14 weeks")).toBeInTheDocument();
    expect(screen.getByText("Standard value")).toBeInTheDocument();
    expect(screen.getByText("First-client discount")).toBeInTheDocument();
    expect(screen.getByText("Pages, cart and checkout")).toBeInTheDocument();
    expect(screen.getByText("To start the project")).toBeInTheDocument();
    expect(screen.getByText("Appwrite Pro")).toBeInTheDocument();
    expect(screen.getByText(/not part of the price above/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        "Not included in the GHS 10,000.00 above, and not part of these payments. Ask for a separate quote when you're ready.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Logo design")).toBeInTheDocument();
    expect(screen.getByText("Content on time")).toBeInTheDocument();
    const steps = screen.getByRole("heading", { name: /next steps/i }).closest("section")!;
    expect(within(steps).getByText("Review")).toBeInTheDocument();
    expect(within(steps).getByText("Accept")).toBeInTheDocument();

    const summary = screen.getByText(/Phase 2 · Not in this quote/);
    const details = summary.closest("details") as HTMLElement;
    expect(details).not.toHaveAttribute("open");
    const accept = screen.getByRole("button", { name: /accept quote/i });
    expect(
      accept.compareDocumentPosition(summary) & 4 /* DOCUMENT_POSITION_FOLLOWING */,
    ).toBeTruthy();

    const optionalAmount = "GHS 2,500.00";
    const total = screen.getByText("Total", { selector: "dt" }).closest("div") as HTMLElement;
    expect(total).not.toHaveTextContent(optionalAmount);
    const plan = screen.getByRole("heading", { name: /how you pay/i }).closest("section")!;
    expect(plan).not.toHaveTextContent(optionalAmount);
    expect(details).toHaveTextContent(optionalAmount);

    // Long unbroken item text must wrap inside the card at narrow widths.
    expect(screen.getByText("Pages, cart and checkout").className).toMatch(
      /overflow-wrap:anywhere/,
    );
    expect(screen.getByText("Store build").className).toMatch(/overflow-wrap:anywhere/);
  });
});
