import type React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const quoteAdmin = vi.fn();
vi.mock("@/services/api/quotes", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/api/quotes")>("@/services/api/quotes");
  return { ...actual, quoteAdmin: (...a: unknown[]) => quoteAdmin(...a) };
});

import QuoteEditor from "./QuoteEditor";
import type { QuoteDraft } from "@/types/quote";

const initial: Partial<QuoteDraft> = {
  clientName: "Kofi",
  clientEmail: "kofi@example.com",
  title: "Store",
  items: [{ id: "item-a", description: "Build", qty: 1, unitMinor: 100000 }],
};

beforeEach(() => {
  quoteAdmin.mockReset();
  quoteAdmin.mockResolvedValue({ quote: { id: "q1", status: "draft" }, stages: [], payments: [] });
});

async function openExtras(props: Partial<React.ComponentProps<typeof QuoteEditor>> = {}) {
  render(
    <QuoteEditor theme="dark" initial={initial} onClose={vi.fn()} onSaved={vi.fn()} {...props} />,
  );
  const rail = screen.getByRole("navigation", { name: /quote steps/i });
  await userEvent.click(within(rail).getByRole("button", { name: /extras/i }));
  return screen.getByTestId("maintenance-editor");
}

const lastDraft = (): QuoteDraft =>
  quoteAdmin.mock.calls[quoteAdmin.mock.calls.length - 1][1].draft;

describe("MaintenanceEditor", () => {
  it("is off by default and saves no maintenance section", async () => {
    const box = await openExtras();
    const toggle = within(box).getByRole("switch", { name: /include in this quote/i });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(within(box).queryByLabelText(/free period \(days\)/i)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
    expect(lastDraft().extras.maintenance ?? null).toBeNull();
  });

  it("switches on with 30 free days and the standard text, then fills the standard plans", async () => {
    const box = await openExtras();
    await userEvent.click(within(box).getByRole("switch", { name: /include in this quote/i }));
    expect(within(box).getByLabelText(/free period \(days\)/i)).toHaveValue(30);
    expect(within(box).getByLabelText(/free period text/i)).toHaveValue(
      "Any defect found is fixed at no cost.",
    );
    await userEvent.click(within(box).getByRole("button", { name: /use my standard plans/i }));
    expect(within(box).getByLabelText("Name for plan 1")).toHaveValue("Care");
    expect(within(box).getByLabelText("Name for plan 2")).toHaveValue("Care Plus");
    expect(within(box).getByLabelText("Price for plan 1")).toHaveValue("400.00");
    expect(within(box).getByLabelText("Price for plan 2")).toHaveValue("900.00");
    await userEvent.type(within(box).getByLabelText(/note/i), "Plans are optional.");
    await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
    const m = lastDraft().extras.maintenance;
    expect(m).toMatchObject({
      freeDays: 30,
      freeText: "Any defect found is fixed at no cost.",
      note: "Plans are optional.",
    });
    expect(m?.plans.map((p) => [p.name, p.priceMinor, p.period])).toEqual([
      ["Care", 40000, "month"],
      ["Care Plus", 90000, "month"],
    ]);
    expect(m?.plans[0].includes).toContain("Uptime monitoring");
  });

  it("adds, moves and removes plans, and picks the period", async () => {
    const box = await openExtras();
    await userEvent.click(within(box).getByRole("switch", { name: /include in this quote/i }));
    await userEvent.click(within(box).getByRole("button", { name: /add plan/i }));
    await userEvent.type(within(box).getByLabelText("Name for plan 1"), "Basic");
    await userEvent.click(within(box).getByRole("button", { name: /add plan/i }));
    await userEvent.type(within(box).getByLabelText("Name for plan 2"), "Pro");
    await userEvent.click(within(box).getByRole("combobox", { name: "Period for plan 2" }));
    await userEvent.click(screen.getByRole("option", { name: "per year" }));
    await userEvent.click(within(box).getByRole("button", { name: "Move plan 2 up" }));
    expect(within(box).getByLabelText("Name for plan 1")).toHaveValue("Pro");
    await userEvent.click(within(box).getByRole("button", { name: "Remove plan 2" }));
    expect(within(box).queryByLabelText("Name for plan 2")).toBeNull();
    await userEvent.type(within(box).getByLabelText("Price for plan 1"), "1,200");
    await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
    expect(lastDraft().extras.maintenance?.plans).toEqual([
      expect.objectContaining({ name: "Pro", period: "year", priceMinor: 120000 }),
    ]);
  });

  it("blocks saving while a plan price is not a valid amount", async () => {
    const box = await openExtras();
    await userEvent.click(within(box).getByRole("switch", { name: /include in this quote/i }));
    await userEvent.click(within(box).getByRole("button", { name: /add plan/i }));
    await userEvent.type(within(box).getByLabelText("Price for plan 1"), "four hundred");
    expect(within(box).getByText(/enter a valid amount/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save draft/i })).toBeDisabled();
    await userEvent.clear(within(box).getByLabelText("Price for plan 1"));
    await userEvent.type(within(box).getByLabelText("Price for plan 1"), "400");
    expect(screen.getByRole("button", { name: /save draft/i })).toBeEnabled();
  });

  it("unblocks saving when the section with a bad price is switched off", async () => {
    const box = await openExtras();
    await userEvent.click(within(box).getByRole("switch", { name: /include in this quote/i }));
    await userEvent.click(within(box).getByRole("button", { name: /add plan/i }));
    await userEvent.type(within(box).getByLabelText("Price for plan 1"), "abc");
    expect(screen.getByRole("button", { name: /save draft/i })).toBeDisabled();
    await userEvent.click(within(box).getByRole("switch", { name: /include in this quote/i }));
    expect(screen.getByRole("button", { name: /save draft/i })).toBeEnabled();
  });

  it("shows server errors against the plan field", async () => {
    const { QuoteApiError } = await import("@/services/api/quotes");
    quoteAdmin.mockRejectedValueOnce(
      new QuoteApiError("Fix the highlighted fields.", 400, {
        "maintenance.plans.0.priceMinor": "Enter a price above zero.",
      }),
    );
    const box = await openExtras();
    await userEvent.click(within(box).getByRole("switch", { name: /include in this quote/i }));
    await userEvent.click(within(box).getByRole("button", { name: /add plan/i }));
    await userEvent.type(within(box).getByLabelText("Name for plan 1"), "Care");
    await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
    expect(await screen.findByText("Enter a price above zero.")).toBeInTheDocument();
  });

  it("is disabled in read-only mode", async () => {
    const box = await openExtras({
      readOnly: true,
      embedded: true,
      quoteId: "q1",
      initial: {
        ...initial,
        extras: {
          needs: null,
          maintenance: {
            freeDays: 30,
            freeText: "Free fixes.",
            plans: [{ id: "care", name: "Care", priceMinor: 40000, period: "month", includes: "" }],
            note: "",
          },
        },
      },
    });
    expect(within(box).getByRole("switch", { name: /include in this quote/i })).toBeDisabled();
    expect(within(box).getByLabelText("Name for plan 1")).toBeDisabled();
    expect(within(box).getByLabelText("Name for plan 1")).toHaveValue("Care");
    expect(within(box).getByRole("button", { name: /use my standard plans/i })).toBeDisabled();
  });
});
