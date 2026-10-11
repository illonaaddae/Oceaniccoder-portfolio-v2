import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
    expect(screen.getByText("GHS 6,000.00")).toBeInTheDocument();
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
    await userEvent.click(screen.getByRole("button", { name: /3\. line items/i }));
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

  it("closes on Escape when nothing changed", async () => {
    const onClose = vi.fn();
    render(<QuoteEditor theme="dark" onClose={onClose} onSaved={vi.fn()} />);
    await userEvent.keyboard("{esc}");
    expect(onClose).toHaveBeenCalled();
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
