// @vitest-environment node
// Requests whose signature cannot be checked: they are refused like any
// unverified request instead of crashing the handler.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const handler = require("./index.js");

describe("paystack-webhook signature checks", () => {
  beforeEach(() => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test_webhook";
    delete process.env.RESEND_API_KEY; // keep bail() from sending email
  });
  afterEach(() => {
    delete process.env.PAYSTACK_SECRET_KEY;
  });

  const run = async (req) => {
    const context = {
      res: null,
      log: Object.assign(vi.fn(), { info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
    };
    await handler(context, req);
    return context;
  };

  it("refuses a well-formed signature on a request with no body", async () => {
    const { res, log } = await run({
      method: "POST",
      headers: { "x-paystack-signature": "ab".repeat(64) },
    });
    expect(res.status).toBe(200);
    expect(log.error).toHaveBeenCalledWith(expect.stringContaining("no body to verify"));
  });

  it.each([["not-a-signature"], ["ab".repeat(32)], [["ab".repeat(64)]]])(
    "refuses a signature that is not a SHA-512 hex digest: %j",
    async (signature) => {
      const { res, log } = await run({
        method: "POST",
        rawBody: '{"event":"charge.success"}',
        body: { event: "charge.success" },
        headers: { "x-paystack-signature": signature },
      });
      expect(res.status).toBe(200);
      expect(log.error).toHaveBeenCalledWith(
        expect.stringContaining("signature verification failed"),
      );
    },
  );
});
