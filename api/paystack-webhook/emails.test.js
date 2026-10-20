// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const emails = require("./emails.js");

describe("paystack-webhook invoice emails", () => {
  it("brands every email with the shared kit", () => {
    const html = emails.clientReceiptEmail({
      clientName: "Ama",
      invoiceNumber: "INV-1",
      amount: "₵100.00 GHS",
    });
    expect(html).toContain("Ysabeau Office");
    expect(html).toContain("Oceaniccoder-logo@3x.png");
  });

  it("tells the client which invoice was paid and how much", () => {
    const html = emails.clientReceiptEmail({
      clientName: "Ama",
      invoiceNumber: "INV-123456",
      amount: "₵250.00 GHS",
    });
    expect(html).toContain("Hi Ama");
    expect(html).toContain("INV-123456");
    expect(html).toContain("₵250.00 GHS");
    expect(html).toContain("Illona @ OceanicCoder");
  });

  it("escapes values that come from the payload or the client record", () => {
    const html = emails.adminPaymentEmail({
      invoiceNumber: "<img src=x>",
      clientName: "<script>x</script>",
      amount: "₵1.00 GHS",
      reference: 'ref"><b>',
      settles: true,
      problem: null,
    });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("shows the settlement problem to the admin", () => {
    const html = emails.adminPaymentEmail({
      invoiceNumber: "INV-9",
      clientName: "Kofi",
      amount: "₵10.00 GHS",
      reference: "OC-INV-9-1",
      settles: false,
      problem: { tone: "danger", text: "Underpaid by ₵90.00. Expected ₵100.00." },
    });
    expect(html).toContain("Payment problem");
    expect(html).toContain("Underpaid by ₵90.00");
    expect(html).toContain("OC-INV-9-1");
  });

  it("reports why a webhook was not processed", () => {
    const html = emails.webhookFailedEmail("signature verification failed", "<detail>");
    expect(html).toContain("Reason: signature verification failed");
    expect(html).toContain("Detail: &lt;detail&gt;");
    expect(emails.webhookFailedEmail("no key")).not.toContain("Detail:");
  });

  it("points the admin at the backfill script when the record fails", () => {
    const html = emails.recordFailedEmail({
      invoiceNumber: "INV-7",
      error: "timeout",
      amount: "₵5.00 GHS",
      reference: "n/a",
    });
    expect(html).toContain("Error: timeout");
    expect(html).toContain("scripts/backfill-payments.mjs");
    expect(html).toContain("₵5.00 GHS");
  });
});
