// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const https = require("https");
const handler = require("./index.js");

// Anyone can POST to the webhook. Unverified requests must not email the admin
// every time, or a loop of junk requests floods the inbox and uses up the
// Resend quota that real receipts depend on. One email an hour still surfaces
// a real key mode mix-up.
describe("paystack-webhook with an unverified request", () => {
  let request;
  let now;
  const context = () => ({ log: Object.assign(vi.fn(), { error: vi.fn(), warn: vi.fn() }) });
  const body = { event: "charge.success", data: { reference: "x" } };
  const post = (headers) => {
    const ctx = context();
    return handler(ctx, { method: "POST", rawBody: JSON.stringify(body), body, headers }).then(
      () => ctx,
    );
  };
  const HOUR = 60 * 60 * 1000;

  beforeEach(() => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test_webhook";
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_TO_EMAIL = "admin@example.com";
    handler.resetUnverifiedAlert();
    now = 1_800_000_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    // sendEmail swallows the throw, so a call here means an email was attempted.
    request = vi.spyOn(https, "request").mockImplementation(() => {
      throw new Error("network in test");
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.PAYSTACK_SECRET_KEY;
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_TO_EMAIL;
  });

  it.each([
    ["no signature header", {}],
    ["a wrong signature", { "x-paystack-signature": "ab".repeat(64) }],
    ["a signature that isn't hex", { "x-paystack-signature": "not-hex" }],
  ])("emails once, then only logs, for repeated requests with %s", async (_name, headers) => {
    const first = await post(headers);
    expect(first.res.status).toBe(200);
    expect(request).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 5; i++) {
      now += 60 * 1000;
      const later = await post(headers);
      expect(later.res.status).toBe(200);
      expect(later.log.error).toHaveBeenCalled();
    }
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("emails again once an hour has passed", async () => {
    await post({});
    now += HOUR - 1;
    await post({});
    expect(request).toHaveBeenCalledTimes(1);
    now += 1;
    await post({});
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("still emails every time the secret key is missing (a config fault, not a visitor)", async () => {
    delete process.env.PAYSTACK_SECRET_KEY;
    await post({});
    await post({});
    expect(request).toHaveBeenCalledTimes(2);
  });
});
