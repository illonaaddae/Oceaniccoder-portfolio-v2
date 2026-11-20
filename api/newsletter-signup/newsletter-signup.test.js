// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { welcomeEmailHtml, createHandler } = await import("./index.js");
const { verifyTurnstile: realVerifyTurnstile } = await import("../shared/turnstile.js");

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

describe("POST /api/newsletter-signup", () => {
  let env;
  beforeEach(() => {
    env = { ...process.env };
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_AUDIENCE_ID = "aud_1";
  });
  afterEach(() => {
    process.env = env;
  });

  function setup({
    turnstile = { ok: true },
    clock = { ms: Date.parse("2026-11-20T09:00:00Z") },
  } = {}) {
    const verifyTurnstile = vi.fn(async () => turnstile);
    const httpsPost = vi.fn(async () => ({ status: 201, body: "{}" }));
    const run = createHandler({ verifyTurnstile, httpsPost, now: () => clock.ms });
    const call = async (body, ip = "203.0.113.7") => {
      const context = { res: null, log: Object.assign(vi.fn(), { error: vi.fn(), warn: vi.fn() }) };
      await run(context, { method: "POST", headers: { "x-forwarded-for": ip }, body });
      return { status: context.res.status, body: JSON.parse(context.res.body) };
    };
    return { call, verifyTurnstile, httpsPost, clock };
  }

  it("subscribes and welcomes an address with a valid token", async () => {
    const { call, verifyTurnstile, httpsPost } = setup();

    const { status } = await call({ email: "ama@example.com", turnstileToken: "t" });

    expect(status).toBe(200);
    expect(verifyTurnstile).toHaveBeenCalledWith("t", "203.0.113.7");
    expect(httpsPost.mock.calls.map((c) => c[1])).toEqual(["/audiences/aud_1/contacts", "/emails"]);
  });

  it("makes no Resend call when the Turnstile check fails", async () => {
    const { call, httpsPost } = setup({
      turnstile: { ok: false, status: 403, error: "The spam check failed. Please try again." },
    });

    const { status, body } = await call({ email: "ama@example.com", turnstileToken: "bad" });

    expect(status).toBe(403);
    expect(body.error).toMatch(/spam check failed/);
    expect(httpsPost).not.toHaveBeenCalled();
  });

  it("makes no Resend call without a token (real verifier)", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret";
    const httpsPost = vi.fn();
    const run = createHandler({ verifyTurnstile: realVerifyTurnstile, httpsPost });
    const context = { res: null, log: Object.assign(vi.fn(), { error: vi.fn(), warn: vi.fn() }) };

    await run(context, { method: "POST", headers: {}, body: { email: "ama@example.com" } });

    expect(context.res.status).toBe(400);
    expect(httpsPost).not.toHaveBeenCalled();
  });

  it("refuses requests over the per-IP limit before Turnstile or Resend", async () => {
    const { call, verifyTurnstile, httpsPost } = setup();
    for (let i = 0; i < 5; i += 1) {
      expect((await call({ email: `a${i}@example.com`, turnstileToken: "t" })).status).toBe(200);
    }
    verifyTurnstile.mockClear();
    httpsPost.mockClear();

    const { status } = await call({ email: "a6@example.com", turnstileToken: "t" });

    expect(status).toBe(429);
    expect(verifyTurnstile).not.toHaveBeenCalled();
    expect(httpsPost).not.toHaveBeenCalled();
    // Another IP still gets through.
    expect(
      (await call({ email: "b@example.com", turnstileToken: "t" }, "198.51.100.2")).status,
    ).toBe(200);
  });

  it("lets an IP sign up again after the hour", async () => {
    const { call, clock } = setup();
    for (let i = 0; i < 5; i += 1) await call({ email: `a${i}@example.com`, turnstileToken: "t" });
    clock.ms += 60 * 60 * 1000;

    expect((await call({ email: "a@example.com", turnstileToken: "t" })).status).toBe(200);
  });

  it("caps sign-ups per day across IPs", async () => {
    const { call, httpsPost } = setup();
    for (let i = 0; i < 100; i += 1) {
      const ip = `198.51.100.${i + 1}`;
      expect((await call({ email: `u${i}@example.com`, turnstileToken: "t" }, ip)).status).toBe(
        200,
      );
    }
    httpsPost.mockClear();

    const { status } = await call({ email: "late@example.com", turnstileToken: "t" }, "192.0.2.1");

    expect(status).toBe(429);
    expect(httpsPost).not.toHaveBeenCalled();
  });

  it("doesn't count token-less requests against the daily cap", async () => {
    const turnstile = {
      ok: false,
      status: 400,
      error: "Please complete the spam check and try again.",
    };
    const { call, verifyTurnstile } = setup({ turnstile });
    for (let i = 0; i < 150; i += 1)
      await call({ email: `x${i}@example.com` }, `198.51.100.${i % 250}`);
    verifyTurnstile.mockResolvedValue({ ok: true });

    expect(
      (await call({ email: "real@example.com", turnstileToken: "t" }, "192.0.2.9")).status,
    ).toBe(200);
  });
});
