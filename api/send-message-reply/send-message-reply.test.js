// @vitest-environment node
import { describe, it, expect } from "vitest";

const { buildReplyEmail } = await import("./index.js");

describe("send-message-reply email", () => {
  it("greets the recipient and keeps the admin's line breaks", () => {
    const e = buildReplyEmail({
      subject: "Re: Your website",
      message: "Thanks for writing.\r\nI can start next week.",
      recipientName: "Kofi",
    });
    expect(e.html).toContain("Oceaniccoder-logo@3x.png");
    expect(e.html).toContain("Ysabeau Office");
    expect(e.html).toContain("Re: Your website");
    expect(e.html).toContain("Hi Kofi,");
    expect(e.html).toContain("Thanks for writing.<br>I can start next week.");
    expect(e.text).toBe("Hi Kofi,\nThanks for writing.\nI can start next week.");
  });

  it("uses a plain greeting when there is no name", () => {
    const e = buildReplyEmail({ subject: "Hello", message: "Hi there" });
    expect(e.html).toContain(">Hi,</p>");
    expect(e.text.startsWith("Hi,\n")).toBe(true);
  });

  it("escapes the subject, name and message", () => {
    const e = buildReplyEmail({
      subject: "<img src=x>",
      message: "<script>alert(1)</script>",
      recipientName: "A & B",
    });
    expect(e.html).not.toContain("<script>");
    expect(e.html).not.toContain("<img src=x>");
    expect(e.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(e.html).toContain("Hi A &amp; B,");
  });
});
