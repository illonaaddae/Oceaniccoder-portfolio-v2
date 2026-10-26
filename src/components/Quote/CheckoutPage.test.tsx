import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import type { ClientQuote } from "@/types/quote";

const fetchClientQuote = vi.fn();
const startStagePayment = vi.fn();
const checkStagePayment = vi.fn();
const fetchQuoteAccess = vi.fn();
const sendQuoteCode = vi.fn();
vi.mock("@/services/api/quotes", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/api/quotes")>("@/services/api/quotes");
  return {
    ...actual,
    fetchClientQuote: (...a: unknown[]) => fetchClientQuote(...a),
    startStagePayment: (...a: unknown[]) => startStagePayment(...a),
    checkStagePayment: (...a: unknown[]) => checkStagePayment(...a),
    fetchQuoteAccess: (...a: unknown[]) => fetchQuoteAccess(...a),
    sendQuoteCode: (...a: unknown[]) => sendQuoteCode(...a),
  };
});
const resumeTransaction = vi.fn();
vi.mock("@/utils/paystackV2", () => ({
  loadPaystackV2: vi
    .fn()
    .mockResolvedValue({ resumeTransaction: (...a: unknown[]) => resumeTransaction(...a) }),
}));

import CheckoutPage from "./CheckoutPage";
import { QuoteApiError } from "@/services/api/quotes";
import { loadPaystackV2 } from "@/utils/paystackV2";

const locked = () =>
  new QuoteApiError("Enter the code we email you to open this quote.", 401, undefined, undefined, {
    locked: true,
  });

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

// The email field is filled from the quote in an effect; wait for it so the form can submit.
const payButton = async () => {
  await waitFor(() => expect(screen.getByText("kofi@example.com")).toBeInTheDocument());
  return screen.getByRole("button", { name: /pay ghs/i });
};

