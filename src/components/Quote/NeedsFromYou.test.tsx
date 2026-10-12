import type React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import QuoteShell from "./QuoteShell";
import { NeedsFromYou, ScopeNotes } from "./ProposalSections";
import type { ClientQuote } from "@/types/quote";

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

describe("ScopeNotes without needs", () => {
  it("no longer shows the needs list", () => {
    wrap(<ScopeNotes quote={q("Photos", "Logo design")} />);
    expect(screen.queryByText("Photos")).toBeNull();
    expect(screen.queryByText("What I need from you")).toBeNull();
    expect(screen.getByText("Logo design")).toBeInTheDocument();
  });

  it("is hidden when only assumptions are set", () => {
    wrap(<ScopeNotes quote={q("Photos")} />);
    expect(screen.queryByText("Scope notes")).toBeNull();
  });
});
