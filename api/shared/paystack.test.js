// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const P = await import("./paystack.js");

describe("paystack", () => {
  beforeEach(() => (process.env.PAYSTACK_SECRET_KEY = "sk_test_x"));
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.PAYSTACK_SECRET_KEY;
  });

  it("initialises with the amount and channels from the server", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: true,
          data: {
            access_code: "AC",
            authorization_url: "https://checkout.paystack.com/AC",
            reference: "R",
          },
        }),
      }),
    );
    const r = await P.initializeTransaction({
      email: "a@b.co",
      amountMinor: 6000,
      currency: "GHS",
      reference: "R",
      channels: ["card"],
      callbackUrl: "https://x/cb",
      metadata: { kind: "quote" },
    });
    expect(r).toEqual({
      accessCode: "AC",
      authorizationUrl: "https://checkout.paystack.com/AC",
      reference: "R",
    });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://api.paystack.co/transaction/initialize");
    expect(init.headers.Authorization).toBe("Bearer sk_test_x");
    expect(JSON.parse(init.body)).toMatchObject({
      amount: 6000,
      currency: "GHS",
      channels: ["card"],
      callback_url: "https://x/cb",
    });
  });

  it("throws with the HTTP status on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ status: false, message: "Transaction reference not found" }),
      }),
    );
    await expect(P.verifyTransaction("R")).rejects.toMatchObject({
      status: 404,
      message: "Transaction reference not found",
    });
  });

  it("refuses to run without a secret key", async () => {
    delete process.env.PAYSTACK_SECRET_KEY;
    await expect(P.verifyTransaction("R")).rejects.toThrow(/PAYSTACK_SECRET_KEY/);
  });

  it("passes a timeout signal and surfaces an abort as a thrown error", async () => {
    const abort = Object.assign(new Error("The operation was aborted"), { name: "AbortError" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abort));
    await expect(P.verifyTransaction("R")).rejects.toMatchObject({ name: "AbortError" });
    const [, init] = fetch.mock.calls[0];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});
