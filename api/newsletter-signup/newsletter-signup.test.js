// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";

const mod = await import("./index.js");
const handler = mod.default || mod;
const { welcomeEmailHtml } = mod;

function makeContext() {
  const log = Object.assign(() => {}, { warn: () => {}, error: () => {} });
  return { log, res: undefined };
}

async function signup(email) {
  const context = makeContext();
  await handler(context, { method: "POST", body: { email } });
  return context.res;
}

describe("email validation", () => {
  const saved = {};
  beforeEach(() => {
    for (const k of ["RESEND_API_KEY", "RESEND_AUDIENCE_ID"]) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("rejects a long run of dots quickly instead of backtracking", async () => {
    const started = Date.now();
    const res = await signup("a@" + ".".repeat(100000) + " ");
    expect(res.status).toBe(400);
    expect(Date.now() - started).toBeLessThan(100);
  });

  it("rejects addresses longer than 254 characters", async () => {
    const local = "a".repeat(64);
    const email = `${local}@${"b".repeat(255 - local.length - 5)}.com`;
    expect(email.length).toBe(255);
    expect((await signup(email)).status).toBe(400);
  });

  it("rejects non-string emails", async () => {
    expect((await signup(["a@b.co"])).status).toBe(400);
    expect((await signup({ toString: () => "a@b.co" })).status).toBe(400);
  });

  it("lets a valid address past validation", async () => {
    // With Resend unconfigured, a valid email reaches the 503 branch.
    expect((await signup("reader@example.com")).status).toBe(503);
  });
});

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
