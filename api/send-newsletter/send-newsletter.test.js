// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRequire } from "module";

// Same https instance as index.js (vi.mock does not reach CommonJS require).
const require = createRequire(import.meta.url);
const https = require("https");
const handler = require("./index.js");
const { newsletterEmailHtml } = handler;

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

describe("send-newsletter access", () => {
  const principal = (p) => Buffer.from(JSON.stringify(p)).toString("base64");
  const admin = principal({ identityProvider: "github", userId: "gh-123", userRoles: ["admin"] });
  const saved = {};
  let request;

  beforeEach(() => {
    saved.ids = process.env.ADMIN_USER_IDS;
    saved.email = process.env.ADMIN_EMAIL;
    process.env.ADMIN_USER_IDS = "gh-123";
    process.env.ADMIN_EMAIL = "admin@example.com";
    request = vi.spyOn(https, "request");
  });
  afterEach(() => {
    vi.restoreAllMocks();
    for (const [key, name] of [
      ["ids", "ADMIN_USER_IDS"],
      ["email", "ADMIN_EMAIL"],
    ]) {
      if (saved[key] === undefined) delete process.env[name];
      else process.env[name] = saved[key];
    }
  });

  const send = async (headers, body = {}) => {
    const context = { log: Object.assign(vi.fn(), { error: vi.fn(), warn: vi.fn() }) };
    await handler(context, { method: "POST", headers, body });
    return { status: context.res.status, body: JSON.parse(context.res.body) };
  };

  it("refuses a caller with no session and sends nothing", async () => {
    const r = await send({ "content-type": "application/json" }, { title: "T", slug: "t" });
    expect(r.status).toBe(401);
    expect(r.body.transports).toEqual({ xAppwriteJwt: 0, body: 0, authorization: 0 });
    expect(request).not.toHaveBeenCalled();
  });

  it("refuses a cross-site request from the admin's session", async () => {
    const r = await send(
      {
        "x-ms-client-principal": admin,
        "content-type": "application/json",
        "sec-fetch-site": "cross-site",
      },
      { title: "T", slug: "t" },
    );
    expect(r.status).toBe(403);
    expect(request).not.toHaveBeenCalled();
  });

  it("lets the admin's Static Web Apps session through", async () => {
    // Past the gate, the missing title is the first thing refused.
    const r = await send({ "x-ms-client-principal": admin, "content-type": "application/json" });
    expect(r).toEqual({ status: 400, body: { error: "title and slug are required" } });
  });
});
