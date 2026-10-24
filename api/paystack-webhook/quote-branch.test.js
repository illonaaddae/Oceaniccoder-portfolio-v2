// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { createRequire } from "module";

// Load through Node's require so the spy and index.js share one module object
// (vi.mock does not intercept CommonJS require; see create-booking.test.js).
const require = createRequire(import.meta.url);
const quoteService = require("../shared/quotes/service.js");
const cosmos = require("../shared/cosmos.js");
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
    spy.mockRejectedValue(new Error("Cosmos down"));
    expect((await run(signed(quoteEvent))).status).toBe(500);
  });

  it("acknowledges an unknown quote reference with 200", async () => {
    spy.mockResolvedValue({ state: "unknown" });
    expect((await run(signed(quoteEvent))).status).toBe(200);
  });

  it.each([[12345], [{ id: 1 }], [""], [undefined]])(
    "refuses a quote charge whose reference is not a non-empty string: %j",
    async (reference) => {
      spy.mockResolvedValue({ state: "success" });
      const event = { ...quoteEvent, data: { ...quoteEvent.data, reference } };
      expect((await run(signed(event))).status).toBe(200);
      expect(spy).not.toHaveBeenCalled();
    },
  );

  it("leaves invoice charges to the invoice branch", async () => {
    const invoiceEvent = {
      event: "charge.success",
      data: {
        reference: "OC-INV-123456-1",
        domain: "test",
        metadata: { invoiceNumber: "INV-123456" },
      },
    };
    // The invoice branch stops at the database, before any network call.
    const getDatabase = vi.spyOn(cosmos, "getDatabase").mockImplementation(() => {
      throw new Error("COSMOS_ENDPOINT and COSMOS_KEY must be set");
    });
    try {
      expect((await run(signed(invoiceEvent))).status).toBe(500);
      expect(getDatabase).toHaveBeenCalled();
      expect(spy).not.toHaveBeenCalled();
    } finally {
      getDatabase.mockRestore();
    }
  });
});

// DATA_BACKEND no longer stops the webhook: an invalid value used to answer
// 500 and mail the admin before the quote service was called.
describe("paystack-webhook quote branch and DATA_BACKEND", () => {
  const https = require("https");
  let sent;
  beforeEach(() => {
    Object.assign(process.env, {
      PAYSTACK_SECRET_KEY: SECRET,
      RESEND_API_KEY: "re_test",
      RESEND_TO_EMAIL: "admin@example.com",
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
    vi.unstubAllEnvs();
    for (const key of ["PAYSTACK_SECRET_KEY", "RESEND_API_KEY", "RESEND_TO_EMAIL"])
      delete process.env[key];
  });

  it.each([
    ["unset", ""],
    ["appwrite", "appwrite"],
    ["anything else", "bogus"],
  ])("settles a quote charge when DATA_BACKEND is %s", async (_label, value) => {
    vi.stubEnv("DATA_BACKEND", value);
    const quote = vi.spyOn(quoteService, "handleQuoteCharge").mockResolvedValue({
      state: "success",
    });
    const context = {
      res: null,
      log: Object.assign(vi.fn(), { info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
    };
    await handler(context, signed(quoteEvent));
    expect(context.res.status).toBe(200);
    expect(quote).toHaveBeenCalledWith("Q-2026-0001-1-ABCDEFGH");
    expect(sent).toEqual([]);
  });
});
