// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { createHandler } = await import("./index.js");
const { createFakeRepo, createFakeLocks } = await import("../shared/quotes/fakes.js");
const M = await import("../shared/quotes/model.js");

const NOW = new Date("2026-10-10T09:00:00.000Z");
const draft = {
  clientName: "Kofi Mensah",
  clientEmail: "kofi@example.com",
  currency: "GHS",
  title: "Online store",
  items: [{ id: "item-1", description: "Store build", qty: 1, unitMinor: 1000000 }],
  discountMinor: 0,
  schedule: M.DEFAULT_SCHEDULE,
  validDays: 14,
  inquiryId: "inq-1",
};

function setup({ admin = true, quotes = [], payments = [] } = {}) {
  const repo = createFakeRepo({ quotes, payments });
  const locks = createFakeLocks();
  const notify = {
    quoteSent: vi.fn().mockResolvedValue({ ok: true }),
    paymentRequest: vi.fn().mockResolvedValue({ ok: true }),
    paymentReceived: vi.fn().mockResolvedValue({ ok: true }),
  };
  const handler = createHandler({
    requireAdmin: async () =>
      admin ? { user: { email: "illona@oceaniccoder.dev" } } : { status: 401, error: "Sign in" },
    services: () => ({ repo, locks, notify, now: () => NOW }),
  });
  const call = async (body) => {
    const context = { log: { error: vi.fn(), info: vi.fn() } };
    await handler(context, { method: "POST", body, headers: {} });
    return { status: context.res.status, body: JSON.parse(context.res.body) };
  };
  return { repo, locks, notify, call };
}

async function sentQuote(t) {
  const created = await t.call({ action: "create", draft });
  const sent = await t.call({ action: "send", id: created.body.quote.id });
  return sent;
}

describe("quote-admin", () => {
  it("refuses callers who are not the admin", async () => {
    expect((await setup({ admin: false }).call({ action: "list" })).status).toBe(401);
  });

  it("rejects unknown actions", async () => {
    expect((await setup().call({ action: "explode" })).status).toBe(400);
  });

  it("creates a draft with server-computed totals", async () => {
    const r = await setup().call({ action: "create", draft: { ...draft, totalMinor: 1 } });
    expect(r.status).toBe(200);
    expect(r.body.quote).toMatchObject({
      status: "draft",
      revision: 1,
      totalMinor: 1000000,
      quoteNumber: "Q-2026-0001",
    });
    expect(r.body.stages.map((s) => s.amountMinor)).toEqual([600000, 400000]);
  });

  it("returns field errors for a bad draft", async () => {
    const r = await setup().call({
      action: "create",
      draft: { ...draft, schedule: [{ id: "a", label: "A", percent: 50 }] },
    });
    expect(r.status).toBe(400);
    expect(r.body.fields.schedule).toMatch(/100%/);
  });

  it("sends: issues a link, sets validity, marks the inquiry quoted and emails the client", async () => {
    const t = setup();
    const r = await sentQuote(t);
    expect(r.status).toBe(200);
    expect(r.body.link).toMatch(/^https:\/\/oceaniccoder\.dev\/q\/[A-Za-z0-9_-]{43}$/);
    expect(r.body.quote).toMatchObject({
      status: "sent",
      hasLink: true,
      validUntil: "2026-10-24T09:00:00.000Z",
    });
    expect(r.body.quote).not.toHaveProperty("tokenHash");
    expect(t.repo.inquiryStatus["inq-1"]).toBe("quoted");
    expect(t.notify.quoteSent).toHaveBeenCalledTimes(1);
    expect(r.body.emailed).toBe(true);
  });

  it("only edits drafts", async () => {
    const t = setup();
    const sent = await sentQuote(t);
    expect((await t.call({ action: "save", id: sent.body.quote.id, draft })).status).toBe(409);
  });

  it("revise returns to draft, bumps the revision and kills the link", async () => {
    const t = setup();
    const sent = await sentQuote(t);
    const r = await t.call({ action: "revise", id: sent.body.quote.id });
    expect(r.body.quote).toMatchObject({ status: "draft", revision: 2, hasLink: false });
  });

  it("will not cancel a quote with a successful payment", async () => {
    const t = setup();
    const sent = await sentQuote(t);
    const id = sent.body.quote.id;
    await t.repo.update(id, { status: "accepted", respondedAt: NOW.toISOString() });
    await t.repo.createPayment({
      kind: "quote",
      quoteNumber: "Q-2026-0001",
      stageId: "deposit",
      status: "success",
    });
    expect((await t.call({ action: "cancel", id })).status).toBe(409);
  });

  it("requests a later stage: marks it due, rotates the link and emails the invoice", async () => {
    const t = setup();
    const sent = await sentQuote(t);
    const id = sent.body.quote.id;
    await t.repo.update(id, { status: "accepted", respondedAt: NOW.toISOString() });
    expect((await t.call({ action: "requestStage", id, stageId: "deposit" })).status).toBe(409);
    const r = await t.call({ action: "requestStage", id, stageId: "balance" });
    expect(r.status).toBe(200);
    expect(r.body.stages[1].state).toBe("due");
    expect(r.body.link).not.toBe(sent.body.link);
    expect(t.notify.paymentRequest).toHaveBeenCalledTimes(1);
  });

  it("records a manual payment once per stage", async () => {
    const t = setup();
    const sent = await sentQuote(t);
    const id = sent.body.quote.id;
    await t.repo.update(id, { status: "accepted", respondedAt: NOW.toISOString() });
    const r = await t.call({
      action: "recordManual",
      id,
      stageId: "deposit",
      method: "bank",
      note: "GCB transfer",
    });
    expect(r.status).toBe(200);
    expect(r.body.stages[0].state).toBe("paid");
    expect(r.body.payments[0]).toMatchObject({
      method: "bank",
      status: "success",
      recordedBy: "illona@oceaniccoder.dev",
      amountMinor: 600000,
    });
    expect(t.notify.paymentReceived).toHaveBeenCalledTimes(1);
    expect(
      (await t.call({ action: "recordManual", id, stageId: "deposit", method: "bank" })).status,
    ).toBe(409);
    expect(
      (await t.call({ action: "recordManual", id, stageId: "balance", method: "card" })).status,
    ).toBe(400);
  });

  it("lists quotes with amounts paid", async () => {
    const t = setup();
    const sent = await sentQuote(t);
    await t.repo.update(sent.body.quote.id, { status: "accepted", respondedAt: NOW.toISOString() });
    await t.repo.createPayment({
      kind: "quote",
      quoteNumber: "Q-2026-0001",
      stageId: "deposit",
      status: "success",
    });
    const r = await t.call({ action: "list" });
    expect(r.body.quotes[0]).toMatchObject({
      quoteNumber: "Q-2026-0001",
      paidMinor: 600000,
      nextDue: null,
    });
  });
});
