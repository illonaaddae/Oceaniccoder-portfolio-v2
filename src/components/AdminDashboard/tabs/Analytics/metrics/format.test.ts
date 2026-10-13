import { describe, it, expect } from "vitest";
import {
  approxTotal,
  compactNumber,
  describeDelta,
  formatApproxGHS,
  formatDay,
  formatDelta,
  formatSpan,
  initials,
  toApproxGHS,
} from "./format";

const RATES = { GHS: 1, USD: 15 };

describe("approximate GHS", () => {
  it("converts a known currency and refuses an unknown one", () => {
    expect(toApproxGHS(10, "USD", RATES)).toBe(150);
    expect(toApproxGHS(10, "GHS", RATES)).toBe(10);
    expect(toApproxGHS(10, "XOF", RATES)).toBeNull();
  });

  it("combines totals and names the currencies it left out", () => {
    expect(
      approxTotal(
        [
          { currency: "GHS", amount: 100 },
          { currency: "USD", amount: 2 },
          { currency: "XOF", amount: 999 },
        ],
        RATES,
      ),
    ).toEqual({ amount: 130, missing: ["XOF"] });
  });

  it("always says approx.", () => {
    expect(formatApproxGHS(1250)).toBe("≈ GHS 1,250.00 approx.");
  });
});

describe("formatDelta and describeDelta", () => {
  it("formats changes, new and nothing", () => {
    expect(formatDelta({ kind: "change", ratio: 0.123 })).toBe("+12%");
    expect(formatDelta({ kind: "change", ratio: -0.05 })).toBe("−5%");
    expect(formatDelta({ kind: "change", ratio: 0.001 })).toBe("0%");
    expect(formatDelta({ kind: "new" })).toBe("New");
    expect(formatDelta({ kind: "none" })).toBe("–");
  });

  it("describes them in words", () => {
    expect(describeDelta({ kind: "change", ratio: 0.5 })).toBe("up 50% on the previous period");
    expect(describeDelta({ kind: "change", ratio: -0.25 })).toBe("down 25% on the previous period");
    expect(describeDelta({ kind: "new" })).toBe("none in the previous period");
    expect(describeDelta({ kind: "none" })).toBe("nothing in either period");
  });
});

describe("formatDay and compactNumber", () => {
  it("formats a day and passes anything else through", () => {
    expect(formatDay("2026-10-03")).toBe("3 Oct 2026");
    expect(formatDay("soon")).toBe("soon");
  });

  it("shortens large numbers", () => {
    expect(compactNumber(950)).toBe("950");
    expect(compactNumber(1200)).toBe("1.2k");
    expect(compactNumber(3000)).toBe("3k");
    expect(compactNumber(3_450_000)).toBe("3.5M");
  });
});

describe("formatSpan and initials", () => {
  it("drops the years when both ends are in the given year", () => {
    expect(formatSpan({ from: "2026-09-14", to: "2026-10-13" }, "2026")).toBe("14 Sep – 13 Oct");
    expect(formatSpan({ from: "2025-10-14", to: "2026-10-13" }, "2026")).toBe(
      "14 Oct 2025 – 13 Oct 2026",
    );
  });

  it("takes up to two initials, from a name or an email", () => {
    expect(initials("Ama Owusu")).toBe("AO");
    expect(initials(" kojo  kwame mensah ")).toBe("KK");
    expect(initials("esi@example.com")).toBe("EE");
    expect(initials("  ")).toBe("?");
  });
});
