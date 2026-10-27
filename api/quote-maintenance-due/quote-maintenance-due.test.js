// @vitest-environment node
import { createRequire } from "module";
import { describe, it, expect, vi } from "vitest";

const { createHandler } = await import("./index.js");
const { createFakeRepo, createFakeLocks } = await import("../shared/quotes/fakes.js");
const M = await import("../shared/quotes/model.js");
const { createFakeCosmos } = await import("../shared/fakeCosmos.js");
const { createCosmosInvoiceStore } = await import("../shared/invoices/store.cosmos.js");
// The CommonJS instance the handler requires: a scheme can be created once.
const { invoiceAccess } = createRequire(import.meta.url)("../shared/invoices/access.js");

const SECRET = "cron-secret-value";
const plans = [{ id: "care", name: "Care", priceMinor: 40000, period: "month", includes: "" }];

// Each quote gets its own number; the balance is paid at `launch`.
function quote(n, over = {}) {
  return {
    id: `q${n}`,
    quoteNumber: `Q-2026-000${n}`,
    status: "accepted",
    currency: "GHS",
    title: `Project ${n}`,
    clientName: "Kofi Mensah",
    clientEmail: `client${n}@example.com`,
    totalMinor: 10000,
    schedule: M.DEFAULT_SCHEDULE,
    respondedAt: "2026-10-01T00:00:00.000Z",
    payState: { due: { balance: "2026-11-01T00:00:00.000Z" } },
    extras: { maintenance: { freeDays: 30, freeText: "", plans, note: "" } },
    ...over,
  };
}
function paidStages(n, launch) {
  return [
    {
      id: `p${n}a`,
      kind: "quote",
      quoteNumber: `Q-2026-000${n}`,
      stageId: "deposit",
      status: "success",
      paidAt: "2026-10-02T00:00:00.000Z",
    },
    {
      id: `p${n}b`,
      kind: "quote",
      quoteNumber: `Q-2026-000${n}`,
      stageId: "balance",
      status: "success",
      paidAt: launch,
    },
  ];
}

function setup({
  quotes,
  payments,
  secret = SECRET,
  now = "2026-12-04T08:00:00.000Z",
  locks = createFakeLocks({ now: () => Date.parse(now) - 2 * 24 * 3600 * 1000 }),
  invoiceRows = [],
} = {}) {
  const repo = createFakeRepo({ quotes, payments });
  const db = createFakeCosmos();
  for (const row of invoiceRows) db.container("invoices").seed(row);
  const invoices = createCosmosInvoiceStore(db);
  const notify = { maintenanceOffer: vi.fn().mockResolvedValue({ ok: true }) };
  const handler = createHandler({
    secret: () => secret,
    services: () => ({ repo, invoices, locks, notify, now: () => new Date(now) }),
  });
  const call = async ({ key = SECRET, method = "POST" } = {}) => {
    const context = { log: { error: vi.fn() } };
    await handler(context, { method, headers: key == null ? {} : { "x-cron-key": key } });
    return { status: context.res.status, body: JSON.parse(context.res.body), context };
  };
  return { repo, locks, notify, call };
}