beforeEach(() => {
  vi.clearAllMocks();
  fetchClientQuote.mockResolvedValue({ quote });
  checkStagePayment.mockResolvedValue({ state: "pending", receiptPath: null });
  fetchQuoteAccess.mockResolvedValue({ locked: true, maskedEmail: "k•••••@e•••••.com" });
  sendQuoteCode.mockResolvedValue({
    challenge: "v1.c.s",
    maskedEmail: "k•••••@e•••••.com",
    expiresInSeconds: 600,
    retryAfterSeconds: 90,
  });
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
    await userEvent.click(await screen.findByRole("radio", { name: /mobile money/i }));
    await userEvent.click(screen.getByRole("radio", { name: /mtn momo/i }));
    await userEvent.click(await payButton());
    await waitFor(() =>
      expect(startStagePayment).toHaveBeenCalledWith({
        token: "tok",
        stageId: "deposit",
        method: "momo",
        email: "kofi@example.com",
        network: "mtn",
      }),
    );
    await waitFor(() =>
      expect(resumeTransaction).toHaveBeenCalledWith(
        "AC1",
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      ),
    );
    act(() => {
      resumeTransaction.mock.calls[0][1].onSuccess({ reference: "R1" });
    });
    expect(await screen.findByText("paid page")).toBeInTheDocument();
  });

  it("asks for a Mobile Money network before starting the payment", async () => {
    renderAt("/q/tok/pay/deposit");
    await userEvent.click(await screen.findByRole("radio", { name: /mobile money/i }));
    expect(screen.getByRole("radiogroup", { name: /mobile money network/i })).toBeInTheDocument();
    await userEvent.click(await payButton());
    expect(await screen.findByText(/choose your mobile money network/i)).toBeInTheDocument();
    expect(startStagePayment).not.toHaveBeenCalled();
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
    await userEvent.click(await payButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't start/);
    expect(screen.getByRole("button", { name: /pay ghs/i })).toBeEnabled();
  });

  it("shows the animated card preview only while Card is picked", async () => {
    renderAt("/q/tok/pay/deposit");
    await screen.findByRole("radio", { name: /^card/i });
    expect(document.querySelector(".animated-card-inner")).not.toBeNull();
    await userEvent.click(screen.getByRole("radio", { name: /mobile money/i }));
    expect(document.querySelector(".animated-card-inner")).toBeNull();
  });

  it("shows the receipt email as one line, editable with Change", async () => {
    renderAt("/q/tok/pay/deposit");
    await payButton();
    expect(screen.queryByLabelText(/email for your receipt/i)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /change/i }));
    const input = screen.getByLabelText(/email for your receipt/i);
    expect(input).toHaveValue("kofi@example.com");
    expect(input).toHaveFocus();
  });

  it("shows the stage position, what comes next and a way back to the quote", async () => {
    renderAt("/q/tok/pay/deposit");
    expect(await screen.findByText(/stage 1 of 2/i)).toBeInTheDocument();
    expect(screen.getByText(/next · we.ll email you a payment link/i)).toBeInTheDocument();
    expect(screen.getByText(/paying now/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to the quote/i })).toHaveAttribute(
      "href",
      "/q/tok",
    );
  });

  it("offers bank transfer by message, without starting a Paystack payment", async () => {
    renderAt("/q/tok/pay/deposit");
    await userEvent.click(await screen.findByRole("radio", { name: /bank transfer/i }));
    expect(screen.getByRole("link", { name: /email us/i })).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:"),
    );
    expect(screen.queryByRole("button", { name: /pay ghs/i })).toBeNull();
    expect(startStagePayment).not.toHaveBeenCalled();
  });

  it("lets the client check a payment themselves after the window closes", async () => {
    startStagePayment.mockResolvedValue({
      accessCode: "AC1",
      authorizationUrl: "https://checkout.paystack.com/AC1",
      reference: "R1",
    });
    renderAt("/q/tok/pay/deposit");
    await userEvent.click(await payButton());
    await waitFor(() => expect(resumeTransaction).toHaveBeenCalled());
    act(() => {
      resumeTransaction.mock.calls[0][1].onCancel();
    });
    checkStagePayment.mockResolvedValue({ state: "paid", receiptPath: "/receipt/R1" });
    await userEvent.click(await screen.findByRole("button", { name: /i've paid, check now/i }));
    expect(await screen.findByText("paid page")).toBeInTheDocument();
  });

  it("copies a bank detail and confirms it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderAt("/q/tok/pay/deposit");
    await userEvent.click(await screen.findByRole("radio", { name: /bank transfer/i }));
    await userEvent.click(screen.getByRole("button", { name: /copy reference/i }));
    expect(writeText).toHaveBeenCalledWith("Q-2026-0001-INV-1");
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("arrow keys move the payment method selection", async () => {
    renderAt("/q/tok/pay/deposit");
    const card = await screen.findByRole("radio", { name: /^card/i });
    expect(card).toHaveAttribute("aria-checked", "true");
    expect(card).toHaveAttribute("tabindex", "0");
    act(() => card.focus());
    await userEvent.keyboard("{arrowright}");
    const momo = screen.getByRole("radio", { name: /mobile money/i });
    expect(momo).toHaveAttribute("aria-checked", "true");
    expect(card).toHaveAttribute("tabindex", "-1");
  });

  it("sends the client to Paystack's page when the checkout window never loads", async () => {
    startStagePayment.mockResolvedValue({
      accessCode: "AC1",
      authorizationUrl: "https://checkout.paystack.com/AC1",
      reference: "R1",
    });
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, "location", {
      value: { ...original, assign },
      configurable: true,
    });
    try {
      renderAt("/q/tok/pay/deposit");
      await userEvent.click(await payButton());
      // Paystack accepted the call but never reported onLoad (window blocked).
      await waitFor(() => expect(resumeTransaction).toHaveBeenCalled());
      expect(
        await screen.findByRole(
          "link",
          { name: /open paystack's secure page/i },
          { timeout: 6000 },
        ),
      ).toHaveAttribute("href", "https://checkout.paystack.com/AC1");
      await waitFor(
        () => expect(assign).toHaveBeenCalledWith("https://checkout.paystack.com/AC1"),
        {
          timeout: 6000,
        },
      );
    } finally {
      Object.defineProperty(window, "location", { value: original, configurable: true });
    }
  }, 20000);

  it("does not leave the page when the checkout window loads", async () => {
    startStagePayment.mockResolvedValue({
      accessCode: "AC1",
      authorizationUrl: "https://checkout.paystack.com/AC1",
      reference: "R1",
    });
    resumeTransaction.mockImplementation((_code: string, cb: { onLoad?: () => void }) =>
      cb.onLoad?.(),
    );
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, "location", {
      value: { ...original, assign },
      configurable: true,
    });
    try {
      renderAt("/q/tok/pay/deposit");
      await userEvent.click(await payButton());
      await waitFor(() => expect(resumeTransaction).toHaveBeenCalled());
      await new Promise((r) => setTimeout(r, 5500));
      expect(assign).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, "location", { value: original, configurable: true });
      resumeTransaction.mockReset();
    }
  }, 20000);

  it("falls back to Paystack's hosted page when the popup can't load", async () => {
    const { loadPaystackV2 } = await import("@/utils/paystackV2");
    vi.mocked(loadPaystackV2).mockRejectedValueOnce(new Error("blocked"));
    startStagePayment.mockResolvedValue({
      accessCode: "AC1",
      authorizationUrl: "https://checkout.paystack.com/AC1",
      reference: "R1",
    });
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, "location", {
      value: { ...original, assign },
      configurable: true,
    });
    try {
      renderAt("/q/tok/pay/deposit");
      await userEvent.click(await payButton());
      await waitFor(() => expect(assign).toHaveBeenCalledWith("https://checkout.paystack.com/AC1"));
    } finally {
      Object.defineProperty(window, "location", { value: original, configurable: true });
    }
  });

  it("a cancelled attempt's polling never navigates after a retry", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["setTimeout", "clearTimeout", "Date"] });
    try {
      startStagePayment
        .mockResolvedValueOnce({ accessCode: "AC1", authorizationUrl: "u1", reference: "R1" })
        .mockResolvedValueOnce({ accessCode: "AC2", authorizationUrl: "u2", reference: "R2" });
      checkStagePayment.mockImplementation(async (_t: string, ref: string) =>
        ref === "R1"
          ? { state: "paid", receiptPath: "/receipt/R1" }
          : { state: "pending", receiptPath: null },
      );
      renderAt("/q/tok/pay/deposit");
      await userEvent.click(await payButton());
      await waitFor(() => expect(resumeTransaction).toHaveBeenCalledTimes(1));
      act(() => {
        resumeTransaction.mock.calls[0][1].onCancel();
      });
      await userEvent.click(await payButton());
      await waitFor(() => expect(resumeTransaction).toHaveBeenCalledTimes(2));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(9000);
      });
      expect(screen.queryByText("paid page")).not.toBeInTheDocument();
      expect(checkStagePayment).not.toHaveBeenCalledWith("tok", "R1");
    } finally {
      vi.useRealTimers();
    }
  });

  describe("access gate", () => {
    it("shows the code screen when the quote is locked on load", async () => {
      fetchClientQuote.mockRejectedValue(locked());
      renderAt("/q/tokP1/pay/deposit");
      expect(await screen.findByLabelText("6-digit code")).toBeInTheDocument();
      await waitFor(() => expect(sendQuoteCode).toHaveBeenCalledWith("tokP1"));
      expect(screen.queryByText("GHS 6,000.00")).toBeNull();
    });

    it("shows the code screen when starting the payment answers locked", async () => {
      startStagePayment.mockRejectedValue(locked());
      renderAt("/q/tokP2/pay/deposit");
      await userEvent.click(await payButton());
      expect(await screen.findByLabelText("6-digit code")).toBeInTheDocument();
      expect(loadPaystackV2).not.toHaveBeenCalled();
      expect(checkStagePayment).not.toHaveBeenCalled();
      expect(screen.queryByRole("button", { name: /pay ghs/i })).toBeNull();
    });

    it("admin preview without a session never emails the client a code", async () => {
      fetchClientQuote.mockRejectedValue(locked());
      renderAt("/q/tokP3/pay/deposit?preview=admin");
      expect(await screen.findByText(/preview needs your dashboard session/i)).toBeInTheDocument();
      expect(fetchClientQuote).toHaveBeenCalledWith("tokP3", { preview: true, admin: true });
      expect(fetchQuoteAccess).not.toHaveBeenCalled();
      expect(sendQuoteCode).not.toHaveBeenCalled();
    });

    it("admin preview shows the page but starts no payment, and links back in preview", async () => {
      renderAt("/q/tokP4/pay/deposit?preview=admin");
      await userEvent.click(await payButton());
      expect(await screen.findByText(/preview only: payments are turned off/i)).toBeInTheDocument();
      expect(startStagePayment).not.toHaveBeenCalled();
      expect(screen.getByRole("link", { name: /back to the quote/i })).toHaveAttribute(
        "href",
        "/q/tokP4?preview=admin",
      );
      expect(sendQuoteCode).not.toHaveBeenCalled();
    });
  });
});
