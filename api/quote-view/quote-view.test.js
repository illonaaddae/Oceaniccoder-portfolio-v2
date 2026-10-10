// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { createHandler } = await import("./index.js");
const { createFakeRepo } = await import("../shared/quotes/fakes.js");
const { hashToken, newToken } = await import("../shared/tokens.js");
const M = await import("../shared/quotes/model.js");

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

function setup(quote = base) {
  const repo = createFakeRepo({ quotes: [quote] });
  const handler = createHandler({ services: () => ({ repo, now: () => NOW }) });
  const call = async (query) => {
    const context = { log: { error: vi.fn() } };
    await handler(context, { method: "GET", query });
    return { status: context.res.status, body: JSON.parse(context.res.body) };
  };
  return { repo, call };
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
});
