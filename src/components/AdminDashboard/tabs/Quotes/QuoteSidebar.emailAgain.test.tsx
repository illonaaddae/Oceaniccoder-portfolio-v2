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

const depositDue = {
  id: "deposit",
  label: "Deposit",
  percent: 60,
  index: 0,
  amountMinor: 6000,
  state: "due" as const,
  dueAt: "2026-10-10T09:00:00.000Z",
  overdue: false,
  invoiceNumber: "Q-2026-0001-INV-1",
  paidAt: null,
  reference: null,
};

const detail = (
  status: "sent" | "accepted" | "draft",
  clientEmail = "kofi@example.com",
  stages: unknown[] = status === "accepted" ? [depositDue] : [],
) =>
  ({
    quote: {
      id: "q1",
      quoteNumber: "Q-2026-0001",
      revision: 1,
      status,
      currency: "GHS",
      title: "Store",
      clientName: "Kofi Mensah",
      clientEmail,
      items: [],
      totalMinor: 10000,
      subtotalMinor: 10000,
      schedule: [],
      hasLink: status !== "draft",
    },
    stages,
    payments: [],
    maintenance: null,
  }) as unknown as QuoteDetailResponse;

const renderSidebar = (data: QuoteDetailResponse, onChanged = vi.fn()) => {
  render(
    <MemoryRouter>
      <QuoteSidebar data={data} onChanged={onChanged} />
    </MemoryRouter>,
  );
  return onChanged;
};

const LINK = "https://oceaniccoder.dev/q/" + "a".repeat(43);

beforeEach(() => {
  quoteAdmin.mockReset();
  confirm.mockReset();
});

