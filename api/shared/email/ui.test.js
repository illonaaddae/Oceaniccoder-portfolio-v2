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
    expect(html).toContain('stamp-paid@3x.png" width="65" height="26" alt="Paid"');
    expect(html).toContain("font-size:36px");
  });

  it("drops long figures such as dates to a smaller size", () => {
    const html = ui.card({ title: "Booking", highlight: "Thursday, 15 October 2026 at 10:00 AM" });
    expect(html).toContain("font-size:24px");
  });

  it("has no empty header when there is no title or figure", () => {
    const html = ui.card({ rows: [["Paid so far", "GHS 6,000.00"]] });
    expect(html).not.toContain("bgcolor");
    expect(html).toContain("border-radius:8px");
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

describe("dark mode", () => {
  const html = ui.shell({ preview: "", body: "<p>x</p>", reason: "r" });

  it("opts in to dark mode and ships the dark rules", () => {
    expect(html).toContain('name="color-scheme" content="light dark"');
    expect(html).toContain("@media (prefers-color-scheme:dark)");
  });

  it("keys every dark rule on a value the templates actually write inline", () => {
    const tones = ["ok", "warn", "info", "danger"];
    const sample = [
      html,
      ui.card({ title: "T", highlight: "GHS 1.00", rows: [["a", "b"]] }),
      ui.button({ href: "https://x.dev", label: "Go" }),
      ...tones.map((tone) => ui.heading({ eyebrow: "e", title: "t", tone })),
      ...tones.map((tone) => ui.notice({ tone, text: "n" })),
    ].join("");
    const needles = [...html.matchAll(/\[style\*="([^"]+)"\]/g)].map((m) => m[1]);
    expect(needles.length).toBeGreaterThan(10);
    for (const needle of needles) expect(sample, needle).toContain(needle);
  });

  it("pads the logo so it stays readable on the dark sheet", () => {
    expect(html).toContain('class="oc-logo"');
    expect(html).toContain(".oc-logo{background:#ffffff");
  });
});

describe("Gmail dark mode and phone widths", () => {
  it("keeps the card header dark and its text white in Gmail's inverted dark mode", () => {
    const html = ui.card({ title: "Receipt", highlight: "GHS 5,100.00", rows: [["a", "b"]] });
    expect(html).toContain("background-image:linear-gradient(#04333B,#04333B)");
    expect(html).toContain('class="gmail-screen"');
    expect(html).toContain('class="gmail-difference"');
    const shell = ui.shell({ preview: "", body: "", reason: "" });
    expect(shell).toContain('<body class="body"');
    expect(shell).toContain(
      "u + .body .gmail-difference{background:#000;mix-blend-mode:difference}",
    );
  });

  it("keeps an amount on one line with the currency as a small prefix", () => {
    const html = ui.card({ title: "T", highlight: "GHS 5,100.00" });
    expect(html).toContain('<span style="white-space:nowrap"><span');
    expect(html).toContain('letter-spacing:.03em">GHS</span>&nbsp;5,100.00');
    expect(ui.card({ title: "T", highlight: "Thursday, 15 October" })).toContain(
      ">Thursday, 15 October<",
    );
  });

  it("pins the status stamp to the right of the title", () => {
    const html = ui.card({
      title: "Amount due",
      status: { label: "Due", tone: "warn" },
      highlight: "GHS 1.00",
    });
    expect(html).toMatch(
      /<td align="right" style="vertical-align:middle;padding-left:12px;white-space:nowrap;text-align:right"><img src="https:\/\/oceaniccoder\.dev\/images\/email\/stamp-due@3x\.png"/,
    );
  });
});

describe("status stamp", () => {
  it("sends Paid and Due as images of the outlined stamp, so Gmail cannot recolour them", () => {
    const paid = ui.card({ title: "Receipt", status: { label: "Paid", tone: "ok" } });
    expect(paid).toContain('src="https://oceaniccoder.dev/images/email/stamp-paid@3x.png"');
    expect(paid).toContain('alt="Paid"');
    const due = ui.card({ title: "Amount due", status: { label: "Due", tone: "warn" } });
    expect(due).toContain('alt="Due"');
  });

  it("draws any other status as an outlined text stamp", () => {
    const html = ui.card({ title: "T", status: { label: "<Held>", tone: "nope" } });
    expect(html).toContain("border:1.5px solid #a5f3fc");
    expect(html).toContain("&lt;Held&gt;");
    expect(html).not.toContain("<img");
  });
});

describe("button", () => {
  it("gives the dark button no border and puts its padding on the Gmail layers", () => {
    const html = ui.button({ href: "https://oceaniccoder.dev", label: "Pay now" });
    expect(html).not.toContain("border:1px");
    expect(html).toContain(
      'class="gmail-difference" style="display:inline-block;border-radius:10px;padding:13px 23px"',
    );
  });
});

describe("figure wrapping", () => {
  it("lets a long booking date wrap on phones", () => {
    const html = ui.card({
      title: "Booking details",
      highlight: "Thursday, 15 October 2026 at 10:00 AM",
    });
    expect(html).toContain("font-size:24px");
    expect(html).not.toContain("nowrap");
  });
});
