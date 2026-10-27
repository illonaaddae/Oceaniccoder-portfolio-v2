// @vitest-environment node
import { describe, it, expect } from "vitest";

const { SAMPLES, SAMPLE_VIEWS } = await import("./samples.js");
const T = await import("./quoteEmails.js");

const PAYLOAD = "<script>x</script>";

// Replace every string in a view model (recursively) with the XSS payload.
function poison(value) {
  if (typeof value === "string") return PAYLOAD;
  if (Array.isArray(value)) return value.map(poison);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, poison(v)]));
  }
  return value;
}

describe("quote email templates", () => {
  it.each(Object.keys(SAMPLES))("%s renders subject, html and text", (name) => {
    const mail = SAMPLES[name]();
    expect(mail.subject.length).toBeGreaterThan(5);
    expect(mail.html).toContain("OceanicCoder");
    expect(mail.text.length).toBeGreaterThan(20);
    expect(mail.html).not.toMatch(/undefined|NaN|\[object Object\]/);
    expect(mail.text).not.toMatch(/undefined|NaN|\[object Object\]/);
  });

  it.each(Object.keys(SAMPLE_VIEWS))("%s escapes every string field of its view", (name) => {
    const { template, view } = SAMPLE_VIEWS[name];
    const mail = T[template](poison(view));
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("OceanicCoder");
  });

  it("escapes client-supplied text", () => {
    const mail = T.quoteDecisionAlert({
      decision: "declined",
      clientName: "<script>x</script>",
      clientEmail: "a@b.co",
      quoteNumber: "Q-2026-0001",
      title: "T",
      total: "GHS 1.00",
      acceptedName: "",
      reason: "<img src=x>",
      adminLink: "https://oceaniccoder.dev/admin/dashboard",
    });
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).not.toContain("<img src=x>");
  });

  it("talks about paying in full, not a deposit, for a one-stage quote", () => {
    const sent = T.quoteSent({
      ...SAMPLE_VIEWS.quoteSent.view,
      planSummary: "100% full payment",
      singleStage: true,
    });
    expect(sent.html).toContain("Pay in full to book your slot");
    expect(sent.html).not.toMatch(/deposit/i);

    const { view } = SAMPLE_VIEWS.quoteAccepted;
    const acc = T.quoteAccepted({
      ...view,
      invoice: {
        ...view.invoice,
        label: "Full payment (100%)",
        payLink: "https://oceaniccoder.dev/q/t/pay/full",
        invoiceLink: "https://oceaniccoder.dev/q/t/invoice/full",
      },
      singleStage: true,
    });
    expect(acc.subject).toBe(`Quote accepted: your invoice for ${view.title}`);
    expect(acc.html).toContain("Pay now");
    expect(acc.html).not.toMatch(/deposit|later stages/i);
    expect(acc.text).not.toMatch(/deposit/i);
  });

  describe("how the quote link opens", () => {
    const view = { ...SAMPLE_VIEWS.quoteSent.view, linkOpens: false, codeByEmail: false };
    const OPENS = "This link usually opens straight away.";
    const ASKS = "This link asks for a short code that we email to Kofi.";

    it("says the link opens straight away when this copy carries a link code", () => {
      const sent = T.quoteSent({ ...view, linkOpens: true });
      for (const body of [sent.html, sent.text]) {
        expect(body).toContain(OPENS);
        expect(body).toContain("another device");
        expect(body).not.toContain("asks for a short code");
      }
    });

    it("says the link asks for a code sent to the client on a copy without one", () => {
      const sent = T.quoteSent({ ...view, codeByEmail: true });
      for (const body of [sent.html, sent.text]) {
        expect(body).toContain(ASKS);
        expect(body).not.toContain(OPENS);
        expect(body).not.toContain("@example");
      }
    });

    it("says nothing about codes while the gate is off", () => {
      const sent = T.quoteSent(view);
      for (const body of [sent.html, sent.text]) {
        expect(body).not.toContain(OPENS);
        expect(body).not.toContain("asks for a short code");
        expect(body).toContain("Questions? Reply to this email.");
      }
    });
  });

  it("keeps the deposit wording for a staged quote", () => {
    const acc = T.quoteAccepted({ ...SAMPLE_VIEWS.quoteAccepted.view, singleStage: false });
    expect(acc.html).toContain("Pay the deposit");
    expect(acc.subject).toMatch(/deposit invoice/);
  });

  it("omits the invoice block and pay button when there is no invoice", () => {
    const { view } = SAMPLE_VIEWS.quoteAccepted;
    const mail = T.quoteAccepted({ ...view, invoice: null });
    expect(mail.html).not.toContain("/pay/");
    expect(mail.html).not.toContain("/invoice/");
    expect(mail.html).not.toContain("View invoice");
    expect(mail.html).not.toContain("Deposit invoice");
    expect(mail.text).not.toContain("Pay here");
    expect(mail.text).not.toContain("Deposit invoice");
    expect(mail.subject).toBe(`Quote accepted: ${view.title}`);
  });

  describe("maintenanceOffer", () => {
    const { view } = SAMPLE_VIEWS.maintenanceOffer;

    it("thanks the client, gives the free period end, the plans and how to start", () => {
      const mail = T.maintenanceOffer(view);
      expect(mail.subject).toContain(view.title);
      expect(mail.html).toContain("Thank you for launching with me");
      expect(mail.html).toContain("ends on 20 Dec 2026");
      expect(mail.html).toContain("Care Plus");
      expect(mail.html).toContain("GHS</span>&nbsp;900.00");
      expect(mail.html).toContain("per month");
      expect(mail.html).toContain("Priority response within 1 working day");
      expect(mail.html).toContain("https://wa.me/233241234567");
      expect(mail.html).toContain("message me on WhatsApp</a> to start a plan");
      expect(mail.text).toContain("Care: GHS 400.00 per month");
      expect(mail.text).toContain("  - Uptime monitoring");
      expect(mail.text).toContain("ends on 20 Dec 2026");
    });

    it("has no payment link", () => {
      const mail = T.maintenanceOffer(view);
      expect(mail.html).not.toContain("/pay/");
      expect(mail.text).not.toContain("/pay/");
      expect(mail.html).not.toMatch(/Pay now/);
    });

    it("drops WhatsApp when no number is set and says ended for a past period", () => {
      const mail = T.maintenanceOffer({ ...view, whatsappLink: "", freeEnded: true });
      expect(mail.html).not.toContain("wa.me");
      expect(mail.html).not.toContain("WhatsApp");
      expect(mail.html).toContain("Reply to this email to start a plan.");
      expect(mail.html).toContain("ended on 20 Dec 2026");
      expect(mail.text).not.toContain("WhatsApp");
    });

    it("leaves the free period out when there was none", () => {
      const mail = T.maintenanceOffer({ ...view, freeDays: 0, freeEnds: "" });
      expect(mail.html).not.toContain("free support period");
      expect(mail.html).toContain("A plan keeps it safe");
      expect(mail.html).toContain("Care Plus");
    });
  });

  describe("access code", () => {
    const view = SAMPLE_VIEWS.accessCode.view;

    it("puts the code in the subject, the preview, the html and the text", () => {
      const mail = T.accessCode(view);
      expect(mail.subject).toBe("482915 is your code for quote Q-2026-0007");
      expect(mail.html).toContain("Your verification code is 482915. It works for 10 minutes.");
      expect(mail.html).toContain("Hi Kofi, someone opened your quote in a new browser.");
      expect(mail.text).toContain("If it wasn't you, you can ignore this email.");
    });

    it("leads with a plain verification sentence for Gmail's copy chip and autofill", () => {
      const mail = T.accessCode(view);
      expect(mail.text.split("\n")[0]).toBe("Your verification code is 482915.");
      const body = mail.html.slice(mail.html.indexOf("<h1"));
      expect(body.indexOf("Your verification code is 482915.")).toBeLessThan(
        body.indexOf("someone opened your quote"),
      );
    });

    it("shows the code alone, unspaced and selectable in one tap", () => {
      const mail = T.accessCode(view);
      expect(mail.html).toMatch(/user-select:all">482915<\/div>/);
      expect(mail.text.split("\n")).toContain("482915");
      expect(mail.text).toContain(
        "Someone opened your quote in a new browser. Here's your code:\n\n482915\n\nIt works for 10 minutes.",
      );
    });

    it("carries no link to the quote", () => {
      const mail = T.accessCode(view);
      expect(mail.html).not.toContain("/q/");
      expect(mail.text).not.toMatch(/https?:/);
    });
  });

  describe("access code for an invoice or a receipt", () => {
    it("names the invoice in the subject, the heading and the header", () => {
      const mail = T.accessCode(SAMPLE_VIEWS.invoiceAccessCode.view);
      expect(mail.subject).toBe("482915 is your code for invoice INV-2026-0042");
      expect(mail.html).toContain("Open your invoice");
      expect(mail.html).toContain("Hi Kofi, someone opened your invoice in a new browser.");
      expect(mail.html).toContain("INV-2026-0042");
      expect(mail.html).not.toContain("quote");
      expect(mail.text.split("\n")[0]).toBe("Your verification code is 482915.");
      expect(mail.html).not.toContain("/pay/");
      expect(mail.text).not.toMatch(/https?:/);
    });

    it("says only 'your receipt' in the subject", () => {
      const mail = T.accessCode(SAMPLE_VIEWS.receiptAccessCode.view);
      expect(mail.subject).toBe("482915 is your code for your receipt");
      expect(mail.html).toContain("Open your receipt");
      expect(mail.text).toContain("Someone opened your receipt in a new browser.");
      expect(mail.html).not.toContain("quote");
      expect(mail.html).not.toContain("/receipt/");
      expect(mail.text).not.toMatch(/https?:/);
    });
  });

  it("tells the owner which invoice locked and how to sign every browser out", () => {
    const mail = T.accessLockedAlert(SAMPLE_VIEWS.invoiceAccessLockedAlert.view);
    expect(mail.subject).toBe("Code locked after 5 wrong tries on INV-2026-0042");
    expect(mail.html).toContain("An invoice code was locked");
    expect(mail.html).toContain("Use Reset access on the invoice");
    expect(mail.html).not.toContain("New link");
    expect(mail.text).toContain("https://oceaniccoder.dev/admin/dashboard");
    const blocked = T.accessLockedAlert({
      ...SAMPLE_VIEWS.invoiceAccessLockedAlert.view,
      blocked: true,
    });
    expect(blocked.subject).toBe("Codes blocked after 15 wrong tries on INV-2026-0042");
    expect(blocked.text).toContain(
      "No more codes will be sent or accepted on this link until you use Reset access.",
    );
  });

  it("tells the owner when only the unsigned link of an invoice is blocked", () => {
    const mail = T.accessLockedAlert(SAMPLE_VIEWS.invoiceAccessLinkBlockedAlert.view);
    expect(mail.subject).toBe(
      "Codes blocked after 5 wrong tries on the unsigned link for INV-512345",
    );
    const said =
      "Five wrong codes were entered on the unsigned link for invoice INV-512345, so codes for that link are blocked for now. The client's signed link still works. To be sure they can pay, resend the invoice from the dashboard so they get the signed link. Reset access also clears the block, but anyone guessing the number could block it again.";
    expect(mail.text.replace(/\s+/g, " ")).toContain(said);
    expect(mail.html).toContain("The client&#39;s signed link still works.");
    expect(mail.html).not.toContain("Fifteen");
  });

  it("leaves an empty client name out of the unsigned-link alert", () => {
    const view = { ...SAMPLE_VIEWS.invoiceAccessLinkBlockedAlert.view, clientName: "" };
    const mail = T.accessLockedAlert(view);
    expect(mail.text).toContain(`\n${view.lockedOn}.\n`);
    expect(mail.text).not.toContain(`\n, ${view.lockedOn}`);
  });

  it("names the receipt in a quote's alert when the codes were for one of its receipts", () => {
    const view = { ...SAMPLE_VIEWS.accessLockedAlert.view, reference: "Q-2026-0007-1-K7Q2X9PL" };
    const mail = T.accessLockedAlert(view);
    expect(mail.subject).toBe("Code locked after 5 wrong tries on Q-2026-0007");
    expect(mail.html).toContain("Q-2026-0007-1-K7Q2X9PL");
    expect(mail.text).toContain(
      "(Online store with Paystack checkout, Kofi Mensah, receipt Q-2026-0007-1-K7Q2X9PL)",
    );
    expect(mail.html).toContain("Use New link on the quote");
    expect(T.accessLockedAlert(poison(view)).html).not.toContain("<script>");
  });

  it("tells the owner which quote locked and how to cut off a shared link", () => {
    const mail = T.accessLockedAlert(SAMPLE_VIEWS.accessLockedAlert.view);
    expect(mail.subject).toBe("Code locked after 5 wrong tries on Q-2026-0007");
    expect(mail.html).toContain("Kofi Mensah");
    expect(mail.html).toContain("Use New link on the quote");
    expect(mail.text).toContain("https://oceaniccoder.dev/admin/dashboard");
    expect(mail.text).not.toContain("No more codes will be sent");
  });

  it("says when codes are blocked until New link or Revise", () => {
    const mail = T.accessLockedAlert({ ...SAMPLE_VIEWS.accessLockedAlert.view, blocked: true });
    expect(mail.subject).toBe("Codes blocked after 15 wrong tries on Q-2026-0007");
    const blocked =
      "No more codes will be sent or accepted on this link until you use New link or Revise.";
    expect(mail.html).toContain(blocked);
    expect(mail.text).toContain(blocked);
    expect(mail.text).toContain("Fifteen wrong codes have been entered for Q-2026-0007 (");
  });

  it("covers every template sample", () => {
    expect(Object.keys(SAMPLES).sort()).toEqual(
      [
        "accessCode",
        "accessLockedAlert",
        "invoiceAccessCode",
        "invoiceAccessLockedAlert",
        "invoiceAccessLinkBlockedAlert",
        "receiptAccessCode",
        "maintenanceOffer",
        "paymentAlert",
        "paymentAlertProblem",
        "paymentReceipt",
        "paymentRequest",
        "quoteAccepted",
        "quoteDecisionAlert",
        "quoteSent",
      ].sort(),
    );
  });
});
