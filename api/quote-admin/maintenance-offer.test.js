// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { createHandler } = await import("./index.js");
const { createFakeRepo, createFakeLocks } = await import("../shared/quotes/fakes.js");
const M = await import("../shared/quotes/model.js");

const NOW = new Date("2026-12-04T08:00:00.000Z");

const plans = [
  { id: "care", name: "Care", priceMinor: 40000, period: "month", includes: "Updates" },
];
const quote = (over = {}) => ({
  id: "q1",
  quoteNumber: "Q-2026-0001",
  revision: 1,
  status: "accepted",
  currency: "GHS",
  title: "Store",
  clientName: "Kofi Mensah",
  clientEmail: "kofi@example.com",
  items: [{ id: "item-1", description: "Build", qty: 1, unitMinor: 10000 }],
  subtotalMinor: 10000,
  discountMinor: 0,
  totalMinor: 10000,
  schedule: M.DEFAULT_SCHEDULE,
  respondedAt: "2026-10-01T00:00:00.000Z",
  payState: { due: { balance: "2026-11-01T00:00:00.000Z" } },
  extras: { maintenance: { freeDays: 30, freeText: "", plans, note: "" } },
  ...over,
});
const payment = (id, stageId, paidAt) => ({
  id,
  kind: "quote",
  quoteNumber: "Q-2026-0001",
  stageId,
  status: "success",
  amountMinor: stageId === "deposit" ? 6000 : 4000,
  paidAt,
});
const allPaid = [
  payment("p1", "deposit", "2026-10-02T00:00:00.000Z"),
  payment("p2", "balance", "2026-11-10T09:00:00.000Z"),
];

function setup({ quotes = [quote()], payments = allPaid, mailOk = true } = {}) {
  const repo = createFakeRepo({ quotes, payments });
  const notify = {
    maintenanceOffer: vi.fn().mockResolvedValue(mailOk ? { ok: true } : { ok: false, error: "x" }),
  };
  const handler = createHandler({
    requireAdmin: async () => ({ user: { email: "illona@oceaniccoder.dev" } }),
    services: () => ({ repo, locks: createFakeLocks(), notify, now: () => NOW }),
  });
  const call = async (body) => {
    const context = { log: { error: vi.fn(), info: vi.fn() } };
    await handler(context, { method: "POST", body, headers: {} });
    return { status: context.res.status, body: JSON.parse(context.res.body) };
  };
  return { repo, notify, call };
}

describe("quote-admin sendMaintenanceOffer", () => {
  it("emails the client, records the time and returns the offer state", async () => {
    const t = setup();
    const r = await t.call({ action: "sendMaintenanceOffer", id: "q1" });
    expect(r.status).toBe(200);
    expect(t.notify.maintenanceOffer).toHaveBeenCalledTimes(1);
    expect(t.repo.quotes.get("q1").maintenanceOfferSentAt).toBe(NOW.toISOString());
    expect(r.body.quote.maintenanceOfferSentAt).toBe(NOW.toISOString());
    expect(r.body.maintenance).toEqual({
      launchedAt: "2026-11-10T09:00:00.000Z",
      dueAt: "2026-12-03T09:00:00.000Z",
      sentAt: NOW.toISOString(),
    });
    expect(r.body.emailed).toBe(true);
  });

  it("refuses a second send unless resend is set", async () => {
    const t = setup({ quotes: [quote({ maintenanceOfferSentAt: "2026-12-03T09:00:00.000Z" })] });
    const again = await t.call({ action: "sendMaintenanceOffer", id: "q1" });
    expect(again.status).toBe(409);
    expect(again.body.error).toMatch(/already sent on 3 Dec 2026/);
    expect(t.notify.maintenanceOffer).not.toHaveBeenCalled();
    const resend = await t.call({ action: "sendMaintenanceOffer", id: "q1", resend: true });
    expect(resend.status).toBe(200);
    expect(t.repo.quotes.get("q1").maintenanceOfferSentAt).toBe(NOW.toISOString());
  });

  it.each([
    ["not fully paid", { payments: [allPaid[0]] }],
    [
      "without plans",
      { quotes: [quote({ extras: { maintenance: { freeDays: 30, plans: [] } } })] },
    ],
    ["without a maintenance section", { quotes: [quote({ extras: {} })] }],
    ["not accepted", { quotes: [quote({ status: "sent" })] }],
  ])("refuses a quote %s", async (_label, opts) => {
    const t = setup(opts);
    const r = await t.call({ action: "sendMaintenanceOffer", id: "q1" });
    expect(r.status).toBe(409);
    expect(t.notify.maintenanceOffer).not.toHaveBeenCalled();
  });

  it("does not record a send when the email fails", async () => {
    const t = setup({ mailOk: false });
    const r = await t.call({ action: "sendMaintenanceOffer", id: "q1" });
    expect(r.status).toBe(502);
    expect(t.repo.quotes.get("q1").maintenanceOfferSentAt).toBeUndefined();
  });

  it("needs a client email", async () => {
    const t = setup({ quotes: [quote({ clientEmail: "" })] });
    expect((await t.call({ action: "sendMaintenanceOffer", id: "q1" })).status).toBe(400);
  });

  it("includes the offer state in every quote detail", async () => {
    const t = setup();
    const r = await t.call({ action: "get", id: "q1" });
    expect(r.body.maintenance).toMatchObject({ dueAt: "2026-12-03T09:00:00.000Z", sentAt: null });
    const unpaid = setup({ payments: [] });
    expect((await unpaid.call({ action: "get", id: "q1" })).body.maintenance).toBeNull();
  });
});
