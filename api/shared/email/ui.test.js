// @vitest-environment node
import { describe, it, expect } from "vitest";

const ui = await import("./ui.js");

describe("escaping", () => {
  it("escapes HTML special characters", () => {
    expect(ui.esc(`<b a="1">&'</b>`)).toBe("&lt;b a=&quot;1&quot;&gt;&amp;&#39;&lt;/b&gt;");
    expect(ui.esc(null)).toBe("");
  });
  it("only allows https links (and localhost for development)", () => {
    expect(ui.safeUrl("https://oceaniccoder.dev/q/abc")).toBe("https://oceaniccoder.dev/q/abc");
    expect(ui.safeUrl("http://localhost:5173/q/abc")).toBe("http://localhost:5173/q/abc");
    expect(ui.safeUrl("javascript:alert(1)")).toBe("#");
    expect(ui.safeUrl("http://evil.example")).toBe("#");
  });
  it("keeps line breaks", () => expect(ui.multiline("a\n<b>")).toBe("a<br>&lt;b&gt;"));
});

describe("blocks", () => {
  it("escapes every value it is given", () => {
    const html = ui.card({ title: "<t>", highlight: "<h>", rows: [["<l>", "<v>"]] });
    expect(html).not.toMatch(/<t>|<h>|<l>|<v>/);
  });
  it("renders a button with a safe href", () => {
    expect(ui.button({ href: "javascript:x", label: "Go" })).toContain('href="#"');
  });
  it("wraps content in the branded shell with the preview text and reason", () => {
    const html = ui.shell({ preview: "Hi <there>", body: "<p>x</p>", reason: "Because" });
    expect(html).toContain("OceanicCoder");
    expect(html).toContain("Hi &lt;there&gt;");
    expect(html).toContain("Because");
    expect(html).toContain("<p>x</p>");
  });
  it("joins plain-text lines and drops empty parts", () => {
    expect(ui.lines("a", "", null, "b")).toBe("a\nb");
  });
});
