// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { inquiryEmail } = require("./index.js");

describe("notify-inquiry email", () => {
  it("lists the inquiry and links to the dashboard", () => {
    const html = inquiryEmail({ name: "Ama", email: "ama@example.com", projectType: "Website" });
    expect(html).toContain("New project inquiry");
    expect(html).toContain("Ama");
    expect(html).toContain("ama@example.com");
    expect(html).toContain("Website");
    expect(html).toContain('href="https://oceaniccoder.dev/dashboard"');
    expect(html).toContain("Ysabeau Office");
  });

  it("falls back to N/A for missing fields", () => {
    const html = inquiryEmail({});
    expect(html.match(/N\/A/g)).toHaveLength(3);
  });

  it("escapes visitor input", () => {
    const html = inquiryEmail({ name: "<script>x</script>", email: "a@b.c", projectType: "x" });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
