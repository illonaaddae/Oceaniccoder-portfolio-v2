// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";

const { createServices, handleQuoteCharge } = await import("./service.js");
const quoteView = await import("../../quote-view/index.js");
const quotePay = await import("../../quote-pay/index.js");

const TOKEN = "a".repeat(43);

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("createServices backend", () => {
  // DATA_BACKEND no longer picks the quote store: unset used to mean Appwrite.
  // Missing Cosmos settings fail in createClient, before any request is sent.
  it.each([
    ["unset", ""],
    ["appwrite", "appwrite"],
    ["anything else", "mongo"],
  ])("uses Cosmos when DATA_BACKEND is %s", (_label, value) => {
    vi.stubEnv("DATA_BACKEND", value);
    // A configured Appwrite must still be ignored: on the old code this key let
    // the Appwrite stores build, so the test failed for the right reason.
    vi.stubEnv("APPWRITE_API_KEY", "test-key");
    vi.stubEnv("COSMOS_ENDPOINT", "");
    vi.stubEnv("COSMOS_KEY", "");
    expect(() => createServices()).toThrow("COSMOS_ENDPOINT and COSMOS_KEY must be set");
  });
});

describe("WRITE_HOLD", () => {
  it("makes createServices throw a 503 before touching any database", () => {
    vi.stubEnv("WRITE_HOLD", "1");
    vi.stubEnv("COSMOS_ENDPOINT", "");
    expect(() => createServices()).toThrow(/paused for maintenance/);
    expect(() => createServices()).toThrow(expect.objectContaining({ status: 503 }));
  });

  it("reaches the client as a 503 from the quote functions", async () => {
    vi.stubEnv("WRITE_HOLD", "1");
    const log = Object.assign(vi.fn(), { error: vi.fn() });

    const view = { log };
    await quoteView.default(view, { query: { token: TOKEN } });
    expect(view.res.status).toBe(503);
    expect(JSON.parse(view.res.body).error).toMatch(/paused for maintenance/);

    const pay = { log };
    await quotePay.default(pay, {
      method: "POST",
      body: { token: TOKEN, method: "card", email: "a@example.com", stageId: "s1" },
    });
    expect(pay.res.status).toBe(503);
    expect(log.error).not.toHaveBeenCalled();
  });

  it("makes createServices throw on an unrecognised value", () => {
    vi.stubEnv("WRITE_HOLD", "true");
    expect(() => createServices()).toThrow(/WRITE_HOLD must be/);
  });

  it("makes a webhook settle fail, so Paystack retries", async () => {
    vi.stubEnv("WRITE_HOLD", "1");
    await expect(handleQuoteCharge("REF-1")).rejects.toMatchObject({ status: 503 });
  });
});
