import { StrictMode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import type { ClientQuote } from "@/types/quote";

const fetchClientQuote = vi.fn();
const respondToQuote = vi.fn();
const fetchQuoteAccess = vi.fn();
const claimQuoteLink = vi.fn();
const sendQuoteCode = vi.fn();
const verifyQuoteCode = vi.fn();
vi.mock("@/services/api/quotes", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/api/quotes")>("@/services/api/quotes");
  return {
    ...actual,
    fetchClientQuote: (...a: unknown[]) => fetchClientQuote(...a),
    respondToQuote: (...a: unknown[]) => respondToQuote(...a),
    fetchQuoteAccess: (...a: unknown[]) => fetchQuoteAccess(...a),
    claimQuoteLink: (...a: unknown[]) => claimQuoteLink(...a),
    sendQuoteCode: (...a: unknown[]) => sendQuoteCode(...a),
    verifyQuoteCode: (...a: unknown[]) => verifyQuoteCode(...a),
  };
});

import QuotePage from "./QuotePage";
import { QuoteApiError } from "@/services/api/quotes";
import { captureLinkCode } from "@/utils/quoteLinkCode";

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
  fetchQuoteAccess.mockReset();
  claimQuoteLink.mockReset();
  sendQuoteCode.mockReset();
  verifyQuoteCode.mockReset();
  sessionStorage.clear();
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
    expect(fetchClientQuote).toHaveBeenCalledWith("tok", { preview: true, admin: false });
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
    expect(
      screen.getByText(/directly to each provider, from the start of the project/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/paid to the providers after launch/i)).toBeNull();
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

