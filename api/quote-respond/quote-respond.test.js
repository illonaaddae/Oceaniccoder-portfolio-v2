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
  inquiryId: "inq-1",
  items: [{ id: "item-1", description: "Build", qty: 1, unitMinor: 10000 }],
  subtotalMinor: 10000,
  discountMinor: 0,
  totalMinor: 10000,
  schedule: M.DEFAULT_SCHEDULE,
  terms: "Pay on time",
  validUntil: "2026-10-20T00:00:00.000Z",
  payState: { due: {} },
  tokenHash: hashToken(TOKEN),
};

function setup(quote = base) {
  const repo = createFakeRepo({ quotes: [quote] });
  const notify = {
    quoteAccepted: vi.fn().mockResolvedValue({ ok: true }),
    decision: vi.fn().mockResolvedValue({ ok: true }),
  };
  const handler = createHandler({ services: () => ({ repo, notify, now: () => NOW }) });
  const call = async (body) => {
    const context = { log: { error: vi.fn() } };
    await handler(context, {
      method: "POST",
      body: { token: TOKEN, ...body },
      headers: { "x-forwarded-for": "1.2.3.4:555", "user-agent": "Test UA" },
    });
    return { status: context.res.status, body: JSON.parse(context.res.body) };
  };
  return { repo, notify, call };
}

describe("quote-respond accept", () => {
  it("records evidence, emails both sides and marks the inquiry won", async () => {
    const t = setup();
    const r = await t.call({ action: "accept", name: "Kofi Mensah", agree: true });
    expect(r.status).toBe(200);
    expect(r.body.quote).toMatchObject({ status: "accepted", acceptedName: "Kofi Mensah" });
    expect(r.body.quote.stages[0].state).toBe("due");
    const stored = t.repo.quotes.get("q1");
    expect(stored.acceptedIpHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.acceptedUa).toBe("Test UA");
    expect(JSON.parse(stored.acceptedSnapshot)).toMatchObject({
      totalMinor: 10000,
      terms: "Pay on time",
    });
    expect(t.notify.quoteAccepted).toHaveBeenCalledTimes(1);
    expect(t.notify.decision).toHaveBeenCalledWith(expect.anything(), "accepted");
    expect(t.repo.inquiryStatus["inq-1"]).toBe("won");
  });

  it("idempotent accept: a second accept returns the quote without emailing again", async () => {
    const t = setup();
    await t.call({ action: "accept", name: "Kofi Mensah", agree: true });
    const r = await t.call({ action: "accept", name: "Kofi Mensah", agree: true });
    expect(r.status).toBe(200);
    expect(t.notify.quoteAccepted).toHaveBeenCalledTimes(1);
  });

  it("requires a typed name and the agreement box", async () => {
    expect((await setup().call({ action: "accept", name: "Ko", agree: true })).status).toBe(400);
    expect(
      (await setup().call({ action: "accept", name: "Kofi Mensah", agree: false })).status,
    ).toBe(400);
  });

  it("expired: refuses after validUntil and stores the expiry", async () => {
    const t = setup({ ...base, validUntil: "2026-10-09T00:00:00.000Z" });
    const r = await t.call({ action: "accept", name: "Kofi Mensah", agree: true });
    expect(r.status).toBe(409);
    expect(r.body.error).toMatch(/expired/);
    expect(t.repo.quotes.get("q1").status).toBe("expired");
  });
});

describe("quote-respond decline", () => {
  it("stores the reason and alerts the admin", async () => {
    const t = setup();
    const r = await t.call({ action: "decline", reason: "Budget" });
    expect(r.body.quote.status).toBe("declined");
    expect(t.repo.quotes.get("q1").declineReason).toBe("Budget");
    expect(t.notify.decision).toHaveBeenCalledWith(expect.anything(), "declined");
    expect(t.repo.inquiryStatus["inq-1"]).toBe("declined");
  });

  it("can't decline an accepted quote", async () => {
    const t = setup();
    await t.call({ action: "accept", name: "Kofi Mensah", agree: true });
    expect((await t.call({ action: "decline" })).status).toBe(409);
  });

  it("rejects an unknown action and a bad token", async () => {
    expect((await setup().call({ action: "maybe" })).status).toBe(400);
    expect((await setup().call({ action: "accept", token: "bad" })).status).toBe(404);
  });
});
