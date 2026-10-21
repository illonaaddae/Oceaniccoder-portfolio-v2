// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";

const { renderInvoiceEmail } = await import("./index.js");
const { verifyInvoice } = await import("../shared/tokens.js");

const SECRET = "test-signing-secret";

const NOW = new Date("2026-10-10T12:00:00.000Z");
const base = {
  invoiceNumber: "INV-2026-0042",
  clientName: "Kofi Mensah",
  clientEmail: "kofi@example.com",
  clientPhone: "+233200000000",
  items: [
    { description: "Store build", quantity: 2, unitPrice: 1500 },
    { description: "Hosting setup", quantity: 1, unitPrice: 250.5 },
  ],
  currency: "GHS",
  currencySymbol: "GH₵",
  subtotal: 3250.5,
  tax: 162.53,
  taxRate: 5,
  total: 3413.03,
  dueDate: "2026-10-24T12:00:00.000Z",
  estimatedDelivery: "2026-11-15T12:00:00.000Z",
  notes: "Deposit covers design.\nBalance on launch.",
};

describe("renderInvoiceEmail", () => {
  beforeEach(() => {
    process.env.RECEIPT_SIGNING_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.RECEIPT_SIGNING_SECRET;
  });

  it("derives subtotal and total from the items when they are missing", () => {
    const { subtotal: _s, tax: _t, total: _total, ...rest } = base;
    const html = renderInvoiceEmail({ ...rest, taxRate: 0 }, NOW);
    expect(html).not.toContain("NaN");
    expect(html).toContain("GH₵3250.50");
  });

  it("uses the branded kit shell with the invoice number in the letterhead", () => {
    const html = renderInvoiceEmail(base, NOW);
    expect(html).toContain("Ysabeau Office");
    expect(html).toContain("Oceaniccoder-logo@3x.png");
    expect(html).toContain("INV-2026-0042");
    expect(html).not.toContain("#0a0f1a;padding:40px");
  });

  it("shows the amount due, dates, parties, line items and totals", () => {
    const html = renderInvoiceEmail(base, NOW);
    expect(html).toContain("GH₵3413.03 GHS");
    expect(html).toContain("10 October 2026");
    expect(html).toContain("24 October 2026");
    expect(html).toContain("15 November 2026");
    expect(html).toContain("Illona Addae");
    expect(html).toContain("Kofi Mensah");
    expect(html).toContain("kofi@example.com");
    expect(html).toContain("+233200000000");
    expect(html).toContain("Store build");
    expect(html).toContain("GH₵1500.00");
    expect(html).toContain("GH₵3000.00");
    expect(html).toContain("GH₵250.50");
    expect(html).toContain("GH₵3250.50");
    expect(html).toContain("Tax (5%)");
    expect(html).toContain("GH₵162.53");
    expect(html).toContain("Deposit covers design.<br>Balance on launch.");
  });

  it("links to the signed pay page and the reply address", () => {
    const html = renderInvoiceEmail(base, NOW);
    const sig = html.match(/href="https:\/\/oceaniccoder\.dev\/pay\/INV-2026-0042\?s=([^"]+)"/);
    expect(sig).not.toBeNull();
    expect(verifyInvoice("INV-2026-0042", sig[1], SECRET)).toBe(true);
    expect(html).not.toContain('href="https://oceaniccoder.dev/pay/INV-2026-0042"');
    expect(html).toContain('href="mailto:hello@oceaniccoder.dev"');
  });

  it("refuses to build the email without a signing secret", () => {
    delete process.env.RECEIPT_SIGNING_SECRET;
    expect(() => renderInvoiceEmail(base, NOW)).toThrow(/RECEIPT_SIGNING_SECRET/);
  });

  it("leaves out optional parts that were not given", () => {
    const html = renderInvoiceEmail(
      {
        ...base,
        clientPhone: undefined,
        taxRate: 0,
        dueDate: undefined,
        estimatedDelivery: undefined,
        notes: "",
      },
      NOW,
    );
    expect(html).not.toContain("Tax (");
    expect(html).not.toContain("Payment due");
    expect(html).not.toContain("Estimated delivery");
    expect(html).not.toContain(">Notes<");
    expect(html).not.toContain("+233");
  });

  it("falls back to the currency code when there is no symbol", () => {
    const html = renderInvoiceEmail({ ...base, currencySymbol: undefined }, NOW);
    expect(html).toContain("GHS3413.03 GHS");
  });

  it("escapes client-supplied text, including notes", () => {
    const html = renderInvoiceEmail(
      {
        ...base,
        clientName: "<b>Kofi</b>",
        notes: "<script>alert(1)</script>",
        items: [{ description: "<img src=x>", quantity: "1<i>", unitPrice: 10 }],
        invoiceNumber: 'INV"/><x',
      },
      NOW,
    );
    expect(html).not.toContain("<b>Kofi</b>");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x>");
    expect(html).not.toContain("1<i>");
    expect(html).not.toContain('INV"/><x');
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("https://oceaniccoder.dev/pay/INV%22%2F%3E%3Cx");
  });
});
