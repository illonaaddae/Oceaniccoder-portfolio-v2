import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { QuoteDetailResponse } from "@/types/quote";

const quoteAdmin = vi.fn();
const confirm = vi.fn();
vi.mock("@/services/api/quotes", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/api/quotes")>("@/services/api/quotes");
  return { ...actual, quoteAdmin: (...a: unknown[]) => quoteAdmin(...a) };
});
vi.mock("../../ConfirmContext", () => ({ useConfirm: () => confirm }));

import QuoteSidebar from "./QuoteSidebar";

const paidStage = (id: string, index: number, paidAt: string) => ({
  id,
  label: id === "deposit" ? "Deposit" : "Balance",
  percent: index === 0 ? 60 : 40,
  index,
  amountMinor: index === 0 ? 6000 : 4000,
  state: "paid" as const,
  dueAt: null,
  overdue: false,
  invoiceNumber: `Q-2026-0001-INV-${index + 1}`,
  paidAt,
  reference: `REF-${index}`,
});

const detail = (maintenance: QuoteDetailResponse["maintenance"]): QuoteDetailResponse =>
  ({
    quote: {
      id: "q1",
      quoteNumber: "Q-2026-0001",
      revision: 1,
      status: "accepted",
      currency: "GHS",
      title: "Store",
      clientName: "Kofi Mensah",
      clientEmail: "kofi@example.com",
      items: [],
      totalMinor: 10000,
      subtotalMinor: 10000,
      schedule: [],
      hasLink: true,
    },
    stages: [
      paidStage("deposit", 0, "2026-10-02T00:00:00.000Z"),
      paidStage("balance", 1, "2026-11-10T09:00:00.000Z"),
    ],
    payments: [],
    maintenance,
  }) as unknown as QuoteDetailResponse;

const renderSidebar = (data: QuoteDetailResponse, onChanged = vi.fn()) =>
  render(
    <MemoryRouter>
      <QuoteSidebar data={data} onChanged={onChanged} />
    </MemoryRouter>,
  );

beforeEach(() => {
  quoteAdmin.mockReset();
  confirm.mockReset();
  confirm.mockResolvedValue(true);
});

describe("QuoteSidebar maintenance offer", () => {
  const due = {
    launchedAt: "2026-11-10T09:00:00.000Z",
    dueAt: "2026-12-03T09:00:00.000Z",
    sentAt: null,
  };

  it("shows the due date and sends after confirming", async () => {
    const sentDetail = detail({ ...due, sentAt: "2026-12-01T10:00:00.000Z" });
    quoteAdmin.mockResolvedValue({ ...sentDetail, emailed: true });
    const onChanged = vi.fn();
    renderSidebar(detail(due), onChanged);
    expect(screen.getByText("Maintenance offer: due 3 Dec 2026")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Send maintenance offer" }));
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Send the maintenance offer?" }),
    );
    await waitFor(() =>
      expect(quoteAdmin).toHaveBeenCalledWith("sendMaintenanceOffer", { id: "q1" }),
    );
    expect(await screen.findByText("Maintenance offer emailed.")).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalledWith(
      expect.objectContaining({ maintenance: sentDetail.maintenance }),
    );
  });

  it("does nothing when the confirm is cancelled", async () => {
    confirm.mockResolvedValue(false);
    renderSidebar(detail(due));
    await userEvent.click(screen.getByRole("button", { name: "Send maintenance offer" }));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(quoteAdmin).not.toHaveBeenCalled();
  });

  it("shows the sent date and resends with resend: true", async () => {
    const sent = detail({ ...due, sentAt: "2026-12-03T09:00:00.000Z" });
    quoteAdmin.mockResolvedValue(sent);
    renderSidebar(sent);
    expect(screen.getByText("Maintenance offer: sent 3 Dec 2026")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Send again" }));
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Send the maintenance offer again?" }),
    );
    await waitFor(() =>
      expect(quoteAdmin).toHaveBeenCalledWith("sendMaintenanceOffer", { id: "q1", resend: true }),
    );
  });

  it("is hidden when the quote has no offer (not fully paid or no plans)", () => {
    renderSidebar(detail(null));
    expect(screen.queryByTestId("maintenance-offer")).toBeNull();
    expect(screen.queryByRole("button", { name: /maintenance offer/i })).toBeNull();
  });
});
