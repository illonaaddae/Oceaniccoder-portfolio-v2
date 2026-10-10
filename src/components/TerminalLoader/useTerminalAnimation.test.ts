import { describe, it, expect } from "vitest";
import { isPortfolioPath } from "./useTerminalAnimation";

describe("isPortfolioPath", () => {
  it.each(["/", "/about", "/projects", "/projects/some-case-study", "/blog/a-post", "/contact"])(
    "shows the terminal intro on %s",
    (path) => expect(isPortfolioPath(path)).toBe(true),
  );

  it.each([
    "/q/token",
    "/q/token/invoice/deposit",
    "/q/token/pay/deposit",
    "/q/token/paid",
    "/receipt/REF-1",
    "/pay/INV-1",
    "/booking",
    "/inquiry",
    "/admin/dashboard",
    "/dashboard",
    "/not-a-page",
    "/aboutus",
  ])("never shows it on %s", (path) => expect(isPortfolioPath(path)).toBe(false));
});
