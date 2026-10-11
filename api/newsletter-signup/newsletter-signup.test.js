// @vitest-environment node
import { describe, it, expect } from "vitest";

const { welcomeEmailHtml } = await import("./index.js");

describe("welcome email", () => {
  const html = welcomeEmailHtml();

  it("uses the branded kit: wordmark, Ysabeau, no dark legacy shell", () => {
    expect(html).toContain("Oceaniccoder-logo@3x.png");
    expect(html).toContain("Ysabeau Office");
    expect(html).not.toContain("#1e293b");
  });

  it("welcomes the subscriber and links to the blog", () => {
    expect(html).toContain("Welcome aboard");
    expect(html).toContain("subscribed to the OceanicCoder newsletter");
    expect(html).toContain('href="https://oceaniccoder.dev/blog"');
    expect(html).toContain("spam folder");
  });

  it("keeps the subscription reason and unsubscribe note in the footer", () => {
    expect(html).toContain("subscribed at oceaniccoder.dev");
    expect(html).toContain("Unsubscribe anytime.");
  });
});
