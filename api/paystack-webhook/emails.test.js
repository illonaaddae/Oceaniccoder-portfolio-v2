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
      amount: "GHS 100.00",
    });
    expect(html).toContain("Ysabeau Office");
    expect(html).toContain("Oceaniccoder-logo@3x.png");
  });

  it("tells the client which invoice was paid and how much", () => {
    const html = emails.clientReceiptEmail({
      clientName: "Ama",
      invoiceNumber: "INV-123456",
      amount: "GHS 250.00",
    });
    expect(html).toContain("Hi Ama");
    expect(html).toContain("INV-123456");
    expect(html).toContain("GHS 250.00");
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

  describe("Paystack retry window", () => {
    const CHARGED = Date.parse("2026-10-20T09:15:00.000Z");
    const untracked = (window) => emails.webhookUntrackedEmail("r", "d", window);

    it("gives about 72 hours from the charge in live mode", () => {
      const html = untracked({ mode: "live", chargedAt: CHARGED });
      expect(html).toContain(
        "In live mode Paystack keeps retrying for about 72 hours after the first failed delivery, so until about 2026-10-23 09:15 UTC.",
      );
    });

    it("gives about 10 hours from the charge in test mode", () => {
      const html = untracked({ mode: "test", chargedAt: CHARGED });
      expect(html).toContain(
        "In test mode Paystack retries hourly for about 10 hours, so until about 2026-10-20 19:15 UTC.",
      );
    });

    it("gives no time and points to the dashboard when the mode is unknown", () => {
      const html = untracked({ mode: undefined, chargedAt: CHARGED });
      expect(html).not.toContain("until about");
      expect(html).toContain("did not say whether the charge was in live or test mode");
      expect(html).toContain("Paystack dashboard");
    });

    it("says the charge time was not usable when it cannot be read", () => {
      const html = untracked({ mode: "live", chargedAt: NaN });
      expect(html).not.toContain("until about");
      expect(html).toContain("did not give a usable charge time");
    });

    it("tells the admin to check the Payments tab or the Paystack dashboard", () => {
      expect(untracked({ mode: "live", chargedAt: CHARGED })).toContain(
        "check the Payments tab or the Paystack dashboard",
      );
    });

    describe("in the retry email", () => {
      const retryEmail = (window) => emails.webhookRetryEmail("r", "d", window);

      it("promises the 24-hour follow-up and gives the window in live mode", () => {
        const html = retryEmail({ mode: "live", chargedAt: CHARGED });
        expect(html).toContain("one more email follows if the payment is still failing 24 hours");
        expect(html).toContain("so until about 2026-10-23 09:15 UTC");
        expect(html).toContain("Do not mark the invoice paid by hand");
      });

      it("promises no follow-up and gives the 10-hour deadline in test mode", () => {
        const html = retryEmail({ mode: "test", chargedAt: CHARGED });
        expect(html).not.toContain("one more email follows");
        expect(html).toContain("so until about 2026-10-20 19:15 UTC");
        expect(html).toContain("No follow-up email will come");
        expect(html).toContain("record the payment by hand");
      });

      it("promises no follow-up and points to the dashboard when the mode is unknown", () => {
        const html = retryEmail({ mode: undefined, chargedAt: CHARGED });
        expect(html).not.toContain("one more email follows");
        expect(html).not.toContain("until about");
        expect(html).toContain("No follow-up email will come");
        expect(html).toContain("Paystack dashboard");
      });
    });

    it("uses the same window in the escalation", () => {
      const html = emails.webhookEscalationEmail("r", "d", { mode: "live", chargedAt: CHARGED });
      expect(html).toContain("so until about 2026-10-23 09:15 UTC");
      expect(html).not.toContain("72 hours after the charge");
    });

    it.each([
      ["live", "In live mode Paystack keeps retrying each charge for about 72 hours"],
      ["test", "In test mode Paystack retries each charge hourly for about 10 hours"],
      [undefined, "about 72 hours in live mode and about 10 hours in test mode"],
    ])("states the %s-mode window in the invalid setting email", (mode, text) => {
      const html = emails.invalidSettingEmail("WRITE_HOLD", "detail", mode);
      expect(html).toContain(text);
      expect(html).not.toContain("72-hour retry window");
    });
  });
});
