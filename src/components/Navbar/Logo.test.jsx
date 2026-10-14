import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Logo from "./Logo";

// Dark mode used to load the 748 KB Oceaniccoder-croped.svg; the header draws
// the logo at 112px, so both themes use the 336px copies.
describe.each(["dark", "light"])("header logo in %s theme", (theme) => {
  it("serves the small WebP/PNG, not the full-size originals", () => {
    render(
      <MemoryRouter>
        <Logo theme={theme} />
      </MemoryRouter>,
    );
    const img = screen.getByAltText("Oceaniccoder");
    const srcs = [
      img.getAttribute("src"),
      ...[...img.closest("picture").querySelectorAll("source")].map((s) =>
        s.getAttribute("srcset"),
      ),
    ];
    expect(srcs).toContain("/images/logo/Oceaniccoder-logo.webp");
    expect(srcs.join(" ")).not.toMatch(/Oceaniccoder-croped/);
  });
});
