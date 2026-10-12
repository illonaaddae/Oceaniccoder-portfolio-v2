import type React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import QuoteShell from "./QuoteShell";
import { NeedsFromYou, ScopeNotes } from "./ProposalSections";
import type { ClientQuote, NeedsTables } from "@/types/quote";

const wrap = (ui: React.ReactNode) =>
  render(
    <MemoryRouter>
      <HelmetProvider>
        <QuoteShell title="Test">{ui}</QuoteShell>
      </HelmetProvider>
    </MemoryRouter>,
  );

const q = (assumptions: string, exclusions = "") => ({ assumptions, exclusions }) as ClientQuote;

describe("NeedsFromYou", () => {
  it("renders groups, a count chip and the intro line", () => {
    wrap(
      <NeedsFromYou
        quote={q("Logo\nAccess:\n- Email login\n* Domain settings\nContent:\nPhotos and videos")}
      />,
    );
    expect(screen.getByRole("heading", { name: "What I'll need from you" })).toBeInTheDocument();
    expect(screen.getByText("4 items")).toBeInTheDocument();
    expect(screen.getByText(/Send these by email or WhatsApp when you can/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Access" })).toHaveClass("font-semibold");
    expect(screen.getByRole("heading", { name: "Content" })).toBeInTheDocument();
    const lists = screen.getAllByRole("list");
    expect(lists).toHaveLength(3);
    expect(within(lists[0]).getAllByRole("listitem")).toHaveLength(1);
    expect(
      within(lists[1])
        .getAllByRole("listitem")
        .map((l) => l.textContent),
    ).toEqual(["Email login", "Domain settings"]);
  });

  it("uses the singular chip for one item", () => {
    wrap(<NeedsFromYou quote={q("Logo")} />);
    expect(screen.getByText("1 item")).toBeInTheDocument();
  });

  it("puts a trailing note on its own secondary line", () => {
    wrap(
      <NeedsFromYou
        quote={q("Business registration certificate (Registrar General's Department)")}
      />,
    );
    const text = screen.getByText("Business registration certificate");
    const note = screen.getByText("Registrar General's Department");
    expect(text).not.toBe(note);
    expect(text.parentElement).toBe(note.parentElement);
    expect(note).toHaveClass("text-sm");
    expect(note).toHaveStyle({ color: "var(--text-secondary)" });
  });

  it("keeps an item with a mid-line colon as an item", () => {
    wrap(<NeedsFromYou quote={q("Trip details: itinerary, dates, prices")} />);
    expect(screen.getByText("Trip details: itinerary, dates, prices")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull();
  });

  it("is printable: no disclosure and no tinted background", () => {
    const { container } = wrap(<NeedsFromYou quote={q("Logo")} />);
    expect(container.querySelector("details")).toBeNull();
    expect(container.innerHTML).not.toContain("accent-teal-subtle");
  });

  it("renders nothing when empty", () => {
    wrap(<NeedsFromYou quote={q("  \n ")} />);
    expect(screen.queryByText("What I'll need from you")).toBeNull();
  });
});

describe("NeedsFromYou as grouped tables", () => {
  const row = (id: string, item: string, detail = "", when = "") => ({ id, item, detail, when });
  const needs: NeedsTables = {
    intro: "The timeline depends on these items arriving on time.",
    groups: [
      {
        id: "g1",
        title: "Content and media",
        intro: "",
        detailLabel: "Used for",
        rows: [
          row("r1", "Logo", "Website, emails", "Week 1"),
          row("r2", "Photos", "Trip pages", ""),
          row("r3", "   ", "", ""),
        ],
        footnote: "Send originals, not WhatsApp copies.",
      },
      {
        id: "g2",
        title: "Business documents for Paystack",
        intro: "Paystack must verify the business.",
        detailLabel: "Notes",
        rows: [row("r4", "Tax Identification Number (TIN)", "For the business")],
        footnote: "",
      },
      {
        id: "g3",
        title: "Empty group",
        intro: "",
        detailLabel: "Used for",
        rows: [],
        footnote: "",
      },
    ],
  };
  const withNeeds = (n: NeedsTables | null, assumptions = "Legacy item") =>
    ({ assumptions, exclusions: "", extras: { needs: n } }) as ClientQuote;

  it("renders the intro, a heading and a table per group, and counts the rows", () => {
    wrap(<NeedsFromYou quote={withNeeds(needs)} />);
    expect(screen.getByRole("heading", { name: "What I'll need from you" })).toBeInTheDocument();
    expect(screen.getByText("3 items")).toBeInTheDocument();
    expect(screen.getByText(needs.intro)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Content and media" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Empty group" })).toBeNull();
    expect(screen.getAllByRole("table")).toHaveLength(2);
    expect(screen.getByText("Paystack must verify the business.")).toBeInTheDocument();
    expect(screen.queryByText("Legacy item")).toBeNull();
  });

  it("uses the group's second-column label and drops When when no row has one", () => {
    wrap(<NeedsFromYou quote={withNeeds(needs)} />);
    const [content, docs] = screen.getAllByRole("table");
    expect(
      within(content)
        .getAllByRole("columnheader")
        .map((h) => h.textContent),
    ).toEqual(["Item", "Used for", "When"]);
    expect(
      within(docs)
        .getAllByRole("columnheader")
        .map((h) => h.textContent),
    ).toEqual(["Item", "Notes"]);
    // Blank rows never reach the client.
    expect(within(content).getAllByRole("row")).toHaveLength(3);
    expect(within(content).getByText("Week 1")).toHaveClass("rounded-full");
  });

  it("shows the footnote as a soft callout and keeps rows whole when printed", () => {
    wrap(<NeedsFromYou quote={withNeeds(needs)} />);
    const note = screen.getByText("Send originals, not WhatsApp copies.");
    expect(note).toHaveClass("border-l-2");
    expect(note).toHaveStyle({ color: "var(--text-secondary)" });
    for (const r of within(screen.getAllByRole("table")[0]).getAllByRole("row").slice(1))
      expect(r).toHaveClass("break-inside-avoid");
  });

  it("is always open, with no disclosure", () => {
    const { container } = wrap(<NeedsFromYou quote={withNeeds(needs)} />);
    expect(container.querySelector("details")).toBeNull();
  });

  it("uses the singular chip for one row", () => {
    const one: NeedsTables = { intro: "", groups: [needs.groups[1]] };
    wrap(<NeedsFromYou quote={withNeeds(one)} />);
    expect(screen.getByText("1 item")).toBeInTheDocument();
  });

  it("falls back to the old checklist when the tables have no rows", () => {
    const empty: NeedsTables = { intro: "Intro only", groups: [needs.groups[2]] };
    wrap(<NeedsFromYou quote={withNeeds(empty, "Logo\nPhotos")} />);
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText("2 items")).toBeInTheDocument();
    expect(screen.getByText("Photos")).toBeInTheDocument();
  });

  it("falls back to the old checklist on quotes without extras", () => {
    wrap(<NeedsFromYou quote={q("Logo")} />);
    expect(screen.getByText("Logo")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });
});

describe("ScopeNotes without needs", () => {
  it("no longer shows the needs list", () => {
    wrap(<ScopeNotes quote={q("Photos", "Logo design")} />);
    expect(screen.queryByText("Photos")).toBeNull();
    expect(screen.queryByText("What I need from you")).toBeNull();
    expect(screen.getByText("Logo design")).toBeInTheDocument();
  });

  it("is hidden when only assumptions are set", () => {
    wrap(<ScopeNotes quote={q("Photos")} />);
    expect(screen.queryByText("Not included")).toBeNull();
  });
});
