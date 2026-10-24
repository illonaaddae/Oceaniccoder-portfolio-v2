// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

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
    expect(html).toContain("GHS 3,250.50");
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
    expect(html).toContain("GHS 3,413.03");
    expect(html).toContain("10 October 2026");
    expect(html).toContain("24 October 2026");
    expect(html).toContain("15 November 2026");
    expect(html).toContain("Illona Addae");
    expect(html).toContain("Kofi Mensah");
    expect(html).toContain("kofi@example.com");
    expect(html).toContain("+233200000000");
    expect(html).toContain("Store build");
    expect(html).toContain("GHS 1,500.00");
    expect(html).toContain("GHS 3,000.00");
    expect(html).toContain("GHS 250.50");
    expect(html).toContain("GHS 3,250.50");
    expect(html).toContain("Tax (5%)");
    expect(html).toContain("GHS 162.53");
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

  it("groups thousands and names the currency once", () => {
    const html = renderInvoiceEmail(base, NOW);
    expect(html).not.toContain("₵");
    expect(html).not.toMatch(/\d GHS/);
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

describe("send-invoice handler configuration", () => {
  // index.js reads requireAdmin when it loads, so stub it and load a fresh copy.
  function loadHandler() {
    const adminAuth = require("../shared/adminAuth.js");
    const real = adminAuth.requireAdmin;
    adminAuth.requireAdmin = async () => ({ user: { $id: "admin" } });
    delete require.cache[require.resolve("./index.js")];
    const handler = require("./index.js");
    adminAuth.requireAdmin = real;
    return handler;
  }

  const send = async (handler) => {
    const context = { res: null, log: Object.assign(() => {}, { error: () => {} }) };
    await handler(context, { method: "POST", headers: {}, body: base });
    return { status: context.res.status, body: JSON.parse(context.res.body) };
  };

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RECEIPT_SIGNING_SECRET;
  });

  it("names the missing signing secret instead of a generic error", async () => {
    process.env.RESEND_API_KEY = "re_test";
    expect(await send(loadHandler())).toEqual({
      status: 503,
      body: { error: "Invoice pay links need RECEIPT_SIGNING_SECRET to be set." },
    });
  });

  it("still answers Not configured when the Resend key is missing", async () => {
    process.env.RECEIPT_SIGNING_SECRET = SECRET;
    expect(await send(loadHandler())).toEqual({ status: 503, body: { error: "Not configured" } });
  });
});
