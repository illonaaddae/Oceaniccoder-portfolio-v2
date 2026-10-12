import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  it("outlines the optional extras (Phase 2) area with a dashed border", async () => {
    render(<QuoteEditor theme="dark" onClose={vi.fn()} onSaved={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /extras/i }));
    expect(screen.getByTestId("optional-extras")).toHaveStyle({ borderStyle: "dashed" });
  });

  it("picks the currency from the design-system dropdown, not a native select", async () => {
    render(<QuoteEditor theme="dark" onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(document.querySelector("select")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Currency" }));
    await userEvent.click(screen.getByRole("option", { name: /USD/ }));
    expect(screen.getByRole("button", { name: "Currency" })).toHaveTextContent("USD");
  });

  it("keeps At a glance boxes stable while typing into a later box", async () => {
    quoteAdmin.mockResolvedValue({
      quote: { id: "q1", status: "draft" },
      stages: [],
      payments: [],
    });
    render(<QuoteEditor theme="dark" onClose={vi.fn()} onSaved={vi.fn()} />);
    await fillClient();
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    await userEvent.type(screen.getByLabelText(/project title/i), "Store");
    await userEvent.type(screen.getByLabelText(/at a glance fact 3/i), "Fast");
    expect(screen.getByLabelText(/at a glance fact 3/i)).toHaveValue("Fast");
    expect(screen.getByLabelText(/at a glance fact 1/i)).toHaveValue("");
    await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
    const draft = quoteAdmin.mock.calls[quoteAdmin.mock.calls.length - 1][1].draft;
    expect(draft.highlights).toEqual(["Fast"]);
  });

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

  it("saves highlights, item details, a discount label and stage notes", async () => {
    quoteAdmin.mockResolvedValue({
      quote: { id: "q1", status: "draft" },
      stages: [],
      payments: [],
    });
    render(<QuoteEditor theme="dark" onClose={vi.fn()} onSaved={vi.fn()} />);
    await fillClient();
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    await userEvent.type(screen.getByLabelText(/project title/i), "Store");
    await userEvent.type(screen.getByLabelText(/at a glance fact 1/i), "Live in 14 weeks");
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    await userEvent.type(screen.getByLabelText(/description for item 1/i), "Build");
    await userEvent.click(screen.getByRole("button", { name: /add what it includes/i }));
    await userEvent.type(screen.getByLabelText(/what item 1 includes/i), "Pages and checkout");
    await userEvent.type(screen.getByLabelText(/discount label/i), "First-client discount");
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    await userEvent.type(screen.getByLabelText(/when stage 1 is due/i), "To start the project");
    await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
    const draft = quoteAdmin.mock.calls[quoteAdmin.mock.calls.length - 1][1].draft;
    expect(draft.highlights).toEqual(["Live in 14 weeks"]);
    expect(draft.items[0].detail).toBe("Pages and checkout");
    expect(draft.discountLabel).toBe("First-client discount");
    expect(draft.schedule[0].note).toBe("To start the project");
  });

  it("adds extras that never change the total", async () => {
    quoteAdmin.mockResolvedValue({
      quote: { id: "q1", status: "draft" },
      stages: [],
      payments: [],
    });
    render(<QuoteEditor theme="dark" onClose={vi.fn()} onSaved={vi.fn()} />);
    await fillClient();
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    await userEvent.type(screen.getByLabelText(/project title/i), "Store");
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    await userEvent.type(screen.getByLabelText(/description for item 1/i), "Build");
    await userEvent.clear(screen.getByLabelText(/price for item 1/i));
    await userEvent.type(screen.getByLabelText(/price for item 1/i), "10000");
    await userEvent.click(screen.getByRole("button", { name: /next/i })); // stages
    await userEvent.click(screen.getByRole("button", { name: /next/i })); // extras
    await userEvent.click(screen.getByRole("button", { name: /add running cost/i }));
    await userEvent.type(screen.getByLabelText(/service for running cost 1/i), "Appwrite Pro");
    await userEvent.type(screen.getByLabelText(/estimated cost 1/i), "USD 25 / month");
    await userEvent.type(screen.getByLabelText(/not included/i), "Logo design");
    await userEvent.type(screen.getByLabelText(/optional section title/i), "Phase 2");
    await userEvent.click(screen.getByRole("button", { name: /add optional item/i }));
    await userEvent.type(screen.getByLabelText(/description for optional item 1/i), "SMS updates");
    await userEvent.clear(screen.getByLabelText(/price for optional item 1/i));
    await userEvent.type(screen.getByLabelText(/price for optional item 1/i), "2500");
    const summary = screen.getByRole("complementary", { name: /quote summary/i });
    expect(within(summary).getAllByText("GHS 10,000.00")).toHaveLength(2); // total and subtotal
    expect(summary).not.toHaveTextContent("12,500.00");
    expect(screen.getByText(/optional extras \(not in total\)/i).parentElement).toHaveTextContent(
      "GHS 2,500.00",
    );
    await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
    const draft = quoteAdmin.mock.calls[quoteAdmin.mock.calls.length - 1][1].draft;
    expect(draft.runningCosts[0]).toMatchObject({
      service: "Appwrite Pro",
      cost: "USD 25 / month",
    });
    expect(draft.exclusions).toBe("Logo design");
    expect(draft.optionalItems[0]).toMatchObject({ description: "SMS updates", unitMinor: 250000 });
  });

  it("explains At a glance and where Phase 2 goes", async () => {
    render(<QuoteEditor theme="dark" onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByText("Running costs, Phase 2")).toBeInTheDocument();
    await fillClient();
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(
      screen.getByText(/shown as tiles at the top of the client's quote/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/at a glance fact 1/i)).toHaveAttribute(
      "placeholder",
      "e.g. Live in about 14 weeks",
    );
    expect(screen.getByLabelText(/at a glance fact 4/i)).toHaveAttribute(
      "placeholder",
      "e.g. 30 days of support after launch",
    );
    await userEvent.type(screen.getByLabelText(/project title/i), "Store");
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    await userEvent.type(screen.getByLabelText(/description for item 1/i), "Build");
    await userEvent.click(screen.getByRole("button", { name: /next/i })); // stages
    await userEvent.click(screen.getByRole("button", { name: /next/i })); // extras
    const optional = screen.getByRole("region", { name: "Optional extras (e.g. Phase 2)" });
    expect(optional).toHaveTextContent(/Not in this quote/);
    expect(within(optional).getByLabelText(/optional section title/i)).toHaveAttribute(
      "placeholder",
      "e.g. Phase 2: growth features",
    );
    await userEvent.click(screen.getByRole("button", { name: /add running cost/i }));
    expect(screen.getByLabelText(/service for running cost 1/i)).toHaveAttribute("maxLength", "60");
    expect(screen.getByLabelText(/what running cost 1 is for/i)).toHaveAttribute(
      "maxLength",
      "120",
    );
    expect(screen.getByLabelText(/estimated cost 1/i)).toHaveAttribute("maxLength", "60");
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
    expect(screen.getByText(/step 1 of 7/i)).toBeInTheDocument();
    await fillClient();
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByRole("button", { name: /^back$/i })).toBeInTheDocument();
    expect(screen.getByText(/step 2 of 7/i)).toBeInTheDocument();
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

  describe("What I'll need from you", () => {
    const SAMPLE = [
      "- Access to the business email (info@westafricawander.com) during development",
      "- Business registration certificate (Registrar General's Department)",
      "- Tax Identification Number (TIN)",
      "- Trip details: itinerary, inclusions and exclusions, dates, seats, prices, meeting points",
      "Photos:",
      "- Photos and videos for each trip and destination",
    ].join("\n");

    async function openExtras() {
      quoteAdmin.mockResolvedValue({
        quote: { id: "q1", status: "draft" },
        stages: [],
        payments: [],
      });
      render(<QuoteEditor theme="dark" onClose={vi.fn()} onSaved={vi.fn()} />);
      await fillClient();
      await userEvent.click(screen.getByRole("button", { name: /extras/i }));
    }
    const savedAssumptions = async () => {
      await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
      return quoteAdmin.mock.calls[quoteAdmin.mock.calls.length - 1][1].draft.assumptions;
    };

    it("adds, edits and removes items and headings", async () => {
      await openExtras();
      expect(screen.queryByLabelText("What I need from you")).toBeNull();
      await userEvent.click(screen.getByRole("button", { name: "Add group heading" }));
      await userEvent.type(screen.getByLabelText("Group heading 1"), "Access");
      await userEvent.click(screen.getByRole("button", { name: "Add item" }));
      await userEvent.type(screen.getByLabelText("Need 1"), "Email login");
      await userEvent.click(screen.getByRole("button", { name: "Add item" }));
      await userEvent.type(screen.getByLabelText("Need 2"), "Domain");
      expect(screen.getByLabelText("Need 1")).toHaveValue("Email login");
      await userEvent.click(screen.getByRole("button", { name: "Remove need 1" }));
      expect(screen.getByLabelText("Need 1")).toHaveValue("Domain");
      await userEvent.click(screen.getByRole("button", { name: "Remove heading 1" }));
      expect(screen.queryByLabelText("Group heading 1")).toBeNull();
      await userEvent.click(screen.getByRole("button", { name: "Add group heading" }));
      await userEvent.type(screen.getByLabelText("Group heading 1"), "Content");
      expect(await savedAssumptions()).toBe("Domain\nContent:");
    });

    it("moves a row up", async () => {
      await openExtras();
      await userEvent.click(screen.getByRole("button", { name: "Add item" }));
      await userEvent.type(screen.getByLabelText("Need 1"), "First");
      await userEvent.click(screen.getByRole("button", { name: "Add item" }));
      await userEvent.type(screen.getByLabelText("Need 2"), "Second");
      await userEvent.click(screen.getByRole("button", { name: "Move need 2 up" }));
      expect(screen.getByLabelText("Need 1")).toHaveValue("Second");
      expect(await savedAssumptions()).toBe("Second\nFirst");
    });

    it("pastes a list into rows and saves headings as Heading: lines", async () => {
      await openExtras();
      await userEvent.click(screen.getByRole("button", { name: "Paste a list" }));
      fireEvent.change(screen.getByLabelText("Paste your list"), { target: { value: SAMPLE } });
      await userEvent.click(screen.getByRole("button", { name: "Add these" }));
      expect(screen.queryByLabelText("Paste your list")).toBeNull();
      expect(screen.getByLabelText("Need 1")).toHaveValue(
        "Access to the business email (info@westafricawander.com) during development",
      );
      expect(screen.getByLabelText("Need 4")).toHaveValue(
        "Trip details: itinerary, inclusions and exclusions, dates, seats, prices, meeting points",
      );
      expect(screen.getByLabelText("Group heading 1")).toHaveValue("Photos");
      expect(screen.getByLabelText("Need 5")).toHaveValue(
        "Photos and videos for each trip and destination",
      );
      expect(await savedAssumptions()).toBe(
        [
          "Access to the business email (info@westafricawander.com) during development",
          "Business registration certificate (Registrar General's Department)",
          "Tax Identification Number (TIN)",
          "Trip details: itinerary, inclusions and exclusions, dates, seats, prices, meeting points",
          "Photos:",
          "Photos and videos for each trip and destination",
        ].join("\n"),
      );
    });
  });

  describe("embedded on a quote page", () => {
    const initial = {
      clientName: "Kofi",
      clientEmail: "kofi@example.com",
      title: "Store",
      items: [{ id: "item-a", description: "Build", qty: 1, unitMinor: 100000 }],
    };

    it("drops the page title and close, and saving stays on the page", async () => {
      quoteAdmin.mockResolvedValue({
        quote: { id: "q1", status: "draft" },
        stages: [],
        payments: [],
      });
      const onSaved = vi.fn();
      const onClose = vi.fn();
      render(
        <QuoteEditor
          theme="dark"
          embedded
          quoteId="q1"
          initial={initial}
          onClose={onClose}
          onSaved={onSaved}
        />,
      );
      expect(screen.queryByRole("button", { name: /all quotes/i })).toBeNull();
      expect(screen.queryByRole("heading", { name: /edit quote|new quote/i })).toBeNull();
      expect(screen.getByRole("navigation", { name: /quote steps/i })).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: /3\. line items/i }));
      await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
      await waitFor(() => expect(onSaved).toHaveBeenCalledWith("q1"));
      expect(onClose).not.toHaveBeenCalled();
      // Still on the same step after saving.
      expect(screen.getByLabelText(/description for item 1/i)).toHaveValue("Build");
    });

    it("reports the live draft and whether it has unsaved changes", async () => {
      const onChange = vi.fn();
      render(
        <QuoteEditor
          theme="dark"
          embedded
          quoteId="q1"
          initial={initial}
          onClose={vi.fn()}
          onSaved={vi.fn()}
          onChange={onChange}
        />,
      );
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ clientName: "Kofi" }),
        false,
      );
      await userEvent.type(screen.getByLabelText(/client name/i), "!");
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ clientName: "Kofi!" }),
        true,
      );
    });
  });

  describe("read-only", () => {
    it("walks the steps view-only, with no save or send", async () => {
      render(
        <QuoteEditor
          theme="dark"
          readOnly
          embedded
          quoteId="q1"
          initial={{
            clientName: "Kofi",
            title: "Store",
            items: [{ id: "item-a", description: "Build", qty: 1, unitMinor: 100000 }],
          }}
          onClose={vi.fn()}
          onSaved={vi.fn()}
        />,
      );
      const rail = screen.getByRole("navigation", { name: /quote steps/i });
      expect(within(rail).getAllByRole("button")).toHaveLength(6);
      expect(within(rail).queryByRole("button", { name: /review/i })).toBeNull();
      expect(screen.getByRole("heading", { name: "Client" })).toBeInTheDocument();
      expect(screen.getByLabelText(/client name/i)).toBeDisabled();
      expect(screen.getByLabelText(/client name/i)).toHaveValue("Kofi");
      expect(screen.queryByRole("button", { name: /save draft/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /save and send/i })).toBeNull();

      await userEvent.click(screen.getByRole("button", { name: /^next/i }));
      expect(screen.getByRole("heading", { name: "Page content" })).toBeInTheDocument();
      expect(screen.getByLabelText(/project title/i)).toBeDisabled();

      await userEvent.click(within(rail).getByRole("button", { name: /line items/i }));
      expect(screen.getByLabelText(/description for item 1/i)).toBeDisabled();

      await userEvent.click(within(rail).getByRole("button", { name: /terms/i }));
      expect(screen.getByRole("textbox", { name: "Terms" })).toBeDisabled();
      expect(screen.queryByRole("button", { name: /^next/i })).toBeNull();
      expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
    });
  });
});
