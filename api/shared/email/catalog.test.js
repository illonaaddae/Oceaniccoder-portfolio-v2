// @vitest-environment node
import { describe, it, expect } from "vitest";

const { CATALOG, findEmail } = await import("./catalog.js");
const { verifyInvoice } = await import("../tokens.js");

describe("email catalog", () => {
  it("lists every email once, each with a group, name and trigger", () => {
    const ids = CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of CATALOG) {
      expect(["clients", "admin"]).toContain(e.group);
      expect(e.name).toBeTruthy();
      expect(e.when).toBeTruthy();
    }
  });

  it("covers the quote, booking, invoice, inquiry, message and newsletter emails", () => {
    const ids = CATALOG.map((e) => e.id);
    for (const id of [
      "quoteSent",
      "quoteAccepted",
      "quoteDecisionAlert",
      "quoteDeclinedAlert",
      "paymentRequest",
      "paymentReceipt",
      "paymentAlert",
      "paymentAlertProblem",
      "maintenanceOffer",
      "accessCode",
      "accessLockedAlert",
      "invoiceAccessCode",
      "receiptAccessCode",
      "invoiceAccessLockedAlert",
      "invoiceAccessLinkBlockedAlert",
      "bookingConfirmation",
      "bookingHostNotice",
      "bookingHostNoLink",
      "invoiceSent",
      "invoicePaidConfirmation",
      "invoicePaidReceipt",
      "invoicePaidAlert",
      "webhookFailed",
      "webhookSignature",
      "webhookRetry",
      "webhookUntracked",
      "webhookEscalation",
      "webhookRecordedRetry",
      "webhookRecordedConflict",
      "webhookInvalidSetting",
      "inquiryReceivedAlert",
      "messageReceivedAlert",
      "inquiryReviewed",
      "inquiryQuoted",
      "inquiryWon",
      "inquiryDeclined",
      "messageReply",
      "newsletterWelcome",
      "newsletterIssue",
    ]) {
      expect(ids).toContain(id);
    }
  });

  it.each(CATALOG.map((e) => [e.id, e]))("%s renders a subject, html and text", (_id, e) => {
    const mail = e.render();
    expect(mail.subject).toBeTruthy();
    expect(mail.html).toContain("OceanicCoder");
    expect(mail.text).toBeTruthy();
    for (const bad of ["NaN", "undefined", "[object Object]"]) {
      expect(mail.html).not.toContain(bad);
      expect(mail.subject).not.toContain(bad);
    }
  });

  it("previews the invoice email with a pay link the real secret does not sign", () => {
    process.env.RECEIPT_SIGNING_SECRET = "real-secret";
    try {
      const { html } = findEmail("invoiceSent").render();
      const sig = html.match(/\/pay\/INV-2026-0042\?s=([A-Za-z0-9_-]{32})#k=([^"]+)"/);
      expect(sig).not.toBeNull();
      expect(verifyInvoice("INV-2026-0042", sig[1], "real-secret")).toBe(false);
      // Shows the link-code line, with a code that has no link code's shape.
      expect(sig[2]).not.toMatch(/^[\w-]{22}\.[0-9a-z]{1,12}\.[\w-]{43}$/);
      expect(html).toContain("This link usually opens straight away.");
    } finally {
      delete process.env.RECEIPT_SIGNING_SECRET;
    }
  });

  it("uses no grey rounded card anywhere and shows no currency symbol", () => {
    for (const e of CATALOG) {
      const { html, text } = e.render();
      expect(html, e.id).not.toMatch(
        /background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px/,
      );
      expect(html + text, e.id).not.toContain("₵");
    }
  });

  it("stamps receipts Paid and payment requests Due", () => {
    const stamp = (id) => findEmail(id).render().html;
    for (const id of ["invoicePaidConfirmation", "invoicePaidReceipt", "paymentReceipt"]) {
      expect(stamp(id), id).toContain('stamp-paid@3x.png" width="65" height="26" alt="Paid"');
    }
    for (const id of ["invoiceSent", "paymentRequest"]) {
      expect(stamp(id), id).toContain('stamp-due@3x.png" width="47" height="26" alt="Due"');
    }
  });

  it("finds an email by id", () => {
    expect(findEmail("quoteSent").name).toBeTruthy();
    expect(findEmail("nope")).toBeNull();
    expect(findEmail("__proto__")).toBeNull();
  });
});