// Each test uses its own link token: a link code is claimed, and a code
// emailed automatically, once per link per page load.
describe("QuotePage access gate", () => {
  const locked = () =>
    new QuoteApiError(
      "Enter the code we email you to open this quote.",
      401,
      undefined,
      undefined,
      {
        locked: true,
      },
    );
  const codeSent = {
    challenge: "v1.chal.sig",
    maskedEmail: "k•••••@example.com",
    expiresInSeconds: 600,
    retryAfterSeconds: 90,
  };
  const lockedStatus = {
    locked: true,
    canUnlock: true,
    blocked: false,
    maskedEmail: "k•••••@example.com",
  };
  let visibility: "visible" | "hidden" = "visible";

  beforeEach(() => {
    visibility = "visible";
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibility,
    });
  });

  it("claims the link code on load, drops it from the URL and never emails a code", async () => {
    window.history.replaceState(null, "", "/q/tokA#k=LINKCODE");
    captureLinkCode();
    expect(window.location.hash).toBe("");
    expect(window.location.pathname).toBe("/q/tokA");
    claimQuoteLink.mockResolvedValue({ ok: true });
    fetchClientQuote.mockResolvedValue({ quote: baseQuote });
    renderAt("/q/tokA");
    expect(await screen.findByRole("heading", { name: "Online store" })).toBeInTheDocument();
    expect(claimQuoteLink).toHaveBeenCalledTimes(1);
    expect(claimQuoteLink).toHaveBeenCalledWith("tokA", "LINKCODE");
    expect(claimQuoteLink.mock.invocationCallOrder[0]).toBeLessThan(
      fetchClientQuote.mock.invocationCallOrder[0],
    );
    expect(sendQuoteCode).not.toHaveBeenCalled();
    expect(fetchQuoteAccess).not.toHaveBeenCalled();
  });

  it("emails a code once when the link code was already used", async () => {
    window.history.replaceState(null, "", "/q/tokB#k=USED");
    captureLinkCode();
    claimQuoteLink.mockRejectedValue(
      new QuoteApiError("This link needs a code.", 409, undefined, undefined, {}),
    );
    fetchClientQuote.mockRejectedValue(locked());
    fetchQuoteAccess.mockResolvedValue(lockedStatus);
    sendQuoteCode.mockResolvedValue(codeSent);
    renderAt("/q/tokB");
    await screen.findByText("We sent a code to k•••••@example.com.");
    expect(screen.getByRole("status")).toHaveTextContent("We sent a code to k•••••@example.com.");
    expect(sendQuoteCode).toHaveBeenCalledTimes(1);
    expect(sendQuoteCode).toHaveBeenCalledWith("tokB");
    expect(screen.getByLabelText("6-digit code")).toHaveFocus();
    expect(screen.queryByText("Online store")).toBeNull();
    // The countdown is visible but kept out of the button's accessible name.
    const resend = screen.getByRole("button", { name: "Send a new code" });
    expect(resend).toHaveAttribute("aria-disabled", "true");
    expect(resend).toHaveTextContent(/in 1:(30|29)/);
  });

  it("waits for the page to be visible before emailing a code", async () => {
    visibility = "hidden";
    fetchClientQuote.mockRejectedValue(locked());
    fetchQuoteAccess.mockResolvedValue(lockedStatus);
    sendQuoteCode.mockResolvedValue(codeSent);
    renderAt("/q/tokC");
    await screen.findByLabelText("6-digit code");
    expect(sendQuoteCode).not.toHaveBeenCalled();
    visibility = "visible";
    document.dispatchEvent(new Event("visibilitychange"));
    document.dispatchEvent(new Event("visibilitychange"));
    await waitFor(() => expect(sendQuoteCode).toHaveBeenCalledTimes(1));
  });

  it("opens the quote after the right code, with spaces pasted in", async () => {
    fetchClientQuote.mockRejectedValueOnce(locked()).mockResolvedValue({ quote: baseQuote });
    fetchQuoteAccess.mockResolvedValue(lockedStatus);
    sendQuoteCode.mockResolvedValue(codeSent);
    verifyQuoteCode
      .mockRejectedValueOnce(
        new QuoteApiError("That code isn't right.", 400, undefined, undefined, { triesLeft: 3 }),
      )
      .mockResolvedValue({ ok: true });
    renderAt("/q/tokD");
    const input = await screen.findByLabelText("6-digit code");
    await waitFor(() => expect(sendQuoteCode).toHaveBeenCalled());
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toHaveAttribute("autocomplete", "one-time-code");
    expect(input).toHaveAttribute("maxlength", "6");

    const paste = (text: string) =>
      fireEvent.paste(input, { clipboardData: { getData: () => text } });
    paste("111-111");
    expect(input).toHaveValue("111111");
    await userEvent.click(screen.getByRole("button", { name: "Open quote" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That code isn't right. 3 tries left.",
    );
    expect(input).toHaveAttribute("aria-describedby", screen.getByRole("alert").id);

    paste("123 456");
    await userEvent.click(screen.getByRole("button", { name: "Open quote" }));
    expect(await screen.findByRole("heading", { name: "Online store" })).toBeInTheDocument();
    expect(verifyQuoteCode).toHaveBeenLastCalledWith("tokD", "v1.chal.sig", "123456");
    expect(sendQuoteCode).toHaveBeenCalledTimes(1);
  });

  it("does not submit until asked, and asks for six digits", async () => {
    fetchClientQuote.mockRejectedValue(locked());
    fetchQuoteAccess.mockResolvedValue(lockedStatus);
    sendQuoteCode.mockResolvedValue(codeSent);
    renderAt("/q/tokD2");
    const input = await screen.findByLabelText("6-digit code");
    await userEvent.type(input, "12345");
    expect(verifyQuoteCode).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Open quote" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter the 6-digit code");
    expect(verifyQuoteCode).not.toHaveBeenCalled();
  });

  it("shows the contact address and sends nothing when codes are blocked", async () => {
    fetchClientQuote.mockRejectedValue(locked());
    fetchQuoteAccess.mockResolvedValue({ ...lockedStatus, canUnlock: false, blocked: true });
    renderAt("/q/tokE");
    expect(await screen.findByText(/too many wrong codes/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Email hello@oceaniccoder.dev" })).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:hello@oceaniccoder.dev"),
    );
    expect(screen.queryByLabelText("6-digit code")).toBeNull();
    expect(sendQuoteCode).not.toHaveBeenCalled();
  });

  it("tells the client to get in touch when the quote has no email", async () => {
    fetchClientQuote.mockRejectedValue(locked());
    fetchQuoteAccess.mockResolvedValue({ locked: true, canUnlock: false, maskedEmail: null });
    renderAt("/q/tokF");
    expect(await screen.findByText(/can't be opened with a code/i)).toBeInTheDocument();
    expect(sendQuoteCode).not.toHaveBeenCalled();
  });

  it("admin preview asks with the admin session and never emails the client", async () => {
    fetchClientQuote.mockResolvedValue({ quote: baseQuote });
    renderAt("/q/tokG?preview=admin");
    expect(await screen.findByRole("heading", { name: "Online store" })).toBeInTheDocument();
    expect(fetchClientQuote).toHaveBeenCalledWith("tokG", { preview: false, admin: true });
  });

  it("admin preview keeps its mode on the pay and invoice links, and offers no accept form", async () => {
    const due = { ...baseQuote.stages[0], state: "due" as const, dueAt: "2026-10-02T00:00:00Z" };
    fetchClientQuote.mockResolvedValue({
      quote: {
        ...baseQuote,
        status: "accepted",
        acceptedName: "Kofi",
        stages: [due, baseQuote.stages[1]],
      },
    });
    renderAt("/q/tokG2?preview=admin");
    for (const link of await screen.findAllByRole("link", { name: /pay the deposit|pay now/i }))
      expect(link.getAttribute("href")).toBe("/q/tokG2/pay/deposit?preview=admin");
    expect(screen.getByRole("link", { name: "Invoice" })).toHaveAttribute(
      "href",
      "/q/tokG2/invoice/deposit?preview=admin",
    );
  });

  it("admin preview of a sent quote shows a note instead of the accept form", async () => {
    fetchClientQuote.mockResolvedValue({ quote: baseQuote });
    renderAt("/q/tokG3?preview=admin");
    expect(await screen.findByText(/preview only: your client accepts/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/full name/i)).toBeNull();
  });

  it("claims a link code once under StrictMode", async () => {
    window.history.replaceState(null, "", "/q/tokS#k=STRICT");
    captureLinkCode();
    claimQuoteLink.mockResolvedValue({ ok: true });
    fetchClientQuote.mockResolvedValue({ quote: baseQuote });
    render(
      <StrictMode>
        <HelmetProvider>
          <MemoryRouter initialEntries={["/q/tokS"]}>
            <Routes>
              <Route path="/q/:token" element={<QuotePage />} />
            </Routes>
          </MemoryRouter>
        </HelmetProvider>
      </StrictMode>,
    );
    expect(await screen.findByRole("heading", { name: "Online store" })).toBeInTheDocument();
    expect(claimQuoteLink).toHaveBeenCalledTimes(1);
    expect(sendQuoteCode).not.toHaveBeenCalled();
  });

  it("says cookies are blocked when a good link code still leaves the quote locked", async () => {
    window.history.replaceState(null, "", "/q/tokK#k=GOOD");
    captureLinkCode();
    claimQuoteLink.mockResolvedValue({ ok: true });
    fetchClientQuote.mockRejectedValue(locked());
    renderAt("/q/tokK");
    expect(await screen.findByText(/didn't keep the sign-in/)).toBeInTheDocument();
    expect(fetchQuoteAccess).not.toHaveBeenCalled();
    expect(sendQuoteCode).not.toHaveBeenCalled();
  });

  it("says cookies are blocked when a right code still leaves the quote locked", async () => {
    fetchClientQuote.mockRejectedValue(locked());
    fetchQuoteAccess.mockResolvedValue(lockedStatus);
    sendQuoteCode.mockResolvedValue(codeSent);
    verifyQuoteCode.mockResolvedValue({ ok: true });
    renderAt("/q/tokL");
    const input = await screen.findByLabelText("6-digit code");
    await waitFor(() => expect(sendQuoteCode).toHaveBeenCalled());
    fireEvent.paste(input, { clipboardData: { getData: () => "123456" } });
    await userEvent.click(screen.getByRole("button", { name: "Open quote" }));
    expect(await screen.findByText(/didn't keep the sign-in/)).toBeInTheDocument();
    expect(sendQuoteCode).toHaveBeenCalledTimes(1);
  });

  it("admin preview without a dashboard session shows no code screen", async () => {
    fetchClientQuote.mockRejectedValue(locked());
    renderAt("/q/tokH?preview=admin");
    expect(await screen.findByText(/preview needs your dashboard session/i)).toBeInTheDocument();
    expect(fetchQuoteAccess).not.toHaveBeenCalled();
    expect(sendQuoteCode).not.toHaveBeenCalled();
  });

  it("shows the code screen when the unlock ends before accepting", async () => {
    fetchClientQuote.mockResolvedValue({ quote: baseQuote });
    respondToQuote.mockRejectedValue(locked());
    fetchQuoteAccess.mockResolvedValue(lockedStatus);
    sendQuoteCode.mockResolvedValue(codeSent);
    renderAt("/q/tokI");
    await userEvent.type(await screen.findByLabelText(/full name/i), "Kofi Mensah");
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: /accept quote/i }));
    expect(await screen.findByLabelText("6-digit code")).toBeInTheDocument();
  });
});
