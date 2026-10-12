import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

  it("keeps a stage's note when a preset keeps that stage", async () => {
    render(
      <QuoteEditor theme="dark" initial={{ title: "S" }} onClose={vi.fn()} onSaved={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /payment stages/i }));
    await userEvent.type(screen.getByLabelText(/when stage 1 is due/i), "On signing");
    await userEvent.type(screen.getByLabelText(/when stage 2 is due/i), "At launch");
    await userEvent.click(screen.getByRole("button", { name: "50 / 50" }));
    expect(screen.getByLabelText(/when stage 1 is due/i)).toHaveValue("On signing");
    expect(screen.getByLabelText(/when stage 2 is due/i)).toHaveValue("At launch");
    await userEvent.click(screen.getByRole("button", { name: "40 / 30 / 30" }));
    expect(screen.getByLabelText(/when stage 1 is due/i)).toHaveValue("On signing");
    // Milestone is new, so it starts empty; Balance keeps its note.
    expect(screen.getByLabelText(/when stage 2 is due/i)).toHaveValue("");
    expect(screen.getByLabelText(/when stage 3 is due/i)).toHaveValue("At launch");
  });

  it("explains that running costs are paid by the client to each provider", async () => {
    render(<QuoteEditor theme="dark" onClose={vi.fn()} onSaved={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /extras/i }));
    expect(screen.getByText(/paid by the client directly to each provider/i)).toBeInTheDocument();
  });

  it("stays unsaved when the draft changes while a save is in flight", async () => {
    let finish: (v: unknown) => void = () => {};
    quoteAdmin.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const onChange = vi.fn();
    render(
      <QuoteEditor
        theme="dark"
        quoteId="q1"
        initial={{ clientName: "Kofi", clientEmail: "kofi@example.com" }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        onChange={onChange}
      />,
    );
    await userEvent.type(screen.getByLabelText(/client name/i), " M");
    await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
    await userEvent.type(screen.getByLabelText(/client name/i), "ensah");
    await act(async () => finish({ quote: { id: "q1" }, stages: [], payments: [] }));
    const [draft, dirty] = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(draft.clientName).toBe("Kofi Mensah");
    expect(dirty).toBe(true);
  });

  it("runs saves one after another and reuses the id the first one created", async () => {
    const pending: ((v: unknown) => void)[] = [];
    quoteAdmin.mockImplementation(
      () =>
        new Promise((resolve) => {
          pending.push(resolve);
        }),
    );
    const onSaved = vi.fn();
    render(
      <QuoteEditor
        theme="dark"
        initial={{ clientName: "Kofi", clientEmail: "kofi@example.com" }}
        onClose={vi.fn()}
        onSaved={onSaved}
      />,
    );
    const save = screen.getByRole("button", { name: /save draft/i });
    // Two clicks in one batch, before React re-renders the button as disabled.
    act(() => {
      save.click();
      save.click();
    });
    await waitFor(() => expect(quoteAdmin).toHaveBeenCalledTimes(1));
    await act(async () => pending[0]({ quote: { id: "q9" }, stages: [], payments: [] }));
    await waitFor(() => expect(quoteAdmin).toHaveBeenCalledTimes(2));
    expect(quoteAdmin.mock.calls[0][0]).toBe("create");
    expect(quoteAdmin.mock.calls[1]).toEqual(["save", expect.objectContaining({ id: "q9" })]);
    await act(async () => pending[1]({ quote: { id: "q9" }, stages: [], payments: [] }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("q9"));
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
    const lastDraft = () => quoteAdmin.mock.calls[quoteAdmin.mock.calls.length - 1][1].draft;

    async function openExtras(initial?: Record<string, unknown>) {
      quoteAdmin.mockResolvedValue({
        quote: { id: "q1", status: "draft" },
        stages: [],
        payments: [],
      });
      render(
        <QuoteEditor
          theme="dark"
          initial={initial}
          quoteId={initial ? "q1" : undefined}
          onClose={vi.fn()}
          onSaved={vi.fn()}
        />,
      );
      if (!initial) await fillClient();
      await userEvent.click(screen.getByRole("button", { name: /extras/i }));
    }
    const savedNeeds = async () => {
      await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
      return lastDraft().extras.needs;
    };

    it("adds a group and rows, moves and removes them, and saves extras.needs", async () => {
      await openExtras();
      await userEvent.type(screen.getByLabelText("Intro (optional)"), "Send these early.");
      await userEvent.click(screen.getByRole("button", { name: "Add group" }));
      await userEvent.type(screen.getByLabelText("Group 1 title"), "Accounts");
      await userEvent.type(screen.getByLabelText("Item 1 in group 1"), "Domain access");
      await userEvent.type(screen.getByLabelText("When 1 in group 1"), "Week 1");
      await userEvent.click(screen.getByRole("button", { name: "Add row to group 1" }));
      await userEvent.type(screen.getByLabelText("Item 2 in group 1"), "Email access");
      await userEvent.type(screen.getByLabelText("Used for 2 in group 1"), "Verification");
      await userEvent.click(screen.getByRole("button", { name: "Move row 2 in group 1 up" }));
      expect(screen.getByLabelText("Item 1 in group 1")).toHaveValue("Email access");
      await userEvent.click(screen.getByRole("button", { name: "Notes" }));
      expect(screen.getByLabelText("Notes 1 in group 1")).toHaveValue("Verification");
      await userEvent.click(screen.getByRole("button", { name: "Add row to group 1" }));
      await userEvent.click(screen.getByRole("button", { name: "Remove row 3 in group 1" }));

      const needs = await savedNeeds();
      expect(needs.intro).toBe("Send these early.");
      expect(needs.groups).toHaveLength(1);
      expect(needs.groups[0]).toMatchObject({ title: "Accounts", detailLabel: "Notes" });
      expect(
        needs.groups[0].rows.map((r: { item: string; detail: string; when: string }) => [
          r.item,
          r.detail,
          r.when,
        ]),
      ).toEqual([
        ["Email access", "Verification", ""],
        ["Domain access", "", "Week 1"],
      ]);
    });

    it("moves and removes groups", async () => {
      await openExtras();
      await userEvent.click(screen.getByRole("button", { name: "Add group" }));
      await userEvent.type(screen.getByLabelText("Group 1 title"), "First");
      await userEvent.click(screen.getByRole("button", { name: "Add group" }));
      await userEvent.type(screen.getByLabelText("Group 2 title"), "Second");
      await userEvent.click(screen.getByRole("button", { name: "Move group 2 up" }));
      expect(screen.getByLabelText("Group 1 title")).toHaveValue("Second");
      await userEvent.click(screen.getByRole("button", { name: "Remove group 2" }));
      expect(screen.queryByLabelText("Group 2 title")).toBeNull();
      expect((await savedNeeds()).groups.map((g: { title: string }) => g.title)).toEqual([
        "Second",
      ]);
    });

    it("pastes a table copied from Docs (TABs, header row) or typed with pipes", async () => {
      await openExtras();
      await userEvent.click(screen.getByRole("button", { name: "Add group" }));
      await userEvent.click(screen.getByRole("button", { name: "Paste a table into group 1" }));
      fireEvent.change(screen.getByLabelText("Paste rows into group 1"), {
        target: {
          value: [
            "Item\tUsed for\tWhen",
            "Logo\tWebsite, emails\tWeek 1",
            "",
            "Photos | Trip pages | Week 4",
            "Testimonials",
          ].join("\n"),
        },
      });
      await userEvent.click(screen.getByRole("button", { name: "Add these rows" }));
      expect(screen.queryByLabelText("Paste rows into group 1")).toBeNull();
      // The blank starter row is replaced, not kept above the pasted rows.
      expect(screen.getByLabelText("Item 1 in group 1")).toHaveValue("Logo");
      expect(screen.getByLabelText("Used for 1 in group 1")).toHaveValue("Website, emails");
      expect(screen.getByLabelText("When 2 in group 1")).toHaveValue("Week 4");
      expect(screen.getByLabelText("Item 3 in group 1")).toHaveValue("Testimonials");
      expect(screen.getByLabelText("When 3 in group 1")).toHaveValue("");
      expect(screen.queryByLabelText("Item 4 in group 1")).toBeNull();
    });

    it("fills the template when empty, then hides the button", async () => {
      await openExtras();
      await userEvent.click(screen.getByRole("button", { name: "Start from template" }));
      expect(screen.getByLabelText("Intro (optional)")).toHaveValue(
        "The timeline depends on these items arriving on time. Accounts and Paystack documents are needed in week 1, because provider approvals take time. Content is needed by week 4.",
      );
      expect(screen.getByLabelText("Group 1 title")).toHaveValue("Content and media");
      expect(screen.getByLabelText("Group 3 title")).toHaveValue("Business documents for Paystack");
      expect(screen.getByLabelText("Notes 3 in group 3")).toHaveValue("For the business");
      expect(screen.queryByRole("button", { name: "Start from template" })).toBeNull();
      const needs = await savedNeeds();
      expect(needs.groups.map((g: { rows: unknown[] }) => g.rows.length)).toEqual([7, 4, 7]);
    });

    it("converts the old one-line list into groups and clears it", async () => {
      await openExtras({
        clientName: "Kofi",
        clientEmail: "kofi@example.com",
        title: "Store",
        items: [{ id: "item-a", description: "Build", qty: 1, unitMinor: 100000 }],
        assumptions: [
          "- Tax Identification Number (TIN)",
          "- Business registration certificate (Registrar General's Department)",
          "Photos:",
          "- Photos and videos for each trip",
        ].join("\n"),
      });
      await userEvent.click(screen.getByRole("button", { name: "Convert the old list" }));
      expect(screen.queryByRole("button", { name: "Convert the old list" })).toBeNull();
      expect(screen.getByLabelText("Group 1 title")).toHaveValue("Items");
      expect(screen.getByLabelText("Item 2 in group 1")).toHaveValue(
        "Business registration certificate",
      );
      expect(screen.getByLabelText("Notes 2 in group 1")).toHaveValue(
        "Registrar General's Department",
      );
      expect(screen.getByLabelText("Group 2 title")).toHaveValue("Photos");
      expect(screen.getByLabelText("Item 1 in group 2")).toHaveValue(
        "Photos and videos for each trip",
      );
      const needs = await savedNeeds();
      expect(needs.groups).toHaveLength(2);
      expect(lastDraft().assumptions).toBe("");
    });

    it("shows field errors from the server at the matching row", async () => {
      render(<QuoteEditor theme="dark" onClose={vi.fn()} onSaved={vi.fn()} />);
      await fillClient();
      await userEvent.click(screen.getByRole("button", { name: /extras/i }));
      await userEvent.click(screen.getByRole("button", { name: "Add group" }));
      await userEvent.type(screen.getByLabelText("Group 1 title"), "Accounts");
      await userEvent.type(screen.getByLabelText("When 1 in group 1"), "Week 1");
      const failure = new QuoteApiError("Fix the highlighted fields.", 400, {
        "needs.groups.0.rows.0.item": "Name the item (up to 240 characters).",
      });
      rejectWith = () => Promise.reject(failure);
      await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
      expect(await screen.findByText("Name the item (up to 240 characters).")).toBeInTheDocument();
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
        false,
      );
      await userEvent.type(screen.getByLabelText(/client name/i), "!");
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ clientName: "Kofi!" }),
        true,
        false,
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

      await userEvent.click(within(rail).getByRole("button", { name: /extras/i }));
      expect(screen.getByRole("button", { name: "Add group" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Start from template" })).toBeDisabled();

      await userEvent.click(within(rail).getByRole("button", { name: /terms/i }));
      expect(screen.getByRole("textbox", { name: "Terms" })).toBeDisabled();
      expect(screen.queryByRole("button", { name: /^next/i })).toBeNull();
      expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
    });
  });
});
