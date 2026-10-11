// @vitest-environment node
import { describe, it, expect } from "vitest";

const { CATALOG, findEmail } = await import("./catalog.js");

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
      "bookingConfirmation",
      "bookingHostNotice",
      "bookingHostNoLink",
      "invoiceSent",
      "invoicePaidConfirmation",
      "invoicePaidReceipt",
      "invoicePaidAlert",
      "invoiceRecordFailed",
      "webhookFailed",
      "inquiryReceivedAlert",
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

  it("finds an email by id", () => {
    expect(findEmail("quoteSent").name).toBeTruthy();
    expect(findEmail("nope")).toBeNull();
    expect(findEmail("__proto__")).toBeNull();
  });
});
