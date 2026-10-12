import type React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import QuoteShell from "./QuoteShell";
import { ScopeNotes } from "./ProposalSections";
import type { ClientQuote } from "@/types/quote";

const wrap = (ui: React.ReactNode) =>
  render(
    <MemoryRouter>
      <HelmetProvider>
        <QuoteShell title="Test">{ui}</QuoteShell>
      </HelmetProvider>
    </MemoryRouter>,
  );

describe("QuoteShell", () => {
  it("scales the root font while mounted and restores it after", () => {
    document.documentElement.style.fontSize = "";
    const { unmount } = wrap(<p>hi</p>);
    expect(document.documentElement.style.fontSize).toBe("106.25%");
    unmount();
    expect(document.documentElement.style.fontSize).toBe("");
  });

  it("opens collapsed details for print and closes only those afterwards", () => {
    const { container } = wrap(
      <>
        <details>
          <summary>closed</summary>x
        </details>
        <details open>
          <summary>open</summary>y
        </details>
      </>,
    );
    const [a, b] = Array.from(container.querySelectorAll("details"));
    fireEvent(window, new Event("beforeprint"));
    expect(a.open).toBe(true);
    expect(b.open).toBe(true);
    fireEvent(window, new Event("afterprint"));
    expect(a.open).toBe(false);
    expect(b.open).toBe(true);
  });

  it("renders scope notes as tight bullet lists", () => {
    const quote = { exclusions: "Logo design\n-Copywriting", assumptions: "Photos" } as ClientQuote;
    wrap(<ScopeNotes quote={quote} />);
    expect(screen.getAllByRole("listitem").map((l) => l.textContent)).toEqual([
      "Logo design",
      "Copywriting",
    ]);
    expect(screen.getByText("Not included")).toHaveClass("font-semibold");
  });
});
