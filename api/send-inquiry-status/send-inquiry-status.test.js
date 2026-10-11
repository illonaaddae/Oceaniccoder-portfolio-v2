// @vitest-environment node
import { describe, it, expect } from "vitest";

const { buildStatusEmail } = await import("./index.js");

describe("send-inquiry-status email", () => {
  it("builds the reviewed email on the branded shell", () => {
    const e = buildStatusEmail({ status: "reviewed", clientName: "Ama", projectType: "Web App" });
    expect(e.subject).toBe("Your Web App Inquiry – I've Reviewed Your Project");
    expect(e.html).toContain("Oceaniccoder-logo@3x.png");
    expect(e.html).toContain("Ysabeau Office");
    expect(e.html).toContain("Under review");
    expect(e.html).toContain("Thanks, Ama!");
    expect(e.html).toContain("your Web App project brief");
    expect(e.html).toContain("Expect to hear from me within 24 hours.");
    expect(e.text).toContain("Thanks, Ama!");
  });

  it("keeps the status-specific copy for quoted and declined", () => {
    const q = buildStatusEmail({ status: "quoted", clientName: "Ama", projectType: "Store" });
    expect(q.subject).toBe("Your Store Project – Proposal Ready");
    expect(q.html).toContain("Proposal ready");
    expect(q.html).toContain("Great news, Ama!");
    expect(q.html).toContain("Check your inbox for the invoice.");

    const d = buildStatusEmail({ status: "declined", clientName: "Ama", projectType: "Store" });
    expect(d.subject).toBe("Re: Your Store Inquiry");
    expect(d.html).toContain("Hi Ama,");
    expect(d.html).toContain("not able to take on new projects");
  });

  it("falls back to 'your project' when no project type is given", () => {
    const e = buildStatusEmail({ status: "declined", clientName: "Ama" });
    expect(e.subject).toBe("Re: Your your project Inquiry");
    expect(e.html).toContain("your your project project");
  });

  it("returns null for statuses that send no email", () => {
    expect(buildStatusEmail({ status: "new", clientName: "Ama" })).toBeNull();
    expect(buildStatusEmail({ status: "toString", clientName: "Ama" })).toBeNull();
  });

  it("escapes client input in the html but not the subject", () => {
    const e = buildStatusEmail({
      status: "reviewed",
      clientName: "<b>Ama</b>",
      projectType: "Tom & Co <script>",
    });
    expect(e.html).not.toContain("<b>Ama</b>");
    expect(e.html).not.toContain("<script>");
    expect(e.html).toContain("&lt;b&gt;Ama&lt;/b&gt;");
    expect(e.html).toContain("Tom &amp; Co &lt;script&gt;");
    expect(e.subject).toBe("Your Tom & Co <script> Inquiry – I've Reviewed Your Project");
  });
});
