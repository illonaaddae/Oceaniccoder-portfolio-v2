import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { ClientQuote, QuoteDetailResponse } from "@/types/quote";

const quoteAdmin = vi.fn();
vi.mock("@/services/api/quotes", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/api/quotes")>("@/services/api/quotes");
  return { ...actual, quoteAdmin: (...a: unknown[]) => quoteAdmin(...a) };
});
vi.mock("../../ConfirmContext", () => ({ useConfirm: () => async () => true }));

import QuoteSidebar from "./QuoteSidebar";

const stage = (id: string, label: string, percent: number, index: number, amountMinor: number) => ({
  id,
  label,
  percent,
  index,
  amountMinor,
  state: "later" as const,
  dueAt: null,
  overdue: false,
  invoiceNumber: `Q-2026-0002-INV-${index + 1}`,
  paidAt: null,
  reference: null,
});

const draftDetail = {
  quote: {
    id: "q2",
    quoteNumber: "Q-2026-0002",
    revision: 1,
    status: "draft",
    currency: "GHS",
    title: "Booking site",
    clientName: "Ama Owusu",
    clientEmail: "ama@example.com",
    totalMinor: 500000,
    hasLink: false,
    items: [{ id: "item-a", description: "Site build", qty: 1, unitMinor: 500000 }],
    schedule: [],
    sentAt: null,
    viewedAt: null,
  },
  stages: [stage("deposit", "Deposit", 60, 0, 300000), stage("balance", "Balance", 40, 1, 200000)],
  payments: [],
} as unknown as QuoteDetailResponse;

const clientStage = (
  s: ReturnType<typeof stage>,
  extra: Partial<ClientQuote["stages"][0]> = {},
) => ({
  id: s.id,
  label: s.label,
  percent: s.percent,
  index: s.index,
  amountMinor: s.amountMinor,
  state: s.state,
  dueAt: null,
  dueBy: null,
  overdue: false,
  invoiceNumber: s.invoiceNumber,
  paidAt: null,
  receiptPath: null,
  note: "",
  ...extra,
});

const clientDraft: ClientQuote = {
  quoteNumber: "Q-2026-0002",
  revision: 1,
  status: "draft",
  currency: "GHS",
  title: "Booking site",
  overview: "A site your customers book from.",
  scope: "",
  timeline: "",
  notes: "",
  terms: "- Pay on time",
  clientName: "Ama Owusu",
  clientCompany: "",
  clientEmail: "ama@example.com",
  items: [
    {
      id: "item-a",
      description: "Site build",
      qty: 1,
      unitMinor: 500000,
      lineMinor: 500000,
      detail: "",
    },
  ],
  highlights: ["Live in about 14 weeks"],
  discountLabel: "",
  runningCosts: [],
  exclusions: "",
  assumptions: "",
  nextSteps: "",
  optionalTitle: "Phase 2: growth features",
  optionalItems: [
    {
      id: "opt-1",
      description: "SMS reminders",
      qty: 1,
      unitMinor: 150000,
      lineMinor: 150000,
      detail: "",
    },
  ],
  optionalTotalMinor: 150000,
  subtotalMinor: 500000,
  discountMinor: 0,
  totalMinor: 500000,
  issuedAt: null,
  validUntil: null,
  acceptedName: null,
  respondedAt: null,
  stages: draftDetail.stages.map((s) => clientStage(s as ReturnType<typeof stage>)),
  summary: { paidMinor: 0, balanceMinor: 500000, complete: false },
  contact: { email: "hello@oceaniccoder.dev", whatsapp: "" },
};

function renderSidebar(data = draftDetail, sendBlocked = false) {
  return render(
    <MemoryRouter>
      <QuoteSidebar data={data} onChanged={vi.fn()} sendBlocked={sendBlocked} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  quoteAdmin.mockReset();
  quoteAdmin.mockImplementation(async (action: string) => {
    if (action === "clientView") return { quote: clientDraft };
    throw new Error(`unexpected ${action}`);
  });
});

