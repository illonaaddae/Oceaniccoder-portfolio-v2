import { describe, it, expect } from "vitest";
import { formatCount, pluralize } from "./formatCount";

describe("formatCount", () => {
  it("leaves counts under a thousand alone", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(942)).toBe("942");
  });

  it("abbreviates thousands to one decimal", () => {
    expect(formatCount(1200)).toBe("1.2k");
    expect(formatCount(9999)).toBe("9.9k");
  });

  it("drops the decimal on whole thousands", () => {
    expect(formatCount(2000)).toBe("2k");
    expect(formatCount(12_000)).toBe("12k");
  });

  it("abbreviates millions", () => {
    expect(formatCount(1_500_000)).toBe("1.5m");
  });

  it("never renders a negative count", () => {
    expect(formatCount(-5)).toBe("0");
  });
});

describe("pluralize", () => {
  it("uses the singular for exactly one", () => {
    expect(pluralize(1, "reader")).toBe("reader");
  });

  it("uses the plural for everything else", () => {
    expect(pluralize(0, "reader")).toBe("readers");
    expect(pluralize(142, "reader")).toBe("readers");
  });
});
