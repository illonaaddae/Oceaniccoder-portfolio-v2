import type React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import QuoteShell from "./QuoteShell";
import { Maintenance, maintenanceIntro } from "./ProposalSections";
import type { ClientQuote, MaintenancePlan, MaintenanceSection } from "@/types/quote";

const wrap = (ui: React.ReactNode) =>
  render(
    <MemoryRouter>
      <HelmetProvider>
        <QuoteShell title="Test">{ui}</QuoteShell>
      </HelmetProvider>
    </MemoryRouter>,
  );

const plan = (over: Partial<MaintenancePlan> = {}): MaintenancePlan => ({
  id: "care",
  name: "Care",
  priceMinor: 40000,
  period: "month",
  includes: "Security and dependency updates\nUptime monitoring",
  ...over,
});

const section = (over: Partial<MaintenanceSection> = {}): MaintenanceSection => ({
  freeDays: 30,
  freeText: "Any defect found is fixed at no cost.",
  plans: [
    plan(),
    plan({ id: "plus", name: "Care Plus", priceMinor: 90000, includes: "- Everything in Care" }),
  ],
  note: "",
  ...over,
});

const q = (maintenance: MaintenanceSection | null | undefined) =>
  ({ currency: "GHS", extras: { needs: null, maintenance } }) as ClientQuote;

describe("Maintenance", () => {
  it("opens with the free period and the monthly plan sentence", () => {
    wrap(<Maintenance quote={q(section())} />);
    expect(screen.getByRole("heading", { name: "Maintenance and support" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "The first 30 days after launch are included free: any defect found is fixed at no cost. After that, a monthly plan keeps the platform safe and up to date.",
      ),
    ).toBeInTheDocument();
  });

  it("shows each plan as a card with its price per period and its includes as bullets", () => {
    wrap(<Maintenance quote={q(section())} />);
    const care = screen.getByRole("heading", { name: "Care" }).closest("li") as HTMLElement;
    expect(within(care).getByText("GHS 400.00")).toHaveClass("font-bold", "tabular-nums");
    expect(within(care).getByText("/ month")).toBeInTheDocument();
    expect(
      within(care)
        .getAllByRole("listitem")
        .map((l) => l.textContent),
    ).toEqual(["Security and dependency updates", "Uptime monitoring"]);
    const plus = screen.getByRole("heading", { name: "Care Plus" }).closest("li") as HTMLElement;
    expect(within(plus).getByText("GHS 900.00")).toBeInTheDocument();
    expect(within(plus).getByText("Everything in Care")).toBeInTheDocument();
  });

  it("states the plans are optional and outside the total", () => {
    wrap(<Maintenance quote={q(section({ note: "You can stop at any time." }))} />);
    expect(
      screen.getByText(
        "Optional, and not part of the total above. You can start a plan after launch.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("You can stop at any time.")).toBeInTheDocument();
  });

  it("is hidden when unset", () => {
    const { container } = wrap(
      <>
        <Maintenance quote={q(null)} />
        <Maintenance quote={q(undefined)} />
        <Maintenance quote={{ currency: "GHS" } as ClientQuote} />
        <Maintenance quote={q(section({ freeDays: 0, plans: [] }))} />
      </>,
    );
    expect(screen.queryByText("Maintenance and support")).toBeNull();
    expect(container.querySelectorAll("li")).toHaveLength(0);
  });

  it("shows only the free period when there are no plans", () => {
    wrap(<Maintenance quote={q(section({ plans: [] }))} />);
    expect(
      screen.getByText(
        "The first 30 days after launch are included free: any defect found is fixed at no cost.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Optional, and not part of the total/)).toBeNull();
  });
});

describe("maintenanceIntro", () => {
  it("words yearly, mixed, single-day and no-free-period cases", () => {
    expect(maintenanceIntro(section({ plans: [plan({ period: "year" })] }))).toContain(
      "After that, a yearly plan keeps",
    );
    expect(
      maintenanceIntro(section({ plans: [plan(), plan({ id: "y", period: "year" })] })),
    ).toContain("After that, a plan keeps");
    expect(maintenanceIntro(section({ freeDays: 1, plans: [] }))).toBe(
      "The first day after launch is included free: any defect found is fixed at no cost.",
    );
    expect(maintenanceIntro(section({ freeDays: 0 }))).toBe(
      "A monthly plan keeps the platform safe and up to date.",
    );
    expect(maintenanceIntro(section({ freeText: "", plans: [] }))).toBe(
      "The first 30 days after launch are included free.",
    );
  });
});
