import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import type { ClientQuote } from "@/types/quote";

const fetchClientQuote = vi.fn();
const startStagePayment = vi.fn();
const checkStagePayment = vi.fn();
vi.mock("@/services/api/quotes", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/api/quotes")>("@/services/api/quotes");
  return {
    ...actual,
    fetchClientQuote: (...a: unknown[]) => fetchClientQuote(...a),
    startStagePayment: (...a: unknown[]) => startStagePayment(...a),
    checkStagePayment: (...a: unknown[]) => checkStagePayment(...a),
  };
});
const resumeTransaction = vi.fn();
vi.mock("@/utils/paystackV2", () => ({
  loadPaystackV2: vi
    .fn()
    .mockResolvedValue({ resumeTransaction: (...a: unknown[]) => resumeTransaction(...a) }),
}));

import CheckoutPage from "./CheckoutPage";

const quote = {
  quoteNumber: "Q-2026-0001",
  status: "accepted",
  currency: "GHS",
  title: "Store",
  clientEmail: "kofi@example.com",
  stages: [
    {
      id: "deposit",
      label: "Deposit",
      percent: 60,
      index: 0,
      amountMinor: 600000,
      state: "due",
      invoiceNumber: "Q-2026-0001-INV-1",
    },
    {
      id: "balance",
      label: "Balance",
      percent: 40,
      index: 1,
      amountMinor: 400000,
      state: "later",
      invoiceNumber: "Q-2026-0001-INV-2",
    },
  ],
  summary: { paidMinor: 0, balanceMinor: 1000000, complete: false },
  contact: { email: "hello@oceaniccoder.dev", whatsapp: "" },
} as unknown as ClientQuote;

const renderAt = (path: string) =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/q/:token/pay/:stageId" element={<CheckoutPage />} />
          <Route path="/q/:token/paid" element={<p>paid page</p>} />
          <Route path="/q/:token" element={<p>quote page</p>} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  fetchClientQuote.mockResolvedValue({ quote });
  checkStagePayment.mockResolvedValue({ state: "pending", receiptPath: null });
});

describe("CheckoutPage", () => {
  it("shows the stage amount and the balance after it", async () => {
    renderAt("/q/tok/pay/deposit");
    expect((await screen.findAllByText("GHS 6,000.00")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("GHS 4,000.00").length).toBeGreaterThanOrEqual(2); // balance stage + balance after
  });

  it("starts the payment on the server and opens Paystack with the access code", async () => {
    startStagePayment.mockResolvedValue({
      accessCode: "AC1",
      authorizationUrl: "https://checkout.paystack.com/AC1",
      reference: "R1",
    });
    renderAt("/q/tok/pay/deposit");
    await userEvent.click(await screen.findByRole("tab", { name: /mobile money/i }));
    await userEvent.click(screen.getByRole("button", { name: /pay ghs 6,000.00/i }));
    await waitFor(() =>
      expect(startStagePayment).toHaveBeenCalledWith({
        token: "tok",
        stageId: "deposit",
        method: "momo",
        email: "kofi@example.com",
      }),
    );
    await waitFor(() =>
      expect(resumeTransaction).toHaveBeenCalledWith(
        "AC1",
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      ),
    );
    resumeTransaction.mock.calls[0][1].onSuccess({ reference: "R1" });
    expect(await screen.findByText("paid page")).toBeInTheDocument();
  });

  it("sends a stage that isn't due back to the quote", async () => {
    renderAt("/q/tok/pay/balance");
    expect(await screen.findByText("quote page")).toBeInTheDocument();
  });

  it("shows the server's error and lets the client retry", async () => {
    startStagePayment.mockRejectedValue(
      new Error("Paystack couldn't start the payment. Please try again in a minute."),
    );
    renderAt("/q/tok/pay/deposit");
    await userEvent.click(await screen.findByRole("button", { name: /pay ghs/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't start/);
    expect(screen.getByRole("button", { name: /pay ghs/i })).toBeEnabled();
  });
});
