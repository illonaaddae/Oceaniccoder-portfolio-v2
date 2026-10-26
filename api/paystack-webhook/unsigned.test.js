// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRequire } from "module";

// Load through Node's require so the spies and index.js share one module
// object (vi.mock does not intercept CommonJS require).
const require = createRequire(import.meta.url);
const https = require("https");
const handler = require("./index.js");

const HOUR = 60 * 60 * 1000;
const SUBJECT = "Action needed: a Paystack webhook was not processed";
const WRONG_SIG = { "x-paystack-signature": "ab".repeat(64) };

// Records every email attempt instead of calling Resend. Push statuses onto
// sent.answers to have the next attempts answered with them (default 200).
function captureEmails() {
  const sent = [];
  Object.defineProperty(sent, "answers", { value: [] });
  vi.spyOn(https, "request").mockImplementation((options, onResponse) => {
    let raw = "";
    return {
      on: () => {},
      setTimeout: () => {},
      write: (chunk) => {
        raw += chunk;
      },
      end: () => {
        const statusCode = sent.answers.length ? sent.answers.shift() : 200;
        sent.push({ status: statusCode, ...JSON.parse(raw) });
        onResponse({ statusCode, on: (ev, fn) => ev === "end" && fn() });
      },
    };
  });
  return sent;
}

// Anyone can POST to the webhook. Unverified requests must not email the admin
// every time, or a loop of junk requests floods the inbox and uses up the
// Resend quota that real receipts depend on. One email an hour still surfaces
// a real key mode mix-up.
describe("paystack-webhook with an unverified request", () => {
  // The throttle lives in index.js for the life of the module, so every test
  // starts more than an hour after the last one.
  let now = 1_800_000_000_000;
  let sent;
  const body = { event: "charge.success", data: { reference: "x" } };
  const post = async (headers, req = { rawBody: JSON.stringify(body), body }) => {
    const context = {
      res: null,
      log: Object.assign(vi.fn(), { info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
    };
    await handler(context, { method: "POST", headers, ...req });
    return context;
  };

  beforeEach(() => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test_webhook";
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_TO_EMAIL = "admin@example.com";
    now += 2 * HOUR;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    sent = captureEmails();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.PAYSTACK_SECRET_KEY;
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_TO_EMAIL;
  });

  it.each([
    ["no signature header", {}, undefined],
    ["a signature that isn't hex", { "x-paystack-signature": "not-hex" }, undefined],
    ["a hex signature of the wrong length", { "x-paystack-signature": "ab".repeat(10) }, undefined],
    ["a signature that isn't a string", { "x-paystack-signature": ["ab".repeat(64)] }, undefined],
    ["a well-formed signature with no body", WRONG_SIG, {}],
  ])("answers 200 and only logs, never emails, for %s", async (_name, headers, req) => {
    for (let i = 0; i < 3; i++) {
      const { res, log } = await post(headers, req);
      expect(res.status).toBe(200);
      expect(log.error).toHaveBeenCalledWith(
        expect.stringContaining("not from Paystack; no email"),
      );
    }
    expect(sent).toEqual([]);
  });

  it("emails once for a signature mismatch, then logs that it held back the rest", async () => {
    const first = await post(WRONG_SIG);
    expect(first.res.status).toBe(200);
    expect(sent.map((m) => m.subject)).toEqual([SUBJECT]);
    expect(sent[0].html).toContain("PAYSTACK_SECRET_KEY is a test key");
    expect(sent[0].html).toContain("Further mismatches in the next hour are only logged.");

    for (let i = 0; i < 5; i++) {
      now += 60 * 1000;
      const { res, log } = await post(WRONG_SIG);
      expect(res.status).toBe(200);
      expect(log.error).toHaveBeenCalledWith(
        expect.stringContaining("signature verification failed"),
      );
      expect(log.warn).toHaveBeenCalledWith(expect.stringContaining("at most one an hour"));
    }
    expect(sent).toHaveLength(1);
  });

  it("emails once when mismatches arrive at the same time", async () => {
    await Promise.all(Array.from({ length: 8 }, () => post(WRONG_SIG)));
    expect(sent).toHaveLength(1);
  });

  it("doesn't let junk with no signature use up the alert a key mix-up needs", async () => {
    for (let i = 0; i < 10; i++) await post({});
    await post(WRONG_SIG);
    expect(sent).toHaveLength(1);
  });

  it("emails again once an hour has passed", async () => {
    await post(WRONG_SIG);
    now += HOUR - 1;
    await post(WRONG_SIG);
    expect(sent).toHaveLength(1);
    now += 1;
    await post(WRONG_SIG);
    expect(sent).toHaveLength(2);
  });

  it("gives the hour back when the email fails, so the next mismatch emails", async () => {
    sent.answers.push(500);
    await post(WRONG_SIG);
    await post(WRONG_SIG);
    await post(WRONG_SIG);
    expect(sent.map((m) => m.status)).toEqual([500, 200]);
  });

  it("still emails every time the secret key is missing (a config fault, not a visitor)", async () => {
    delete process.env.PAYSTACK_SECRET_KEY;
    await post({});
    await post({});
    expect(sent).toHaveLength(2);
  });
});
