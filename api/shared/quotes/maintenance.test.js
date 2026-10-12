// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const M = await import("./model.js");
const { sendMaintenanceOffer } = await import("./maintenance.js");
const { createFakeRepo } = await import("./fakes.js");

const draft = (over = {}) => ({
  clientName: "Kofi Mensah",
  clientEmail: "kofi@example.com",
  currency: "GHS",
  title: "Online store",
  items: [{ id: "item-1", description: "Website", qty: 1, unitMinor: 10000 }],
  discountMinor: 0,
  schedule: M.DEFAULT_SCHEDULE,
  validDays: 14,
  ...over,
});

describe("extras.maintenance", () => {
  const base = draft();
  const plan = (over = {}) => ({
    id: "care",
    name: "Care",
    priceMinor: 40000,
    period: "month",
    includes: "Updates\nMonitoring",
    ...over,
  });
  const withM = (maintenance) => M.validateDraft({ ...base, extras: { maintenance } });

  it("parses the free period, plans and note, trims text and drops unknown keys", () => {
    const r = withM({
      freeDays: 30,
      freeText: "  Any defect found is fixed at no cost. ",
      plans: [plan({ name: " Care ", secret: "leak" })],
      note: "Optional.",
      junk: "leak",
    });
    expect(r.ok).toBe(true);
    expect(r.value.extras.maintenance).toEqual({
      freeDays: 30,
      freeText: "Any defect found is fixed at no cost.",
      plans: [
        {
          id: "care",
          name: "Care",
          priceMinor: 40000,
          period: "month",
          includes: "Updates\nMonitoring",
        },
      ],
      note: "Optional.",
    });
  });

  it("is stored only when there is a free period or a plan", () => {
    expect(withM({ freeDays: 0, plans: [], note: "x" }).value.extras).toEqual({});
    expect(withM(null).value.extras).toEqual({});
    expect(withM({ freeDays: 14 }).value.extras.maintenance.plans).toEqual([]);
    expect(withM({ freeDays: 0, plans: [plan()] }).value.extras.maintenance.freeDays).toBe(0);
  });

  it("drops blank plan rows and keys errors by the editor position", () => {
    const r = withM({
      freeDays: 30,
      plans: [{ name: "", priceMinor: 0, includes: "" }, plan({ priceMinor: 0 })],
    });
    expect(r.value.extras.maintenance.plans).toHaveLength(1);
    expect(r.errors["maintenance.plans.1.priceMinor"]).toBeDefined();
  });

  it("checks each limit", () => {
    const L = M.LIMITS;
    expect(withM({ freeDays: 366 }).errors["maintenance.freeDays"]).toBeDefined();
    expect(withM({ freeDays: 1.5 }).errors["maintenance.freeDays"]).toBeDefined();
    expect(withM({ freeDays: -1 }).errors["maintenance.freeDays"]).toBeDefined();
    expect(withM({ freeDays: 365 }).ok).toBe(true);
    expect(
      withM({ freeDays: 30, freeText: "x".repeat(L.maintenanceFreeText + 1) }).errors[
        "maintenance.freeText"
      ],
    ).toBeDefined();
    expect(
      withM({ freeDays: 30, note: "x".repeat(L.maintenanceNote + 1) }).errors["maintenance.note"],
    ).toBeDefined();
    const five = Array.from({ length: 5 }, (_, i) => plan({ id: `p${i}` }));
    expect(withM({ plans: five }).errors["maintenance.plans"]).toBeDefined();
    const bad = withM({
      plans: [
        plan({ name: "" }),
        plan({ name: "x".repeat(L.maintenancePlanName + 1) }),
        plan({ priceMinor: -5 }),
        plan({ priceMinor: 12.5 }),
      ],
    });
    expect(bad.errors["maintenance.plans.0.name"]).toBeDefined();
    expect(bad.errors["maintenance.plans.1.name"]).toBeDefined();
    expect(bad.errors["maintenance.plans.2.priceMinor"]).toBeDefined();
    expect(bad.errors["maintenance.plans.3.priceMinor"]).toBeDefined();
    const more = withM({
      plans: [
        plan({ period: "week" }),
        plan({ includes: "x".repeat(L.maintenancePlanIncludes + 1) }),
      ],
    });
    expect(more.errors["maintenance.plans.0.period"]).toBeDefined();
    expect(more.errors["maintenance.plans.1.includes"]).toBeDefined();
  });

  it("defaults a missing period to month and a bad id to its position", () => {
    const r = withM({ plans: [plan({ id: "Not Valid!", period: undefined })] });
    expect(r.value.extras.maintenance.plans[0]).toMatchObject({ id: "plan-1", period: "month" });
  });

  it("keeps needs and maintenance side by side", () => {
    const r = M.validateDraft({
      ...base,
      extras: {
        needs: { intro: "Send early", groups: [] },
        maintenance: { freeDays: 30, plans: [plan()] },
      },
    });
    expect(Object.keys(r.value.extras).sort()).toEqual(["maintenance", "needs"]);
  });
});

