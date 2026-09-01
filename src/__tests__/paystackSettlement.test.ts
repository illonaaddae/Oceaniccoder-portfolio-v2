import { describe, expect, it } from "vitest";
// Lives under src/ because vitest only collects tests from there; the module
// under test is the Azure Function helper, which is CommonJS.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { evaluateSettlement } = require("../../api/paystack-webhook/settlement");

const inv = (total: number, currency = "GHS") => ({ total, currency });

describe("evaluateSettlement", () => {
  it("settles an exact payment", () => {
    const r = evaluateSettlement({ amountPaid: 2500, currency: "GHS", invoice: inv(2500) });
    expect(r.settles).toBe(true);
    expect(r.underpaid).toBe(false);
  });

  it("refuses to settle an underpayment", () => {
    // The exploit this guards: the charge amount is set in the browser, so a
    // 1-unit payment used to close an invoice of any size.
    const r = evaluateSettlement({ amountPaid: 1, currency: "GHS", invoice: inv(10000) });
    expect(r.settles).toBe(false);
    expect(r.underpaid).toBe(true);
    expect(r.shortfall).toBe(9999);
  });

  it("refuses a payment that is a hair short", () => {
    const r = evaluateSettlement({ amountPaid: 2499.5, currency: "GHS", invoice: inv(2500) });
    expect(r.settles).toBe(false);
  });

  it("absorbs sub-cent rounding rather than blocking on it", () => {
    const r = evaluateSettlement({ amountPaid: 2499.995, currency: "GHS", invoice: inv(2500) });
    expect(r.settles).toBe(true);
    expect(r.underpaid).toBe(false);
  });

  it("settles an overpayment but flags the surplus", () => {
    const r = evaluateSettlement({ amountPaid: 2600, currency: "GHS", invoice: inv(2500) });
    expect(r.settles).toBe(true);
    expect(r.overpaid).toBe(true);
    expect(r.surplus).toBe(100);
  });

  it("refuses a payment made in the wrong currency", () => {
    // 100 USD is not 100 GHS; matching on the number alone would close the
    // invoice for a fraction of its value.
    const r = evaluateSettlement({ amountPaid: 2500, currency: "USD", invoice: inv(2500, "GHS") });
    expect(r.settles).toBe(false);
    expect(r.currencyMismatch).toBe(true);
  });

  it("does not invent a mismatch when the invoice has no currency", () => {
    const r = evaluateSettlement({
      amountPaid: 2500,
      currency: "GHS",
      invoice: { total: 2500 },
    });
    expect(r.currencyMismatch).toBe(false);
    expect(r.settles).toBe(true);
  });

  it("records the payment when the invoice total is unusable", () => {
    // Nothing to verify against, so it must not block the money — but it is
    // reported as unverified rather than silently trusted.
    for (const total of [0, NaN, undefined, null, "abc"]) {
      const r = evaluateSettlement({
        amountPaid: 2500,
        currency: "GHS",
        invoice: { total, currency: "GHS" },
      });
      expect(r.knownTotal).toBe(false);
      expect(r.settles).toBe(true);
      expect(r.expected).toBeNull();
    }
  });

  it("treats a missing amount as zero paid, not as settlement", () => {
    const r = evaluateSettlement({ amountPaid: undefined, currency: "GHS", invoice: inv(2500) });
    expect(r.settles).toBe(false);
    expect(r.shortfall).toBe(2500);
  });

  it("compares currency case-insensitively", () => {
    const r = evaluateSettlement({ amountPaid: 2500, currency: "ghs", invoice: inv(2500, "GHS") });
    expect(r.currencyMismatch).toBe(false);
  });
});
