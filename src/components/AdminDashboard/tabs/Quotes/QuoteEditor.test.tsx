import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const quoteAdmin = vi.fn();
let rejectWith: (() => Promise<never>) | null = null;
vi.mock("@/services/api/quotes", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/api/quotes")>("@/services/api/quotes");
  return {
    ...actual,
    quoteAdmin: (...a: unknown[]) => (rejectWith ? rejectWith() : quoteAdmin(...a)),
  };
});

import QuoteEditor from "./QuoteEditor";
import { QuoteApiError } from "@/services/api/quotes";

beforeEach(() => {
  quoteAdmin.mockReset();
  rejectWith = null;
});

async function fillClient() {
  await userEvent.type(screen.getByLabelText(/client name/i), "Kofi Mensah");
  await userEvent.type(screen.getByLabelText(/client email/i), "kofi@example.com");
}

describe("QuoteEditor", () => {
  it("walks the steps and shows live stage amounts", async () => {
    render(<QuoteEditor theme="dark" onClose={vi.fn()} onSaved={vi.fn()} />);
    await fillClient();
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    await userEvent.type(screen.getByLabelText(/project title/i), "Online store");
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    await userEvent.type(screen.getByLabelText(/description for item 1/i), "Store build");
    await userEvent.clear(screen.getByLabelText(/price for item 1/i));
    await userEvent.type(screen.getByLabelText(/price for item 1/i), "10000");
    expect(screen.getByText(/Total GHS 10,000.00/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    const form = screen.getByRole("region", { name: /payment stages/i });
    expect(within(form).getByText("GHS 6,000.00")).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText(/percent for stage 1/i));
    await userEvent.type(screen.getByLabelText(/percent for stage 1/i), "50");
    expect(screen.getByRole("alert")).toHaveTextContent(/add up to 90%/);
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("saves a new draft and reports the new id", async () => {
    quoteAdmin.mockResolvedValue({ quote: { id: "q9" }, stages: [], payments: [] });
    const onSaved = vi.fn();
    render(
      <QuoteEditor
        theme="dark"
        initial={{
          clientName: "Kofi",
          clientEmail: "kofi@example.com",
          title: "Store",
          items: [{ id: "item-a", description: "Build", qty: 1, unitMinor: 100000 }],
        }}
        onClose={vi.fn()}
        onSaved={onSaved}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() =>
      expect(quoteAdmin).toHaveBeenCalledWith(
        "create",
        expect.objectContaining({ draft: expect.objectContaining({ title: "Store" }) }),
      ),
    );
    expect(onSaved).toHaveBeenCalledWith("q9");
  });

  it("shows server field errors", async () => {
    // Reject from a plain function, not the vi.fn: vitest 1.6 fails the test on a rejected
    // promise returned from a spy even when the caller catches it.
    const failure = new QuoteApiError("Fix the highlighted fields.", 400, {
      clientEmail: "Enter a valid email address.",
    });
    rejectWith = () => Promise.reject(failure);

    render(
      <QuoteEditor
        theme="dark"
        initial={{ clientName: "Kofi", title: "Store" }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
  });

  it("flags an unreadable price and blocks Next and Save", async () => {
    render(
      <QuoteEditor theme="dark" initial={{ title: "S" }} onClose={vi.fn()} onSaved={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /line items/i }));
    await userEvent.type(screen.getByLabelText(/price for item 1/i), "abc");
    expect(screen.getByText(/enter a valid amount/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /save draft/i })).toBeDisabled();
  });

  it("jumps to Line items for a server price error", async () => {
    const failure = new QuoteApiError("Fix the highlighted fields.", 400, {
      "items.0.unitMinor": "Enter a valid price.",
    });
    rejectWith = () => Promise.reject(failure);
    render(
      <QuoteEditor theme="dark" initial={{ title: "S" }} onClose={vi.fn()} onSaved={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
    expect(await screen.findByText("Enter a valid price.")).toBeInTheDocument();
    expect(screen.getByLabelText(/price for item 1/i)).toBeInTheDocument();
  });

  it("renders as a page, not a dialog, and leaves through All quotes", async () => {
    const onClose = vi.fn();
    render(<QuoteEditor theme="dark" onClose={onClose} onSaved={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /all quotes/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("hides Back on the first step and shows where you are", async () => {
    render(<QuoteEditor theme="dark" onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /^back$/i })).not.toBeInTheDocument();
    expect(screen.getByText(/step 1 of 6/i)).toBeInTheDocument();
    await fillClient();
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByRole("button", { name: /^back$/i })).toBeInTheDocument();
    expect(screen.getByText(/step 2 of 6/i)).toBeInTheDocument();
  });

  it("keeps a live summary with the total and stage amounts", () => {
    render(
      <QuoteEditor
        theme="dark"
        initial={{
          clientName: "Kofi",
          items: [{ id: "item-a", description: "Build", qty: 1, unitMinor: 1000000 }],
        }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    const summary = screen.getByRole("complementary", { name: /summary/i });
    // Total and subtotal match with no discount.
    expect(within(summary).getAllByText("GHS 10,000.00")).toHaveLength(2);
    expect(within(summary).getByText(/60% · Deposit/)).toBeInTheDocument();
    expect(within(summary).getByText("GHS 6,000.00")).toBeInTheDocument();
  });

  it("applies a payment preset", async () => {
    render(
      <QuoteEditor theme="dark" initial={{ title: "S" }} onClose={vi.fn()} onSaved={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /payment stages/i }));
    await userEvent.click(screen.getByRole("button", { name: "50 / 50" }));
    expect(screen.getByLabelText(/percent for stage 1/i)).toHaveValue(50);
    expect(screen.getByLabelText(/percent for stage 2/i)).toHaveValue(50);
    expect(screen.getByRole("button", { name: "50 / 50" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: /100% upfront/i }));
    expect(screen.getByLabelText(/percent for stage 1/i)).toHaveValue(100);
    expect(screen.queryByLabelText(/percent for stage 2/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "40 / 30 / 30" }));
    expect(screen.getByLabelText(/percent for stage 3/i)).toHaveValue(30);
  });

  it("saves the 100% upfront plan as one full-payment stage", async () => {
    quoteAdmin.mockResolvedValue({ quote: { id: "q5" }, stages: [], payments: [] });
    render(
      <QuoteEditor
        theme="dark"
        initial={{
          clientName: "Kofi",
          clientEmail: "kofi@example.com",
          title: "Store",
          items: [{ id: "item-a", description: "Build", qty: 1, unitMinor: 100000 }],
        }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /payment stages/i }));
    await userEvent.click(screen.getByRole("button", { name: /100% upfront/i }));
    expect(screen.getByRole("button", { name: /next/i })).toBeEnabled();
    await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() =>
      expect(quoteAdmin).toHaveBeenCalledWith(
        "create",
        expect.objectContaining({
          draft: expect.objectContaining({
            schedule: [{ id: "full", label: "Full payment", percent: 100 }],
          }),
        }),
      ),
    );
  });

  it("saves and sends from Review, then offers WhatsApp to the client's number", async () => {
    quoteAdmin.mockImplementation(async (action: string) =>
      action === "send"
        ? {
            quote: { id: "q9" },
            stages: [],
            payments: [],
            link: "https://oceaniccoder.dev/q/T",
            emailed: true,
          }
        : { quote: { id: "q9" }, stages: [], payments: [] },
    );
    const onSaved = vi.fn();
    render(
      <QuoteEditor
        theme="dark"
        initial={{
          clientName: "Kofi Mensah",
          clientEmail: "kofi@example.com",
          clientPhone: "024 123 4567",
          title: "Store",
          items: [{ id: "item-a", description: "Build", qty: 1, unitMinor: 100000 }],
        }}
        onClose={vi.fn()}
        onSaved={onSaved}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /review/i }));
    await userEvent.click(screen.getByRole("button", { name: /save and send/i }));
    await waitFor(() => expect(quoteAdmin).toHaveBeenCalledWith("send", { id: "q9" }));
    const wa = await screen.findByRole("link", { name: /send on whatsapp/i });
    expect(wa.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/233241234567\?text=/);
    expect(screen.getByDisplayValue("https://oceaniccoder.dev/q/T")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /done/i }));
    expect(onSaved).toHaveBeenCalledWith("q9");
  });

  it("saves an existing quote with its id", async () => {
    quoteAdmin.mockResolvedValue({ quote: { id: "q1" }, stages: [], payments: [] });
    render(
      <QuoteEditor
        theme="dark"
        quoteId="q1"
        initial={{ title: "S" }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() =>
      expect(quoteAdmin).toHaveBeenCalledWith(
        "save",
        expect.objectContaining({ id: "q1", draft: expect.objectContaining({ title: "S" }) }),
      ),
    );
  });
});
