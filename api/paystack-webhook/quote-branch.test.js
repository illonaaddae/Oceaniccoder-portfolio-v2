// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { createRequire } from "module";

// Load through Node's require so the spy and index.js share one module object
// (vi.mock does not intercept CommonJS require; see create-booking.test.js).
const require = createRequire(import.meta.url);
const quoteService = require("../shared/quotes/service.js");
const handler = require("./index.js");

const SECRET = "sk_test_webhook";

function signed(event) {
  const rawBody = JSON.stringify(event);
  const signature = crypto.createHmac("sha512", SECRET).update(rawBody).digest("hex");
  return { method: "POST", rawBody, body: event, headers: { "x-paystack-signature": signature } };
}

const quoteEvent = {
  event: "charge.success",
  data: {
    reference: "Q-2026-0001-1-ABCDEFGH",
    domain: "test",
    amount: 6000,
    currency: "GHS",
    metadata: { kind: "quote" },
  },
};

describe("paystack-webhook quote branch", () => {
  let spy;
  beforeEach(() => {
    process.env.PAYSTACK_SECRET_KEY = SECRET;
    delete process.env.RESEND_API_KEY; // keep bail() from sending email
    spy = vi.spyOn(quoteService, "handleQuoteCharge");
  });
  afterEach(() => {
    spy.mockRestore();
    delete process.env.PAYSTACK_SECRET_KEY;
  });

  const run = async (req) => {
    const context = {
      res: null,
      log: Object.assign(vi.fn(), { info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
    };
    await handler(context, req);
    return context.res;
  };

  it("settles quote charges through the quote service", async () => {
    spy.mockResolvedValue({ state: "success" });
    const res = await run(signed(quoteEvent));
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith("Q-2026-0001-1-ABCDEFGH");
  });

  it("answers 500 so Paystack retries when settling throws", async () => {
    spy.mockRejectedValue(new Error("appwrite down"));
    expect((await run(signed(quoteEvent))).status).toBe(500);
  });

  it("acknowledges an unknown quote reference with 200", async () => {
    spy.mockResolvedValue({ state: "unknown" });
    expect((await run(signed(quoteEvent))).status).toBe(200);
  });

  it("leaves invoice charges on the existing path", async () => {
    const invoiceEvent = {
      event: "charge.success",
      data: {
        reference: "OC-INV-123456-1",
        domain: "test",
        metadata: { invoiceNumber: "INV-123456" },
      },
    };
    delete process.env.APPWRITE_API_KEY; // existing path bails before any network call
    await run(signed(invoiceEvent));
    expect(spy).not.toHaveBeenCalled();
  });
});

// Its own describe: the invalid DATA_BACKEND alert is sent once per process,
// so it is the only test in this file that mails about it.
describe("paystack-webhook quote branch with an invalid DATA_BACKEND", () => {
  const https = require("https");
  let sent;
  beforeEach(() => {
    Object.assign(process.env, {
      PAYSTACK_SECRET_KEY: SECRET,
      RESEND_API_KEY: "re_test",
      RESEND_TO_EMAIL: "admin@example.com",
      DATA_BACKEND: "bogus",
    });
    sent = [];
    vi.spyOn(https, "request").mockImplementation((options, onResponse) => {
      let raw = "";
      return {
        on: () => {},
        setTimeout: () => {},
        write: (chunk) => {
          raw += chunk;
        },
        end: () => {
          sent.push(JSON.parse(raw));
          onResponse({ statusCode: 200, on: (ev, fn) => ev === "end" && fn() });
        },
      };
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    for (const key of ["PAYSTACK_SECRET_KEY", "RESEND_API_KEY", "RESEND_TO_EMAIL", "DATA_BACKEND"])
      delete process.env[key];
  });

  it("answers 500 and mails the invalid setting once", async () => {
    const quote = vi.spyOn(quoteService, "handleQuoteCharge");
    for (let i = 0; i < 2; i++) {
      const context = {
        res: null,
        log: Object.assign(vi.fn(), { info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
      };
      await handler(context, signed(quoteEvent));
      expect(context.res.status).toBe(500);
    }
    expect(sent.map((m) => m.subject)).toEqual([
      "Action needed: Paystack webhooks are failing and will be retried",
    ]);
    expect(sent[0].html).toContain("DATA_BACKEND is not valid");
    expect(quote).not.toHaveBeenCalled();
  });
});