const quote = (over = {}) => ({
  id: "q1",
  status: "accepted",
  quoteNumber: "Q-2026-0001",
  clientName: "Kofi Mensah",
  clientEmail: "kofi@example.com",
  totalMinor: 10000,
  schedule: M.DEFAULT_SCHEDULE,
  payState: { due: { balance: "2026-11-01T00:00:00.000Z" } },
  respondedAt: "2026-10-01T00:00:00.000Z",
  extras: { maintenance: { freeDays: 30, freeText: "", plans: [{ id: "care" }], note: "" } },
  ...over,
});
const paid = (stageId, paidAt) => ({ status: "success", stageId, paidAt });
const allPaid = [
  paid("deposit", "2026-10-02T00:00:00.000Z"),
  paid("balance", "2026-11-10T09:00:00.000Z"),
];

describe("maintenanceOffer", () => {
  const offer = (q, payments = allPaid) => M.maintenanceOffer(q, M.stageStates(q, payments));

  it("is due a week before the free period ends, counted from the last payment", () => {
    expect(offer(quote())).toEqual({
      launchedAt: "2026-11-10T09:00:00.000Z",
      freeDays: 30,
      freeEndsAt: "2026-12-10T09:00:00.000Z",
      dueAt: "2026-12-03T09:00:00.000Z",
      sentAt: null,
    });
  });

  it("is due at launch when the free period is a week or less", () => {
    const q = quote({ extras: { maintenance: { freeDays: 5, plans: [{ id: "care" }] } } });
    expect(offer(q).dueAt).toBe("2026-11-10T09:00:00.000Z");
    const none = quote({ extras: { maintenance: { freeDays: 0, plans: [{ id: "care" }] } } });
    expect(offer(none).dueAt).toBe("2026-11-10T09:00:00.000Z");
  });

  it("carries the sent time", () => {
    const sentAt = "2026-12-03T09:00:00.000Z";
    expect(offer(quote({ maintenanceOfferSentAt: sentAt })).sentAt).toBe(sentAt);
  });

  it("is null until the quote is fully paid, or without plans", () => {
    expect(offer(quote(), [allPaid[0]])).toBeNull();
    expect(offer(quote({ extras: { maintenance: { freeDays: 30, plans: [] } } }))).toBeNull();
    expect(offer(quote({ extras: {} }))).toBeNull();
    expect(offer(quote({ status: "cancelled" }))).toBeNull();
  });
});

describe("sendMaintenanceOffer", () => {
  const NOW = new Date("2026-12-04T08:00:00.000Z");
  const setup = (ok) => {
    const repo = createFakeRepo({ quotes: [quote()] });
    const notify = {
      maintenanceOffer: vi.fn().mockResolvedValue(ok ? { ok } : { ok, error: "x" }),
    };
    return { repo, notify, svc: { repo, notify, now: () => NOW } };
  };

  it("emails the client and records when it went out", async () => {
    const t = setup(true);
    const q = await t.repo.get("q1");
    const r = await sendMaintenanceOffer(t.svc, q, []);
    expect(r.ok).toBe(true);
    expect(t.notify.maintenanceOffer).toHaveBeenCalledWith(q, []);
    expect(t.repo.quotes.get("q1").maintenanceOfferSentAt).toBe(NOW.toISOString());
  });

  it("leaves the quote untouched when the email fails", async () => {
    const t = setup(false);
    const r = await sendMaintenanceOffer(t.svc, await t.repo.get("q1"), []);
    expect(r).toMatchObject({ ok: false, error: "x" });
    expect(t.repo.quotes.get("q1").maintenanceOfferSentAt).toBeUndefined();
  });
});
