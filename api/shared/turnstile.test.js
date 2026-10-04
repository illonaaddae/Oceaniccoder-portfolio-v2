// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { verifyTurnstile, clientIp } = await import("./turnstile.js");

const respond = (body) => vi.fn().mockResolvedValue({ json: async () => body });

describe("verifyTurnstile", () => {
  beforeEach(() => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.TURNSTILE_SECRET_KEY;
  });

  it("fails closed without a secret", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    vi.stubGlobal("fetch", vi.fn());
    expect(await verifyTurnstile("token")).toMatchObject({ ok: false, status: 500 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a missing token without calling Cloudflare", async () => {
    vi.stubGlobal("fetch", vi.fn());
    expect(await verifyTurnstile(undefined)).toMatchObject({ ok: false, status: 400 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends secret, token and IP, and passes on success", async () => {
    vi.stubGlobal("fetch", respond({ success: true }));
    expect(await verifyTurnstile("tok", "1.2.3.4")).toEqual({ ok: true });
    const [, init] = fetch.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({
      secret: "test-secret",
      response: "tok",
      remoteip: "1.2.3.4",
    });
  });

  it("explains an expired or reused token", async () => {
    vi.stubGlobal("fetch", respond({ success: false, "error-codes": ["timeout-or-duplicate"] }));
    const result = await verifyTurnstile("tok");
    expect(result).toMatchObject({ ok: false, status: 403 });
    expect(result.error).toMatch(/expired/);
  });

  it("returns 503 when Cloudflare can't be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    expect(await verifyTurnstile("tok")).toMatchObject({ ok: false, status: 503 });
  });
});

describe("clientIp", () => {
  it.each([
    ["1.2.3.4:5678, 10.0.0.1", "1.2.3.4"],
    ["2001:db8::1", "2001:db8::1"],
    ["", undefined],
  ])("%j → %j", (header, ip) => {
    expect(clientIp({ headers: { "x-forwarded-for": header } })).toBe(ip);
  });
});
