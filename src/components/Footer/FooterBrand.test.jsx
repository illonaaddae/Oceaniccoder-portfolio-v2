import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FooterBrand from "./FooterBrand";

// The ~2900px originals (Oceaniccoder-croped.png/.svg) are 476-748 KB; the
// footer draws the logo at 168px, so it uses the 336px copies.
describe.each(["dark", "light"])("footer logo in %s theme", (theme) => {
  it("serves the small WebP/PNG, not the full-size originals", () => {
    render(<FooterBrand theme={theme} />);
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
