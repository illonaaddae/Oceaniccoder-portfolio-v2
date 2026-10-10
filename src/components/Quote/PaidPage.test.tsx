import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

const checkStagePayment = vi.fn();
vi.mock("@/services/api/quotes", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/api/quotes")>("@/services/api/quotes");
  return { ...actual, checkStagePayment: (...a: unknown[]) => checkStagePayment(...a) };
});

import PaidPage from "./PaidPage";

const renderAt = () =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/q/tok/paid?reference=R1"]}>
        <Routes>
          <Route path="/q/:token/paid" element={<PaidPage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  checkStagePayment.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("PaidPage", () => {
  it("shows paid with a receipt link", async () => {
    checkStagePayment.mockResolvedValue({ state: "paid", receiptPath: "/receipt/R1?s=x" });
    renderAt();
    expect(await screen.findByText(/payment received/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /receipt/i })).toHaveAttribute(
      "href",
      "/receipt/R1?s=x",
    );
  });

  it("pending keeps polling until Paystack confirms", async () => {
    checkStagePayment
      .mockResolvedValueOnce({ state: "pending", receiptPath: null })
      .mockResolvedValue({ state: "paid", receiptPath: "/receipt/R1?s=x" });
    renderAt();
    expect(await screen.findByText(/confirming/i)).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(await screen.findByText(/payment received/i)).toBeInTheDocument();
  });

  it("shows failure with a way back", async () => {
    checkStagePayment.mockResolvedValue({ state: "failed", receiptPath: null });
    renderAt();
    expect(await screen.findByText(/didn't go through/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to your quote/i })).toHaveAttribute(
      "href",
      "/q/tok",
    );
  });

  it("without a reference it does not poll and says so", async () => {
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={["/q/tok/paid"]}>
          <Routes>
            <Route path="/q/:token/paid" element={<PaidPage />} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>,
    );
    expect(await screen.findByText(/couldn't find that payment/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to your quote/i })).toHaveAttribute(
      "href",
      "/q/tok",
    );
    expect(checkStagePayment).not.toHaveBeenCalled();
  });

  it("pending past five minutes shows the still-waiting copy, never failure", async () => {
    checkStagePayment.mockResolvedValue({ state: "pending", receiptPath: null });
    renderAt();
    expect(await screen.findByText(/confirming/i)).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 10000);
    });
    expect(await screen.findByText(/still waiting for paystack/i)).toBeInTheDocument();
    expect(screen.queryByText(/didn't go through/i)).not.toBeInTheDocument();
  });
});
