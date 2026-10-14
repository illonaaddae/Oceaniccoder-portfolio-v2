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

const detail = (status: "sent" | "accepted" | "draft", clientEmail = "kofi@example.com") =>
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
    stages: [],
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
    await userEvent.type(screen.getByLabelText(/also send to/i), "prince_ofori@hotmail.com");
    await userEvent.click(save);
    await userEvent.click(screen.getByRole("button", { name: "Send email" }));
    expect(quoteAdmin).toHaveBeenCalledWith("emailAgain", {
      id: "q1",
      to: "prince_ofori@hotmail.com",
      saveAddress: true,
    });
    expect(
      await screen.findByText(/prince_ofori@hotmail\.com is now the client's email/i),
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
