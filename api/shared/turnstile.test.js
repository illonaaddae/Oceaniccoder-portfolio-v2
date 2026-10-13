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
    ["1.2.3.4:5678", "1.2.3.4"],
    ["1.2.3.4:5678, 10.0.0.1", "1.2.3.4"],
    ["2001:db8::1", "2001:db8::1"],
    ["[2001:db8::1]:443", "2001:db8::1"],
    ["[2001:db8::1]", "2001:db8::1"],
    ["[::ffff:1.2.3.4]:80, 10.0.0.1", "::ffff:1.2.3.4"],
    // A forged left-most entry is ignored; the platform's appended one wins.
    ["8.8.8.8, 203.0.113.7:51234", "203.0.113.7"],
    ["1.1.1.1, 9.9.9.9, [2001:db8::1]:443", "2001:db8::1"],
    // An internal hop after the client is skipped.
    ["203.0.113.7, 10.0.0.4", "203.0.113.7"],
    ["203.0.113.7, 172.16.0.2, fd00::1", "203.0.113.7"],
    ["10.0.0.4", "10.0.0.4"],
    ["", undefined],
  ])("%j → %j", (header, ip) => {
    expect(clientIp({ headers: { "x-forwarded-for": header } })).toBe(ip);
  });

  it("returns undefined without the header", () => {
    expect(clientIp({ headers: {} })).toBeUndefined();
    expect(clientIp({})).toBeUndefined();
  });

  // /api/submit sends verifyTurnstile(token, clientIp(req)).
  it("sends Cloudflare the platform-seen IP however the client spoofs the header", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
    vi.stubGlobal("fetch", respond({ success: true }));
    try {
      for (const forged of ["6.6.6.6", "1.1.1.1, 2.2.2.2"]) {
        const req = { headers: { "x-forwarded-for": `${forged}, 203.0.113.7:443` } };
        await verifyTurnstile("tok", clientIp(req));
      }
      const sent = fetch.mock.calls.map(([, init]) => JSON.parse(init.body).remoteip);
      expect(sent).toEqual(["203.0.113.7", "203.0.113.7"]);
    } finally {
      vi.unstubAllGlobals();
      delete process.env.TURNSTILE_SECRET_KEY;
    }
  });
});
