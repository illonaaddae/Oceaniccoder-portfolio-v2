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
  it("renders a code as one selectable, unspaced run of digits", () => {
    const html = ui.codeBlock({ label: "Your code", code: "004217" });
    expect(html).toContain(">004217</div>");
    expect(html).toContain("-webkit-user-select:all;user-select:all");
    expect(html).toContain("monospace");
    expect(ui.codeBlock({ code: "<x>" })).not.toContain("<x>");
  });
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

describe("card", () => {
  it("puts the title and figure on the ocean header, with a status stamp", () => {
    const html = ui.card({
      title: "Receipt",
      status: { label: "Paid", tone: "ok" },
      highlight: "GHS 5,100.00",
      rows: [["Invoice", "INV-1"]],
    });
    expect(html).toContain('bgcolor="#04333B"');
    expect(html).toContain("&#10003; Paid</span>");
    expect(html).toContain("font-size:36px");
  });

  it("drops long figures such as dates to a smaller size", () => {
    const html = ui.card({ title: "Booking", highlight: "Thursday, 15 October 2026 at 10:00 AM" });
    expect(html).toContain("font-size:24px");
  });

  it("has no empty header when there is no title or figure", () => {
    const html = ui.card({ rows: [["Paid so far", "GHS 6,000.00"]] });
    expect(html).not.toContain("#04333B");
    expect(html).toContain("Paid so far");
  });
});

describe("money", () => {
  it("groups thousands and names the currency once", () => {
    expect(ui.money(5100, "GHS")).toBe("GHS 5,100.00");
    expect(ui.money("3413.025", "GHS")).toBe("GHS 3,413.03");
    expect(ui.money(12.5)).toBe("12.50");
  });
});
