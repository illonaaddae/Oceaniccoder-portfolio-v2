// @vitest-environment node
import { describe, it, expect } from "vitest";

const { SAMPLES } = await import("./samples.js");
const T = await import("./quoteEmails.js");

describe("quote email templates", () => {
  it.each(Object.keys(SAMPLES))("%s renders subject, html and text", (name) => {
    const mail = SAMPLES[name]();
    expect(mail.subject.length).toBeGreaterThan(5);
    expect(mail.html).toContain("OceanicCoder");
    expect(mail.text.length).toBeGreaterThan(20);
    expect(mail.html).not.toMatch(/undefined|NaN|\[object Object\]/);
    expect(mail.text).not.toMatch(/undefined|NaN|\[object Object\]/);
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

  it("covers all six templates", () => {
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
