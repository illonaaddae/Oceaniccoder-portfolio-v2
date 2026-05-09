// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import https from "https";
import querystring from "querystring";

// ── Spy on built-in modules ───────────────────────────────────────────────────
// vi.mock() doesn't intercept CJS require() calls reliably in Node environment.
// vi.spyOn replaces the property on the shared module object, which the CJS
// require() cache also points to — so index.js's https.request call hits the spy.
const mockRequest = vi.spyOn(https, "request");
vi.spyOn(querystring, "stringify").mockImplementation((o) => new URLSearchParams(o).toString());

// Import handler once at module level (no resetModules — would break spies).
const { default: handler } = await import("./index.js");

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Make https.request return the given status + body for the next call. */
function stubHttps(statusCode, body) {
  mockRequest.mockImplementationOnce((_opts, cb) => {
    const res = { statusCode, on: vi.fn() };
    res.on.mockImplementation((event, fn) => {
      if (event === "data") fn(typeof body === "string" ? body : JSON.stringify(body));
      if (event === "end") fn();
    });
    cb(res);
    return { on: vi.fn(), write: vi.fn(), end: vi.fn() };
  });
}

const makeContext = () => ({
  res: null,
  log: { error: vi.fn(), warn: vi.fn() },
});

const validBody = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  meetingType: "discovery",
  preferredDate: "2099-06-15",
  preferredTime: "09:00 AM",
  timezone: "UTC",
  message: "",
  phone: "",
};

/** @type {Record<string, string | undefined>} */
let savedEnv;
beforeEach(() => {
  mockRequest.mockReset();
  savedEnv = {
    APPWRITE_API_KEY: process.env.APPWRITE_API_KEY,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN,
    GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID,
  };
  delete process.env.APPWRITE_API_KEY;
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  delete process.env.GOOGLE_REFRESH_TOKEN;
  delete process.env.GOOGLE_CALENDAR_ID;
});

afterEach(() => {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("create-booking Azure Function", () => {
  it("returns 204 for OPTIONS preflight", async () => {
    const ctx = makeContext();
    await handler(ctx, { method: "OPTIONS", body: null, query: {} });
    expect(ctx.res.status).toBe(204);
  });

  it("returns 400 when required fields are missing", async () => {
    const ctx = makeContext();
    await handler(ctx, { method: "POST", body: { name: "Ada" }, query: {} });
    expect(ctx.res.status).toBe(400);
  });

  it("returns 200 with null links when Google creds are not configured", async () => {
    const ctx = makeContext();
    await handler(ctx, { method: "POST", body: validBody, query: {} });
    const body = JSON.parse(ctx.res.body);
    expect(ctx.res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.meetLink).toBeNull();
    expect(body._phase).toBe("google_unconfigured");
  });

  it("skips Appwrite check and calls OAuth when APPWRITE_API_KEY is not set", async () => {
    process.env.GOOGLE_CLIENT_ID = "fake-client";
    process.env.GOOGLE_CLIENT_SECRET = "fake-secret";
    process.env.GOOGLE_REFRESH_TOKEN = "fake-token";
    process.env.GOOGLE_CALENDAR_ID = "cal@example.com";

    // OAuth token call fails → caught → 200 null. No Appwrite call expected.
    stubHttps(400, JSON.stringify({ error: "invalid_client" }));

    const ctx = makeContext();
    await handler(ctx, { method: "POST", body: validBody, query: {} });

    // Only one https call: OAuth token (no Appwrite query).
    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(ctx.res.status).toBe(200);
  });

  it("returns 409 when Appwrite reports the slot is already taken", async () => {
    process.env.APPWRITE_API_KEY = "test-api-key";
    stubHttps(200, { total: 1, documents: [] });

    const ctx = makeContext();
    await handler(ctx, { method: "POST", body: validBody, query: {} });

    expect(ctx.res.status).toBe(409);
    const body = JSON.parse(ctx.res.body);
    expect(body.error).toBe("slot_taken");
    expect(body.message).toMatch(/09:00 AM/);
  });

  it("returns 200 and proceeds when Appwrite reports slot is free (total: 0)", async () => {
    process.env.APPWRITE_API_KEY = "test-api-key";
    // Appwrite → free; no Google creds → early return with null links.
    stubHttps(200, { total: 0, documents: [] });

    const ctx = makeContext();
    await handler(ctx, { method: "POST", body: validBody, query: {} });

    expect(ctx.res.status).toBe(200);
    expect(JSON.parse(ctx.res.body).success).toBe(true);
  });

  it("proceeds (non-fatal) when Appwrite check returns a server error", async () => {
    process.env.APPWRITE_API_KEY = "test-api-key";
    // Appwrite 500 → isSlotTaken returns false → falls through to Google block.
    stubHttps(500, "Internal Server Error");

    const ctx = makeContext();
    await handler(ctx, { method: "POST", body: validBody, query: {} });

    expect(ctx.res.status).toBe(200);
  });
});
