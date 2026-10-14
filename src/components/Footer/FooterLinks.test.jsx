import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FooterLinks from "./FooterLinks";
import SocialLinks from "./SocialLinks";

// The page's sections use h2 for titles, so footer column titles at h4 skipped
// a level (Lighthouse "heading-order").
describe("footer column headings", () => {
  it.each([
    ["Quick Links", FooterLinks],
    ["Connect", SocialLinks],
  ])("%s is an h3", (name, Column) => {
    render(
      <MemoryRouter>
        <Column />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name, level: 3 })).toBeInTheDocument();
  });

  // White 12px bold text on oceanic-500 was 4.34:1; oceanic-600 is 5.9:1.
  it("puts the ambassador discount label on oceanic-600", () => {
    render(
      <MemoryRouter>
        <SocialLinks />
      </MemoryRouter>,
    );
    expect(screen.getByText("20% OFF")).toHaveClass("bg-oceanic-600", "text-white");
  });
});