describe("Preview as client", () => {
  it("opens a read-only client page for a draft and closes again", async () => {
    renderSidebar();
    await userEvent.click(screen.getByRole("button", { name: /preview as client/i }));

    const dialog = await screen.findByRole("dialog", { name: /client preview/i });
    expect(quoteAdmin).toHaveBeenCalledWith("clientView", { id: "q2" });
    expect(
      within(dialog).getByText(/Preview — this is what your client sees\. Nothing is sent\./),
    ).toBeInTheDocument();
    expect(
      await within(dialog).findByRole("heading", { name: "Booking site" }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("How you pay")).toBeInTheDocument();
    expect(within(dialog).getByText(/Live in about 14 weeks/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Phase 2: growth features/)).toBeInTheDocument();
    // No accept/decline form and nothing that sends.
    expect(within(dialog).queryByRole("button", { name: /accept/i })).toBeNull();
    expect(within(dialog).queryByRole("button", { name: /decline/i })).toBeNull();
    expect(within(dialog).queryByRole("textbox")).toBeNull();
    expect(within(dialog).getByText(/turned off in the preview/i)).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: /close preview/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(quoteAdmin).toHaveBeenCalledTimes(1);
  });

  it("renders on <body>, outside the dashboard, so nothing behind it shows through", async () => {
    const { container } = renderSidebar();
    await userEvent.click(screen.getByRole("button", { name: /preview as client/i }));
    const dialog = await screen.findByRole("dialog", { name: /client preview/i });
    expect(dialog.parentElement).toBe(document.body);
    expect(container.contains(dialog)).toBe(false);
  });

  it("keeps Tab focus inside the preview", async () => {
    renderSidebar();
    await userEvent.click(screen.getByRole("button", { name: /preview as client/i }));
    const dialog = await screen.findByRole("dialog", { name: /client preview/i });
    await within(dialog).findByRole("heading", { name: "Booking site" });
    const close = within(dialog).getByRole("button", { name: /close preview/i });
    expect(close).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
    for (let i = 0; i < 15; i++) await userEvent.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("closes on Escape", async () => {
    renderSidebar();
    await userEvent.click(screen.getByRole("button", { name: /preview as client/i }));
    await screen.findByRole("dialog", { name: /client preview/i });
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows pay and invoice buttons on an accepted quote, but not as links", async () => {
    const accepted: ClientQuote = {
      ...clientDraft,
      status: "accepted",
      issuedAt: "2026-10-01T00:00:00Z",
      validUntil: "2026-10-15T00:00:00Z",
      acceptedName: "Ama Owusu",
      respondedAt: "2026-10-02T00:00:00Z",
      stages: [
        clientStage(draftDetail.stages[0] as ReturnType<typeof stage>, { state: "due" }),
        clientStage(draftDetail.stages[1] as ReturnType<typeof stage>),
      ],
    };
    quoteAdmin.mockImplementation(async () => ({ quote: accepted }));
    renderSidebar({
      ...draftDetail,
      quote: { ...draftDetail.quote, status: "accepted" },
    } as QuoteDetailResponse);
    await userEvent.click(screen.getByRole("button", { name: /preview as client/i }));
    const dialog = await screen.findByRole("dialog", { name: /client preview/i });
    const pay = await within(dialog).findByText("Pay now");
    expect(pay.closest("a")).toBeNull();
    expect(pay).toHaveAttribute("aria-disabled", "true");
    expect(within(dialog).getByText("Invoice").closest("a")).toBeNull();
    expect(within(dialog).queryAllByRole("link")).toHaveLength(0);
    expect(within(dialog).queryByText(/turned off in the preview/i)).toBeNull();
  });

  it("says the preview shows the saved version when there are unsaved edits", async () => {
    renderSidebar(draftDetail, true);
    expect(screen.getByText(/Save to include your latest changes/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /preview as client/i }));
    const dialog = await screen.findByRole("dialog", { name: /client preview/i });
    expect(within(dialog).getByText(/Showing the last saved version/)).toBeInTheDocument();
  });

  it("shows the server error with a retry", async () => {
    quoteAdmin.mockImplementation(async () => {
      throw new Error("Quote not found.");
    });
    renderSidebar();
    await userEvent.click(screen.getByRole("button", { name: /preview as client/i }));
    const dialog = await screen.findByRole("dialog", { name: /client preview/i });
    expect(await within(dialog).findByText("Quote not found.")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });
});
