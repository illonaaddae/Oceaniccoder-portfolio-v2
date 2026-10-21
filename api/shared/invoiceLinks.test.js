// @vitest-environment node
import { describe, it, expect } from "vitest";

const L = await import("./invoiceLinks.js");
const { signInvoice } = await import("./tokens.js");

const SECRET = "test-secret";
const BEFORE = L.UNSIGNED_LINKS_ACCEPTED_UNTIL - 1;
const AFTER = L.UNSIGNED_LINKS_ACCEPTED_UNTIL;

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

  it("ends the grace period on 2026-11-21", () => {
    expect(new Date(L.UNSIGNED_LINKS_ACCEPTED_UNTIL).toISOString()).toBe(
      "2026-11-21T00:00:00.000Z",
    );
  });

  it.each([BEFORE, AFTER])("accepts a valid signature at %s", (now) => {
    expect(L.canOpenInvoice("INV-123456", sig, SECRET, now)).toBe(true);
  });

  it.each([BEFORE, AFTER])("refuses a wrong signature or another number at %s", (now) => {
    expect(L.canOpenInvoice("INV-123457", sig, SECRET, now)).toBe(false);
    expect(L.canOpenInvoice("INV-123456", "x".repeat(32), SECRET, now)).toBe(false);
    expect(L.canOpenInvoice("INV-123456", sig, undefined, now)).toBe(false);
  });

  it.each([undefined, null, ""])("accepts a missing signature (%j) only before the cutoff", (s) => {
    expect(L.canOpenInvoice("INV-123456", s, SECRET, BEFORE)).toBe(true);
    expect(L.canOpenInvoice("INV-123456", s, SECRET, AFTER)).toBe(false);
  });
});
