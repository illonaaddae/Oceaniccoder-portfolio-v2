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

  it("covers every template sample", () => {
    expect(Object.keys(SAMPLES).sort()).toEqual(
      [
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
