import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FooterBrand from "./FooterBrand";
import Logo from "../Navbar/Logo";

// The 2903px originals (Oceaniccoder-croped.png/.svg) are 476-748 KB; the
// logo is never drawn wider than 168px, so pages use the 336px copies.
const sources = (img) => [
  img.getAttribute("src"),
  ...[...img.closest("picture").querySelectorAll("source")].map((s) => s.getAttribute("srcset")),
];

describe.each(["dark", "light"])("site logo in %s theme", (theme) => {
  it("serves the small WebP/PNG, not the full-size originals, in the footer", () => {
    render(<FooterBrand theme={theme} />);
    const srcs = sources(screen.getByAltText("Oceaniccoder"));
    expect(srcs).toContain("/images/logo/Oceaniccoder-logo.webp");
    expect(srcs.join(" ")).not.toMatch(/Oceaniccoder-croped/);
  });

  it("serves the small WebP/PNG, not the full-size originals, in the header", () => {
    render(
      <MemoryRouter>
        <Logo theme={theme} />
      </MemoryRouter>,
    );
    const srcs = sources(screen.getByAltText("Oceaniccoder"));
    expect(srcs).toContain("/images/logo/Oceaniccoder-logo.webp");
    expect(srcs.join(" ")).not.toMatch(/Oceaniccoder-croped/);
  });
});