describe("quote-maintenance-due", () => {
  it("answers 503 when CRON_SECRET is not set", async () => {
    const r = await setup({ quotes: [], secret: "" }).call();
    expect(r.status).toBe(503);
  });

  it.each([[null], [""], ["wrong"], [`${SECRET}x`]])("answers 401 for key %j", async (key) => {
    const t = setup({ quotes: [quote(1)], payments: paidStages(1, "2026-11-10T09:00:00.000Z") });
    const r = await t.call({ key });
    expect(r.status).toBe(401);
    expect(t.notify.maintenanceOffer).not.toHaveBeenCalled();
  });

  it("only accepts POST", async () => {
    expect((await setup({ quotes: [] }).call({ method: "GET" })).status).toBe(405);
  });

  it("sends offers that are due and skips ones that are not due yet or already sent", async () => {
    const t = setup({
      quotes: [
        quote(1), // launched 10 Nov, due 3 Dec: sent
        quote(2), // launched 20 Nov, due 13 Dec: not yet
        quote(3, { maintenanceOfferSentAt: "2026-12-03T08:00:00.000Z" }),
        quote(4, { extras: { maintenance: { freeDays: 30, plans: [] } } }), // no plans
        quote(5), // deposit only: not completed
      ],
      payments: [
        ...paidStages(1, "2026-11-10T09:00:00.000Z"),
        ...paidStages(2, "2026-11-20T09:00:00.000Z"),
        ...paidStages(3, "2026-11-10T09:00:00.000Z"),
        ...paidStages(4, "2026-11-10T09:00:00.000Z"),
        paidStages(5, "2026-11-10T09:00:00.000Z")[0],
      ],
    });
    const r = await t.call();
    expect(r).toMatchObject({ status: 200, body: { sent: 1, failed: 0 } });
    expect(t.notify.maintenanceOffer).toHaveBeenCalledTimes(1);
    expect(t.notify.maintenanceOffer.mock.calls[0][0].id).toBe("q1");
    expect(t.repo.quotes.get("q1").maintenanceOfferSentAt).toBe("2026-12-04T08:00:00.000Z");
    expect(t.repo.quotes.get("q2").maintenanceOfferSentAt).toBeUndefined();
    expect(t.repo.quotes.get("q3").maintenanceOfferSentAt).toBe("2026-12-03T08:00:00.000Z");

    // Run again: nothing left to send.
    expect((await t.call()).body).toEqual({
      sent: 0,
      failed: 0,
      pruned: { deleted: 0, kept: 0, skipped: 0 },
    });
  });

  it("is due exactly at launch + freeDays - 7", async () => {
    const opts = { quotes: [quote(1)], payments: paidStages(1, "2026-11-10T09:00:00.000Z") };
    const before = setup({ ...opts, now: "2026-12-03T08:59:59.000Z" });
    expect((await before.call()).body.sent).toBe(0);
    const at = setup({ ...opts, now: "2026-12-03T09:00:00.000Z" });
    expect((await at.call()).body.sent).toBe(1);
  });

  it("keeps going when one quote fails", async () => {
    const t = setup({
      quotes: [quote(1), quote(2), quote(3)],
      payments: [
        ...paidStages(1, "2026-11-01T09:00:00.000Z"),
        ...paidStages(2, "2026-11-01T09:00:00.000Z"),
        ...paidStages(3, "2026-11-01T09:00:00.000Z"),
      ],
    });
    t.notify.maintenanceOffer.mockImplementation(async (q) => {
      if (q.id === "q2") return { ok: false, error: "Resend said no" };
      if (q.id === "q3") throw new Error("boom");
      return { ok: true };
    });
    const r = await t.call();
    expect(r.body).toMatchObject({ sent: 1, failed: 2 });
    expect(t.repo.quotes.get("q1").maintenanceOfferSentAt).toBeTruthy();
    expect(t.repo.quotes.get("q2").maintenanceOfferSentAt).toBeUndefined();
    expect(t.repo.quotes.get("q3").maintenanceOfferSentAt).toBeUndefined();
    expect(r.context.log.error).toHaveBeenCalled();
  });

  it("deletes quote-access lock rows past their retention in the same run", async () => {
    const t = setup({ quotes: [] });
    await t.locks.take("qa:try:cid:1");
    await t.locks.take("settle:REF-1");
    const r = await t.call();
    expect(r.body).toEqual({ sent: 0, failed: 0, pruned: { deleted: 1, kept: 0, skipped: 1 } });
    expect([...t.locks.held]).toEqual(["settle:REF-1"]);
  });

  it("prunes invoice access rows in the same pass, keeping live miss rows", async () => {
    const invoice = { id: "inv-1", invoiceNumber: "INV-2026-0008", clientEmail: "a@x.dev" };
    const t = setup({ quotes: [], invoiceRows: [invoice] });
    t.locks.listBefore = vi.fn(t.locks.listBefore);
    await invoiceAccess.recordMiss(t.locks, invoice, 0); // superseded by the reset below
    await invoiceAccess.bumpEpoch(t.locks, invoice); // never deleted
    await invoiceAccess.recordMiss(t.locks, invoice, 1); // live
    await invoiceAccess.recordMiss(t.locks, { ...invoice, id: "inv-gone" }, 0); // invoice deleted
    await invoiceAccess.takeTry(t.locks, "cid");
    await t.locks.take("qa:try:cid:1");
    await t.locks.take("settle:REF-1");
    const r = await t.call();
    expect(r.body.pruned).toEqual({ deleted: 4, kept: 2, skipped: 1 });
    expect(t.locks.listBefore).toHaveBeenCalledTimes(1);
    expect([...t.locks.held].sort()).toEqual([
      "ia:epoch:inv-1:0:1",
      "ia:miss:inv-1:0:1:1",
      "settle:REF-1",
    ]);
  });

  it.each([
    ["no CRON_SECRET", { secret: "" }, {}],
    ["a wrong key", {}, { key: "wrong" }],
    ["a GET", {}, { method: "GET" }],
  ])("never cleans up on %s", async (_name, options, request) => {
    const t = setup({ quotes: [], ...options });
    await t.locks.take("qa:try:cid:1");
    t.locks.listBefore = vi.fn(t.locks.listBefore);
    expect((await t.call(request)).status).not.toBe(200);
    expect(t.locks.listBefore).not.toHaveBeenCalled();
    expect(t.locks.held.has("qa:try:cid:1")).toBe(true);
  });

  it("still answers when the clean-up fails, and logs it", async () => {
    const locks = createFakeLocks();
    locks.listBefore = async () => {
      throw new Error("locks down");
    };
    const r = await setup({ quotes: [], locks }).call();
    expect(r).toMatchObject({ status: 200, body: { sent: 0, failed: 0, pruned: null } });
    expect(r.context.log.error.mock.calls[0][0]).toContain("lock clean-up: Error: locks down");
  });
});
