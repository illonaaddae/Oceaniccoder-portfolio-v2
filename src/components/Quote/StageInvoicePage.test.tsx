import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import type { ClientQuote } from "@/types/quote";

const fetchClientQuote = vi.fn();
const fetchQuoteAccess = vi.fn();
const sendQuoteCode = vi.fn();
vi.mock("@/services/api/quotes", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/api/quotes")>("@/services/api/quotes");
  return {
    ...actual,
    fetchClientQuote: (...a: unknown[]) => fetchClientQuote(...a),
    fetchQuoteAccess: (...a: unknown[]) => fetchQuoteAccess(...a),
    sendQuoteCode: (...a: unknown[]) => sendQuoteCode(...a),
  };
});

import StageInvoicePage from "./StageInvoicePage";
import { QuoteApiError } from "@/services/api/quotes";

const locked = () =>
  new QuoteApiError("Enter the code we email you to open this quote.", 401, undefined, undefined, {
    locked: true,
  });

const quote = {
  quoteNumber: "Q-2026-0001",
  status: "accepted",
  currency: "GHS",
  title: "Store",
  clientName: "Kofi Mensah",
  clientCompany: "",
  stages: [
    {
      id: "deposit",
      label: "Deposit",
      percent: 60,
      index: 0,
      amountMinor: 600000,
      state: "due",
      dueAt: "2026-10-02T00:00:00Z",
      dueBy: "2026-10-09T00:00:00Z",
      overdue: false,
      invoiceNumber: "Q-2026-0001-INV-1",
      receiptPath: null,
    },
  ],
} as unknown as ClientQuote;

const renderAt = (path: string) =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/q/:token/invoice/:stageId" element={<StageInvoicePage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  fetchQuoteAccess.mockResolvedValue({ locked: true, maskedEmail: "k•••••@e•••••.com" });
  sendQuoteCode.mockResolvedValue({
    challenge: "v1.c.s",
    maskedEmail: "k•••••@e•••••.com",
    expiresInSeconds: 600,
    retryAfterSeconds: 90,
  });
});

describe("StageInvoicePage", () => {
  it("shows the code screen, not the invoice, when the quote is locked", async () => {
    fetchClientQuote.mockRejectedValue(locked());
    renderAt("/q/tokI1/invoice/deposit");
    expect(await screen.findByLabelText("6-digit code")).toBeInTheDocument();
    await waitFor(() => expect(sendQuoteCode).toHaveBeenCalledWith("tokI1"));
    expect(screen.queryByText("Q-2026-0001-INV-1")).toBeNull();
  });

  it("keeps the admin preview on its pay and back links, and emails no code", async () => {
    fetchClientQuote.mockResolvedValue({ quote });
    renderAt("/q/tokI2/invoice/deposit?preview=admin");
    expect(await screen.findByRole("link", { name: "Pay now" })).toHaveAttribute(
      "href",
      "/q/tokI2/pay/deposit?preview=admin",
    );
    expect(screen.getByRole("link", { name: /back to quote/i })).toHaveAttribute(
      "href",
      "/q/tokI2?preview=admin",
    );
    expect(fetchClientQuote).toHaveBeenCalledWith("tokI2", { preview: true, admin: true });
    expect(sendQuoteCode).not.toHaveBeenCalled();
  });

  it("admin preview without a session shows no code screen", async () => {
    fetchClientQuote.mockRejectedValue(locked());
    renderAt("/q/tokI3/invoice/deposit?preview=admin");
    expect(await screen.findByText(/preview needs your dashboard session/i)).toBeInTheDocument();
    expect(fetchQuoteAccess).not.toHaveBeenCalled();
  });
});
