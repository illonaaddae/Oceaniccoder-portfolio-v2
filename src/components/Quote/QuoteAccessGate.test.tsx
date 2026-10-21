import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";

const fetchQuoteAccess = vi.fn();
const sendQuoteCode = vi.fn();
const verifyQuoteCode = vi.fn();
vi.mock("@/services/api/quotes", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/api/quotes")>("@/services/api/quotes");
  return {
    ...actual,
    fetchQuoteAccess: (...a: unknown[]) => fetchQuoteAccess(...a),
    sendQuoteCode: (...a: unknown[]) => sendQuoteCode(...a),
    verifyQuoteCode: (...a: unknown[]) => verifyQuoteCode(...a),
  };
});

import QuoteAccessGate, { LockedQuote } from "./QuoteAccessGate";
import { QuoteApiError, type QuoteAccessDetails } from "@/services/api/quotes";

const fail = (message: string, status: number, access: QuoteAccessDetails = {}) =>
  new QuoteApiError(message, status, undefined, undefined, access);
const SENT = {
  challenge: "v1.c1.sig",
  maskedEmail: "k•••••@example.com",
  expiresInSeconds: 600,
  retryAfterSeconds: 90,
};
const BLOCKED = /too many wrong codes/i;

// The gate sends one code by itself per link and page load, so every test
// uses its own link token.
let n = 0;
function setup({ token = `gate${(n += 1)}` } = {}) {
  const onUnlocked = vi.fn();
  render(
    <MemoryRouter>
      <HelmetProvider>
        <QuoteAccessGate token={token} onUnlocked={onUnlocked} />
      </HelmetProvider>
    </MemoryRouter>,
  );
  return { token, onUnlocked };
}

const input = () => screen.findByLabelText("6-digit code");
const openQuote = () => userEvent.click(screen.getByRole("button", { name: "Open quote" }));
const enter = async (code: string) => {
  const el = await input();
  fireEvent.paste(el, { clipboardData: { getData: () => code } });
  await openQuote();
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  fetchQuoteAccess.mockResolvedValue({
    locked: true,
    canUnlock: true,
    blocked: false,
    maskedEmail: "k•••••@example.com",
  });
  sendQuoteCode.mockResolvedValue(SENT);
});

