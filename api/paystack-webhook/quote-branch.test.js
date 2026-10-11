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
