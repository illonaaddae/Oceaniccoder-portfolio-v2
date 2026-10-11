// @vitest-environment node
import { describe, it, expect } from "vitest";

const { newsletterEmailHtml } = await import("./index.js");

const post = {
  title: "Shipping <fast> & safe",
  excerpt: "A short <b>excerpt</b>",
  slug: "shipping fast",
  category: "Engineering",
  image: "https://cdn.example.com/cover.jpg",
};

describe("newsletter email", () => {
  it("uses the branded kit", () => {
    const html = newsletterEmailHtml(post);
    expect(html).toContain("Oceaniccoder-logo@3x.png");
    expect(html).toContain("Ysabeau Office");
  });

  it("escapes the title, excerpt and category", () => {
    const html = newsletterEmailHtml(post);
    expect(html).toContain("Shipping &lt;fast&gt; &amp; safe");
    expect(html).toContain("A short &lt;b&gt;excerpt&lt;/b&gt;");
    expect(html).not.toContain("<b>excerpt</b>");
    expect(html).toContain("New post · Engineering");
  });

  it("links to the encoded post URL and shows the cover image", () => {
    const html = newsletterEmailHtml(post);
    expect(html).toContain('href="https://oceaniccoder.dev/blog/shipping%20fast"');
    expect(html).toContain('src="https://cdn.example.com/cover.jpg"');
  });

  it("drops a non-https image", () => {
    const html = newsletterEmailHtml({ ...post, image: "javascript:alert(1)" });
    expect(html).not.toContain('<img src="javascript');
    expect(html).not.toContain("alert(1)");
  });

  it("flags a test send and leaves the flag out of a real send", () => {
    expect(newsletterEmailHtml({ ...post, isTest: true })).toContain(
      "Test send: this went only to you",
    );
    expect(newsletterEmailHtml(post)).not.toContain("Test send");
  });

  it("keeps the subscription reason in the footer", () => {
    expect(newsletterEmailHtml(post)).toContain("subscribed to OceanicCoder updates");
  });
});