describe("QuoteAccessGate sending a code", () => {
  it("restores the emailed code's challenge after a refresh instead of sending again", async () => {
    sessionStorage.setItem(
      "oc-quote-code:kept",
      JSON.stringify({ challenge: "v1.saved.sig", expiresAt: Date.now() + 60000 }),
    );
    verifyQuoteCode.mockResolvedValue({ ok: true });
    const t = setup({ token: "kept" });
    expect(await screen.findByText("We sent a code to k•••••@example.com.")).toBeInTheDocument();
    await enter("123456");
    expect(sendQuoteCode).not.toHaveBeenCalled();
    expect(verifyQuoteCode).toHaveBeenCalledWith("kept", "v1.saved.sig", "123456");
    await waitFor(() => expect(t.onUnlocked).toHaveBeenCalled());
    expect(sessionStorage.getItem("oc-quote-code:kept")).toBeNull();
  });

  it("announces a resend as a new code", async () => {
    sendQuoteCode.mockResolvedValue({ ...SENT, retryAfterSeconds: 0 });
    setup();
    expect(await screen.findByText("We sent a code to k•••••@example.com.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Send a new code" }));
    await screen.findByText("We sent a new code to k•••••@example.com.");
    expect(screen.getByRole("status")).toHaveTextContent("We sent a new code");
    expect(sendQuoteCode).toHaveBeenCalledTimes(2);
  });

  it("on 429 shows the wait and keeps resend off, with a static hint", async () => {
    sendQuoteCode.mockRejectedValue(
      fail("A code was sent recently.", 429, { retryAfterSeconds: 75 }),
    );
    setup();
    expect(await screen.findByRole("alert")).toHaveTextContent("A code was sent recently.");
    expect(await input()).toHaveFocus();
    const resend = screen.getByRole("button", { name: "Send a code" });
    expect(resend).toHaveAttribute("aria-disabled", "true");
    expect(resend).toHaveTextContent(/in 1:1[45]/);
    expect(resend).toHaveAccessibleDescription("You can ask for a new code in about 1 minute.");
    await userEvent.click(resend);
    expect(sendQuoteCode).toHaveBeenCalledTimes(1);
  });

  it("keeps the resend hint out of the reading order when there is no wait", async () => {
    sendQuoteCode.mockResolvedValue({ ...SENT, retryAfterSeconds: 0 });
    setup();
    await screen.findByText("We sent a code to k•••••@example.com.");
    expect(screen.getByRole("button", { name: "Send a new code" })).not.toHaveAttribute(
      "aria-describedby",
    );
    expect(screen.queryByText(/you can ask for a new code/i)).toBeNull();
  });

  it("on 502 shows the error, lets the client resend and puts focus back", async () => {
    sendQuoteCode
      .mockRejectedValueOnce(fail("We couldn't send the code.", 502))
      .mockResolvedValue(SENT);
    setup();
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't send the code.");
    expect(await input()).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Send a code" }));
    expect(await screen.findByText("We sent a code to k•••••@example.com.")).toBeInTheDocument();
  });

  it.each([
    ["blocked", 403, { blocked: true }, BLOCKED],
    ["noEmail", 409, { noEmail: true }, /can't be opened with a code/],
  ] as const)(
    "on %s announces the contact message and moves focus to it",
    async (_, status, access, text) => {
      sendQuoteCode.mockRejectedValue(fail("Refused.", status, access));
      setup();
      const message = await screen.findByRole("alert");
      expect(message).toHaveTextContent(text);
      expect(message).toHaveFocus();
      expect(screen.queryByLabelText("6-digit code")).toBeNull();
    },
  );

  it("opens the quote when the gate was switched off meanwhile", async () => {
    sendQuoteCode.mockRejectedValue(fail("Opens without a code.", 409, { gateOff: true }));
    const t = setup();
    await waitFor(() => expect(t.onUnlocked).toHaveBeenCalled());
  });

  it("opens the quote when the status says this browser is already unlocked", async () => {
    fetchQuoteAccess.mockResolvedValue({ locked: false });
    const t = setup();
    await waitFor(() => expect(t.onUnlocked).toHaveBeenCalled());
    expect(sendQuoteCode).not.toHaveBeenCalled();
  });

  it("does not announce or move focus for a quote blocked before the page opened", async () => {
    fetchQuoteAccess.mockResolvedValue({ locked: true, blocked: true, maskedEmail: "k@x.co" });
    setup();
    expect(await screen.findByText(BLOCKED)).not.toHaveAttribute("role");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("QuoteAccessGate checking a code", () => {
  it("takes digits only", async () => {
    setup();
    const el = await input();
    await userEvent.type(el, "12a-3 4");
    expect(el).toHaveValue("1234");
  });

  it("announces the same wrong-code message again on a second try", async () => {
    verifyQuoteCode.mockRejectedValue(fail("That code isn't right.", 400, { triesLeft: 4 }));
    setup();
    await screen.findByText("We sent a code to k•••••@example.com.");
    await enter("111111");
    const first = await screen.findByRole("alert");
    expect(first).toHaveTextContent("That code isn't right. 4 tries left.");
    expect(await input()).toHaveFocus();
    await openQuote();
    await waitFor(() => expect(verifyQuoteCode).toHaveBeenCalledTimes(2));
    const second = await screen.findByRole("alert");
    expect(second).not.toBe(first);
  });

  it.each([
    ["expired", 400, "That code has expired. Ask for a new one."],
    ["used", 409, "That code has already been used. Ask for a new one."],
  ])("forgets a %s code's challenge and asks for a code first", async (_, status, message) => {
    verifyQuoteCode.mockRejectedValue(fail(message, status, { newCodeNeeded: true }));
    const t = setup();
    await screen.findByText("We sent a code to k•••••@example.com.");
    expect(sessionStorage.getItem(`oc-quote-code:${t.token}`)).not.toBeNull();
    await enter("123456");
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(sessionStorage.getItem(`oc-quote-code:${t.token}`)).toBeNull();
    await openQuote();
    expect(await screen.findByRole("alert")).toHaveTextContent("Ask for a code first.");
    expect(verifyQuoteCode).toHaveBeenCalledTimes(1);
  });

  it("on 403 blocked announces the contact message and moves focus to it", async () => {
    verifyQuoteCode.mockRejectedValue(fail("Blocked.", 403, { blocked: true, triesLeft: 0 }));
    const t = setup();
    await screen.findByText("We sent a code to k•••••@example.com.");
    await enter("123456");
    const message = await screen.findByRole("alert");
    expect(message).toHaveTextContent(BLOCKED);
    expect(message).toHaveFocus();
    expect(sessionStorage.getItem(`oc-quote-code:${t.token}`)).toBeNull();
  });
});

describe("LockedQuote", () => {
  it("says the browser dropped the sign-in instead of asking for another code", async () => {
    const onRetry = vi.fn();
    render(
      <MemoryRouter>
        <HelmetProvider>
          <LockedQuote token="dropped" onUnlocked={vi.fn()} onRetry={onRetry} cookieBlocked />
        </HelmetProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText(/didn't keep the sign-in\. Allow cookies/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();
    expect(fetchQuoteAccess).not.toHaveBeenCalled();
    expect(sendQuoteCode).not.toHaveBeenCalled();
  });
});