describe("QuoteSidebar Email again", () => {
  it.each(["sent", "accepted"] as const)("is offered for a %s quote", (status) => {
    renderSidebar(detail(status));
    expect(screen.getByRole("button", { name: "Email again" })).toBeInTheDocument();
  });

  it("is not offered for an accepted quote with nothing due", () => {
    renderSidebar(detail("accepted", "kofi@example.com", [{ ...depositDue, state: "paid" }]));
    expect(screen.queryByRole("button", { name: "Email again" })).not.toBeInTheDocument();
  });

  it("describes what an accepted quote's email will contain", async () => {
    renderSidebar(detail("accepted"));
    await userEvent.click(screen.getByRole("button", { name: "Email again" }));
    expect(screen.getByText(/sends what's due now/i)).toBeInTheDocument();
  });

  it("returns focus to the button when the form is cancelled", async () => {
    renderSidebar(detail("sent"));
    await userEvent.click(screen.getByRole("button", { name: "Email again" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Email again" })).toHaveFocus());
  });

  it("doesn't bring back a stale form after the quote is revised and sent again", async () => {
    const view = (data: QuoteDetailResponse) => (
      <MemoryRouter>
        <QuoteSidebar data={data} onChanged={vi.fn()} />
      </MemoryRouter>
    );
    const sent = detail("sent");
    const { rerender } = render(view(sent));
    await userEvent.click(screen.getByRole("button", { name: "Email again" }));
    await userEvent.type(screen.getByLabelText(/also send to/i), "stale@old.com");
    rerender(view({ ...sent, quote: { ...sent.quote, status: "draft", revision: 2 } }));
    rerender(view({ ...sent, quote: { ...sent.quote, status: "sent", revision: 2 } }));
    expect(screen.queryByLabelText(/also send to/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Email again" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("is not offered for a sent quote past its valid-until date", () => {
    const sent = detail("sent");
    renderSidebar({
      ...sent,
      quote: { ...sent.quote, validUntil: "2020-01-01T00:00:00.000Z" },
    } as QuoteDetailResponse);
    expect(screen.queryByRole("button", { name: "Email again" })).not.toBeInTheDocument();
  });

  it("doesn't reopen by itself when a later stage becomes due", async () => {
    const view = (data: QuoteDetailResponse) => (
      <MemoryRouter>
        <QuoteSidebar data={data} onChanged={vi.fn()} />
      </MemoryRouter>
    );
    const balance = { ...depositDue, id: "balance", label: "Balance", index: 1, state: "later" };
    const { rerender } = render(
      view(detail("accepted", "kofi@example.com", [depositDue, balance])),
    );
    await userEvent.click(screen.getByRole("button", { name: "Email again" }));
    await userEvent.type(screen.getByLabelText(/also send to/i), "x@y.com");
    const paid = { ...depositDue, state: "paid" };
    rerender(view(detail("accepted", "kofi@example.com", [paid, balance])));
    rerender(view(detail("accepted", "kofi@example.com", [paid, { ...balance, state: "due" }])));
    expect(screen.queryByLabelText(/also send to/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Email again" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("keeps focus on Send email while sending and returns it to the button after", async () => {
    let finish: (v: unknown) => void = () => {};
    quoteAdmin.mockReturnValue(new Promise((r) => (finish = r)));
    renderSidebar(detail("sent"));
    await userEvent.click(screen.getByRole("button", { name: "Email again" }));
    const sendButton = screen.getByRole("button", { name: "Send email" });
    await userEvent.click(sendButton);
    expect(sendButton).not.toBeDisabled();
    expect(sendButton).toHaveAttribute("aria-disabled", "true");
    expect(sendButton).toHaveFocus();
    await userEvent.click(sendButton);
    expect(quoteAdmin).toHaveBeenCalledTimes(1);
    finish({
      ...detail("sent"),
      link: LINK,
      emailed: true,
      emailedTo: ["kofi@example.com"],
      failedTo: [],
    });
    await waitFor(() => expect(screen.getByRole("button", { name: "Email again" })).toHaveFocus());
  });

  it("puts focus back in the address field when the send fails", async () => {
    quoteAdmin.mockRejectedValue(new Error("Enter a valid email address."));
    renderSidebar(detail("sent"));
    await userEvent.click(screen.getByRole("button", { name: "Email again" }));
    await userEvent.click(screen.getByRole("button", { name: "Send email" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter a valid email address.");
    await waitFor(() => expect(screen.getByLabelText(/also send to/i)).toHaveFocus());
  });

  it("keeps the status region mounted so new messages are announced", () => {
    renderSidebar(detail("sent"));
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("is not offered for a draft", () => {
    renderSidebar(detail("draft"));
    expect(screen.queryByRole("button", { name: "Email again" })).not.toBeInTheDocument();
  });

  it("moves focus to the address field when the form opens", async () => {
    renderSidebar(detail("sent"));
    await userEvent.click(screen.getByRole("button", { name: "Email again" }));
    await waitFor(() => expect(screen.getByLabelText(/also send to/i)).toHaveFocus());
  });

  it("hides the form once the quote is no longer sent or accepted", async () => {
    const { rerender } = render(
      <MemoryRouter>
        <QuoteSidebar data={detail("sent")} onChanged={vi.fn()} />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Email again" }));
    expect(screen.getByLabelText(/also send to/i)).toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <QuoteSidebar
          data={{ ...detail("sent"), quote: { ...detail("sent").quote, status: "cancelled" } }}
          onChanged={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByLabelText(/also send to/i)).not.toBeInTheDocument();
  });

  it("emails the client's address plus another one, without saving it by default", async () => {
    quoteAdmin.mockResolvedValue({
      ...detail("sent"),
      link: LINK,
      emailed: true,
      emailedTo: ["kofi@example.com", "prince_ofori@hotmail.com"],
      failedTo: [],
    });
    const onChanged = renderSidebar(detail("sent"));
    await userEvent.click(screen.getByRole("button", { name: "Email again" }));
    expect(screen.getByText(/link they have now stops working/i)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/also send to/i), "prince_ofori@hotmail.com");
    await userEvent.click(screen.getByRole("button", { name: "Send email" }));

    expect(quoteAdmin).toHaveBeenCalledWith("emailAgain", {
      id: "q1",
      to: "prince_ofori@hotmail.com",
      saveAddress: false,
    });
    expect(
      await screen.findByText(/emailed to kofi@example\.com and prince_ofori@hotmail\.com/i),
    ).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();
    expect(screen.getByLabelText("Quote link")).toHaveValue(LINK);
    expect(screen.queryByLabelText(/also send to/i)).not.toBeInTheDocument();
  });

  it("can make the other address the client's email from now on", async () => {
    quoteAdmin.mockResolvedValue({
      ...detail("accepted", "prince_ofori@hotmail.com"),
      link: LINK,
      emailed: true,
      emailedTo: ["kofi@example.com", "prince_ofori@hotmail.com"],
      failedTo: [],
    });
    renderSidebar(detail("accepted"));
    await userEvent.click(screen.getByRole("button", { name: "Email again" }));
    const save = screen.getByRole("checkbox", { name: /use this address from now on/i });
    expect(save).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/also send to/i), "Prince_Ofori@Hotmail.com");
    await userEvent.click(save);
    await userEvent.click(screen.getByRole("button", { name: "Send email" }));
    expect(quoteAdmin).toHaveBeenCalledWith("emailAgain", {
      id: "q1",
      to: "Prince_Ofori@Hotmail.com",
      saveAddress: true,
    });
    // The message shows the address as saved (lowercased by the server).
    expect(
      await screen.findByText(/prince_ofori@hotmail\.com is now the client's email/),
    ).toBeInTheDocument();
  });

  it("sends to the client's address alone when no other address is given", async () => {
    quoteAdmin.mockResolvedValue({
      ...detail("sent"),
      link: LINK,
      emailed: true,
      emailedTo: ["kofi@example.com"],
      failedTo: [],
    });
    renderSidebar(detail("sent"));
    await userEvent.click(screen.getByRole("button", { name: "Email again" }));
    await userEvent.click(screen.getByRole("button", { name: "Send email" }));
    expect(quoteAdmin).toHaveBeenCalledWith("emailAgain", { id: "q1", to: "", saveAddress: false });
  });

  it("says which address the email didn't reach", async () => {
    quoteAdmin.mockResolvedValue({
      ...detail("sent"),
      link: LINK,
      emailed: false,
      emailedTo: ["kofi@example.com"],
      failedTo: ["prince_ofori@hotmail.com"],
    });
    renderSidebar(detail("sent"));
    await userEvent.click(screen.getByRole("button", { name: "Email again" }));
    await userEvent.type(screen.getByLabelText(/also send to/i), "prince_ofori@hotmail.com");
    await userEvent.click(screen.getByRole("button", { name: "Send email" }));
    expect(await screen.findByText(/didn't reach prince_ofori@hotmail\.com/i)).toBeInTheDocument();
  });
});
