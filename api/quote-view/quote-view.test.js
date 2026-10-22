// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { createHandler } = await import("./index.js");
const { createFakeRepo, createFakeLocks } = await import("../shared/quotes/fakes.js");
const { hashToken, newToken } = await import("../shared/tokens.js");
const M = await import("../shared/quotes/model.js");
const A = await import("../shared/quotes/access.js");

const SECRET = "v".repeat(40);
const ENV = { QUOTE_ACCESS_SECRET: SECRET };
const TOKEN = newToken();
const NOW = new Date("2026-10-10T09:00:00.000Z");
const base = {
  id: "q1",
  quoteNumber: "Q-2026-0001",
  revision: 1,
  status: "sent",
  currency: "GHS",
  title: "Store",
  clientName: "Kofi",
  clientEmail: "kofi@example.com",
  items: [{ id: "item-1", description: "Build", qty: 1, unitMinor: 10000 }],
  subtotalMinor: 10000,
  discountMinor: 0,
  totalMinor: 10000,
  schedule: M.DEFAULT_SCHEDULE,
  validUntil: "2026-10-20T00:00:00.000Z",
  payState: { due: {} },
  tokenHash: hashToken(TOKEN),
};

// The unlock cookie a browser holds after a code or link code.
const unlocked = (quote = base) => A.sessionCookie(SECRET, quote, 0, NOW.getTime()).split(";")[0];

function setup(quote = base, { env = ENV, admin = false } = {}) {
  const repo = createFakeRepo({ quotes: [quote] });
  const requireAdmin = vi.fn(async () =>
    admin ? { user: { email: "owner@oceaniccoder.dev" } } : { status: 401, error: "Sign in" },
  );
  const handler = createHandler({
    env,
    requireAdmin,
    services: () => ({ repo, locks: createFakeLocks(), now: () => NOW }),
  });
  const call = async (query, { cookie = unlocked(quote) } = {}) => {
    const context = { log: { error: vi.fn() } };
    await handler(context, { method: "GET", query, headers: cookie ? { cookie } : {} });
    return { status: context.res.status, body: JSON.parse(context.res.body), context };
  };
  return { repo, requireAdmin, call };
}

describe("quote-view", () => {
  it("returns the client view and records the first view", async () => {
    const t = setup();
    const r = await t.call({ token: TOKEN });
    expect(r.status).toBe(200);
    expect(r.body.quote).toMatchObject({ quoteNumber: "Q-2026-0001", status: "sent" });
    expect(JSON.stringify(r.body)).not.toContain(base.tokenHash);
    expect(t.repo.quotes.get("q1").viewedAt).toBe(NOW.toISOString());
  });

  it("does not record a view for the admin preview", async () => {
    const t = setup();
    await t.call({ token: TOKEN, preview: "1" });
    expect(t.repo.quotes.get("q1").viewedAt).toBeUndefined();
  });

  it.each([{ token: "bad" }, { token: newToken() }, {}])("treats %j as inactive", async (query) => {
    const r = await setup().call(query);
    expect(r).toMatchObject({ status: 404, body: { inactive: true } });
  });

  it("treats drafts and cancelled quotes as inactive", async () => {
    expect((await setup({ ...base, status: "draft" }).call({ token: TOKEN })).status).toBe(404);
    expect((await setup({ ...base, status: "cancelled" }).call({ token: TOKEN })).status).toBe(404);
  });

  it("old token after revise is inactive", async () => {
    const t = setup();
    await t.repo.update("q1", { status: "draft", tokenHash: null });
    expect((await t.call({ token: TOKEN })).status).toBe(404);
  });

  it("flips a sent quote past its validity to expired", async () => {
    const t = setup({ ...base, validUntil: "2026-10-09T00:00:00.000Z" });
    const r = await t.call({ token: TOKEN });
    expect(r.body.quote.status).toBe("expired");
    expect(t.repo.quotes.get("q1").status).toBe("expired");
  });

  describe("access gate", () => {
    it("answers 401 locked with nothing from the quote and records no view", async () => {
      const t = setup();
      const r = await t.call({ token: TOKEN }, { cookie: null });
      expect(r.status).toBe(401);
      expect(r.body).toEqual({ locked: true, error: expect.any(String) });
      expect(t.repo.quotes.get("q1").viewedAt).toBeUndefined();
      expect(t.requireAdmin).not.toHaveBeenCalled();
    });

    it("refuses a cookie for another revision", async () => {
      const t = setup();
      const old = unlocked({ ...base, revision: 0 });
      expect((await t.call({ token: TOKEN }, { cookie: old })).status).toBe(401);
    });

    it("lets preview=1 bypass nothing", async () => {
      const t = setup(base, { admin: true });
      const r = await t.call({ token: TOKEN, preview: "1" }, { cookie: null });
      expect(r.status).toBe(401);
      expect(t.requireAdmin).not.toHaveBeenCalled();
    });

    it("shows the admin preview without a cookie or a recorded view", async () => {
      const t = setup(base, { admin: true });
      const r = await t.call({ token: TOKEN, preview: "1", admin: "1" }, { cookie: null });
      expect(r.status).toBe(200);
      expect(r.body.quote.quoteNumber).toBe("Q-2026-0001");
      expect(r.context.res.headers["Set-Cookie"]).toBeUndefined();
      expect(t.repo.quotes.get("q1").viewedAt).toBeUndefined();
    });

    it("does not record a view for an admin preview even without preview=1", async () => {
      const t = setup(base, { admin: true });
      expect((await t.call({ token: TOKEN, admin: "1" }, { cookie: null })).status).toBe(200);
      expect(t.repo.quotes.get("q1").viewedAt).toBeUndefined();
    });

    it("stays locked when the admin check fails", async () => {
      const t = setup();
      const r = await t.call({ token: TOKEN, admin: "1" }, { cookie: null });
      expect(r).toMatchObject({ status: 401, body: { locked: true } });
      expect(t.requireAdmin).toHaveBeenCalledTimes(1);
    });

    it("skips the admin check when the browser is unlocked", async () => {
      const t = setup(base, { admin: true });
      expect((await t.call({ token: TOKEN, admin: "1" })).status).toBe(200);
      expect(t.requireAdmin).not.toHaveBeenCalled();
    });

    it("opens without a cookie when the gate is switched off", async () => {
      const t = setup(base, { env: { QUOTE_ACCESS_GATE: "off" } });
      expect((await t.call({ token: TOKEN }, { cookie: null })).status).toBe(200);
    });

    it("answers 503 without the secret", async () => {
      const r = await setup(base, { env: {} }).call({ token: TOKEN }, { cookie: null });
      expect(r.status).toBe(503);
      expect(r.body.quote).toBeUndefined();
    });

    it("leaves an expired quote alone until it is unlocked", async () => {
      const t = setup({ ...base, validUntil: "2026-10-09T00:00:00.000Z" });
      expect((await t.call({ token: TOKEN }, { cookie: null })).status).toBe(401);
      expect(t.repo.quotes.get("q1").status).toBe("sent");
    });
  });
});
