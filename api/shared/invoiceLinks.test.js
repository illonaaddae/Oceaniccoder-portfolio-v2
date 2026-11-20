// @vitest-environment node
import { describe, it, expect } from "vitest";

const L = await import("./invoiceLinks.js");
const { signInvoice } = await import("./tokens.js");

const SECRET = "test-secret";

describe("invoicePayPath", () => {
  it("builds a signed pay path with the number encoded", () => {
    expect(L.invoicePayPath("INV-123456", SECRET)).toBe(
      `/pay/INV-123456?s=${signInvoice("INV-123456", SECRET)}`,
    );
    expect(L.invoicePayPath("INV 1/2", SECRET)).toMatch(/^\/pay\/INV%201%2F2\?s=/);
  });

  it("refuses to build a link without a secret", () => {
    expect(() => L.invoicePayPath("INV-123456", undefined)).toThrow(/RECEIPT_SIGNING_SECRET/);
  });
});

describe("canOpenInvoice", () => {
  const sig = signInvoice("INV-123456", SECRET);

  it("accepts a valid signature", () => {
    expect(L.canOpenInvoice("INV-123456", sig, SECRET)).toBe(true);
  });

  it("refuses a wrong signature, another number, or no signing secret", () => {
    expect(L.canOpenInvoice("INV-123457", sig, SECRET)).toBe(false);
    expect(L.canOpenInvoice("INV-123456", "x".repeat(32), SECRET)).toBe(false);
    expect(L.canOpenInvoice("INV-123456", sig, undefined)).toBe(false);
  });

  it.each([undefined, null, ""])("refuses a missing signature (%j)", (s) => {
    expect(L.canOpenInvoice("INV-123456", s, SECRET)).toBe(false);
  });
});
