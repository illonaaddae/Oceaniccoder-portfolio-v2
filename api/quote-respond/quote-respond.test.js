// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { createHandler } = await import("./index.js");
const { createFakeRepo, createFakeLocks } = await import("../shared/quotes/fakes.js");
const { hashToken, newToken } = await import("../shared/tokens.js");
const M = await import("../shared/quotes/model.js");
const A = await import("../shared/quotes/access.js");

const SECRET = "r".repeat(40);
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

// The unlock cookie a browser holds after a code or link code.
const unlocked = (quote = base) => A.sessionCookie(SECRET, quote, 0, NOW.getTime()).split(";")[0];

function setup(
  quote = base,
  { notify: notifyOverride, env = { QUOTE_ACCESS_SECRET: SECRET } } = {},
) {
  const repo = createFakeRepo({ quotes: [quote] });
  const notify = {
    quoteAccepted: vi.fn().mockResolvedValue({ ok: true }),
    decision: vi.fn().mockResolvedValue({ ok: true }),
    ...notifyOverride,
  };
  const locks = createFakeLocks();
  const handler = createHandler({
    env,
    services: () => ({ repo, notify, locks, now: () => NOW }),
  });
  const call = async (body, { cookie = unlocked(quote) } = {}) => {
    const context = { log: { error: vi.fn(), warn: vi.fn() } };
    await handler(context, {
      method: "POST",
      body: { token: TOKEN, ...body },
      headers: {
        "x-forwarded-for": "1.2.3.4:555",
        "user-agent": "Test UA",
        ...(cookie ? { cookie } : {}),
      },
    });
    return { status: context.res.status, body: JSON.parse(context.res.body), context };
  };
  return { repo, notify, locks, call };
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

describe("quote-respond double submits and races", () => {
  it("two parallel accepts: both 200, one write, one acceptance email", async () => {
    const t = setup();
    const [a, b] = await Promise.all([
      t.call({ action: "accept", name: "Kofi Mensah", agree: true }),
      t.call({ action: "accept", name: "Kofi Mensah", agree: true }),
    ]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(t.notify.quoteAccepted).toHaveBeenCalledTimes(1);
  });

  it("parallel accept and decline: one status change, one decision email", async () => {
    const t = setup();
    const [a, d] = await Promise.all([
      t.call({ action: "accept", name: "Kofi Mensah", agree: true }),
      t.call({ action: "decline", reason: "Budget" }),
    ]);
    const final = t.repo.quotes.get("q1").status;
    expect(["accepted", "declined"]).toContain(final);
    for (const r of [a, d]) {
      expect([200, 409]).toContain(r.status);
      if (r.status === 200) expect(r.body.quote.status).toBe(final);
    }
    expect(t.notify.decision).toHaveBeenCalledTimes(1);
    expect(t.notify.decision).toHaveBeenCalledWith(expect.anything(), final);
  });

  it("repeat decline is idempotent: the admin is alerted once", async () => {
    const t = setup();
    await t.call({ action: "decline", reason: "Budget" });
    const r = await t.call({ action: "decline", reason: "Budget" });
    expect(r.status).toBe(200);
    expect(t.notify.decision).toHaveBeenCalledTimes(1);
  });

  it("repeat accept after a deposit is paid shows the stage as paid", async () => {
    const t = setup();
    await t.call({ action: "accept", name: "Kofi Mensah", agree: true });
    await t.repo.createPayment({
      quoteNumber: "Q-2026-0001",
      stageId: "deposit",
      status: "success",
      kind: "quote",
      amountMinor: 6000,
      currency: "GHS",
      paystackReference: "ref-deposit-1",
      paidAt: NOW.toISOString(),
    });
    const r = await t.call({ action: "accept", name: "Kofi Mensah", agree: true });
    expect(r.status).toBe(200);
    expect(r.body.quote.stages[0].state).toBe("paid");
  });

  it("a rejecting email does not fail the response; the quote is still accepted", async () => {
    const t = setup(base, {
      notify: {
        quoteAccepted: vi.fn().mockRejectedValue(new Error("mail down")),
        decision: vi.fn().mockRejectedValue(new Error("mail down")),
      },
    });
    const r = await t.call({ action: "accept", name: "Kofi Mensah", agree: true });
    expect(r.status).toBe(200);
    expect(t.repo.quotes.get("q1").status).toBe("accepted");
    expect(r.context.log.warn).toHaveBeenCalled();
  });

  it("the acceptance snapshot includes the full-proposal fields", async () => {
    const t = setup({
      ...base,
      highlights: ["Fast"],
      exclusions: "No hosting",
      runningCosts: [{ service: "A", purpose: "B", cost: "C" }],
      optionalItems: [{ id: "o1", description: "SMS", qty: 1, unitMinor: 1, detail: "" }],
      extras: { needs: { intro: "Send early", groups: [] } },
    });
    await t.call({ action: "accept", name: "Kofi Mensah", agree: true });
    expect(JSON.parse(t.repo.quotes.get("q1").acceptedSnapshot)).toMatchObject({
      highlights: ["Fast"],
      exclusions: "No hosting",
      runningCosts: [{ service: "A", purpose: "B", cost: "C" }],
      optionalItems: [{ id: "o1", description: "SMS", qty: 1, unitMinor: 1, detail: "" }],
      assumptions: "",
      nextSteps: "",
      extras: { needs: { intro: "Send early", groups: [] } },
    });
  });

  it("the acceptance snapshot records quote number and client email", async () => {
    const t = setup();
    await t.call({ action: "accept", name: "Kofi Mensah", agree: true });
    expect(JSON.parse(t.repo.quotes.get("q1").acceptedSnapshot)).toMatchObject({
      quoteNumber: "Q-2026-0001",
      clientEmail: "kofi@example.com",
    });
  });
});

describe("quote-respond access gate", () => {
  it.each([
    { action: "accept", name: "Kofi Mensah", agree: true },
    { action: "decline", reason: "Too dear" },
  ])("refuses $action without an unlock and changes nothing", async (body) => {
    const t = setup();
    const r = await t.call(body, { cookie: null });
    expect(r.status).toBe(401);
    expect(r.body).toEqual({ locked: true, error: expect.any(String) });
    expect(t.repo.quotes.get("q1").status).toBe("sent");
    expect(t.notify.decision).not.toHaveBeenCalled();
  });

  it("accepts without a cookie when the gate is switched off", async () => {
    const t = setup(base, { env: { QUOTE_ACCESS_GATE: "off" } });
    const r = await t.call(
      { action: "accept", name: "Kofi Mensah", agree: true },
      { cookie: null },
    );
    expect(r.status).toBe(200);
  });

  it("keeps the expiry answer behind the gate", async () => {
    const t = setup({ ...base, validUntil: "2026-10-09T00:00:00.000Z" });
    const r = await t.call(
      { action: "accept", name: "Kofi Mensah", agree: true },
      { cookie: null },
    );
    expect(r.status).toBe(401);
    expect(t.repo.quotes.get("q1").status).toBe("sent");
  });
});
