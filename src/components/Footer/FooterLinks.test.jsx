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
});
