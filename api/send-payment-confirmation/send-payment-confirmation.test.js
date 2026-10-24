// @vitest-environment node
import { describe, it, expect } from "vitest";

const { renderPaymentConfirmation } = await import("./index.js");

const base = {
  invoiceNumber: "INV-2026-0042",
  clientName: "Kofi Mensah",
  total: 3413.03,
  currency: "GHS",
  paidDate: "10 October 2026",
};

describe("renderPaymentConfirmation", () => {
  it("uses the branded kit shell with a receipt reference", () => {
    const html = renderPaymentConfirmation(base);
    expect(html).toContain("Ysabeau Office");
    expect(html).toContain("Oceaniccoder-logo@3x.png");
    expect(html).toContain("Receipt");
    expect(html).toContain("INV-2026-0042");
  });

  it("shows the client, amount, date and paid status", () => {
    const html = renderPaymentConfirmation(base);
    expect(html).toContain("Thank you, Kofi Mensah");
    expect(html).toContain("GHS 3,413.03");
    expect(html).toContain("10 October 2026");
    expect(html).toContain("Paid</span>");
    expect(html).toContain("hello@oceaniccoder.dev");
  });

  it("groups thousands and names the currency once", () => {
    const html = renderPaymentConfirmation(base);
    expect(html).not.toContain("₵");
    expect(html).not.toMatch(/\d GHS/);
  });

  it("escapes client-supplied text", () => {
    const html = renderPaymentConfirmation({
      ...base,
      clientName: "<b>Kofi</b>",
      invoiceNumber: "<i>INV</i>",
    });
    expect(html).not.toContain("<b>Kofi</b>");
    expect(html).not.toContain("<i>INV</i>");
    expect(html).toContain("&lt;b&gt;Kofi&lt;/b&gt;");
  });
});
