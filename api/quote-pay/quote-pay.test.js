// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const { createHandler } = await import("./index.js");
const { createFakeRepo, createFakeLocks } = await import("../shared/quotes/fakes.js");
const { hashToken, newToken } = await import("../shared/tokens.js");
const M = await import("../shared/quotes/model.js");
const A = await import("../shared/quotes/access.js");

const SECRET = "p".repeat(40);
const ENV = { QUOTE_ACCESS_SECRET: SECRET };
const TOKEN = newToken();
const NOW = new Date("2026-10-10T09:00:00.000Z");
const accepted = {
  id: "q1",
  quoteNumber: "Q-2026-0001",
  revision: 1,
  status: "accepted",
  currency: "GHS",
  title: "Store",
  clientName: "Kofi",
  clientEmail: "kofi@example.com",
  items: [],
  totalMinor: 10000,
  schedule: M.DEFAULT_SCHEDULE,
  respondedAt: "2026-10-09T00:00:00.000Z",
  payState: { due: {} },
  tokenHash: hashToken(TOKEN),
};

// The unlock cookie a browser holds after a code or link code.
const unlocked = (quote = accepted) =>
  A.sessionCookie(SECRET, quote, 0, NOW.getTime()).split(";")[0];

function setup({
  quote = accepted,
  payments = [],
  initialize,
  charge,
  env = ENV,
  admin = false,
  locks = createFakeLocks(),
} = {}) {
  const repo = createFakeRepo({ quotes: [quote], payments });
  const services = {
    repo,
    locks,
    now: () => NOW,
    initialize:
      initialize ||
      vi.fn().mockResolvedValue({
        accessCode: "AC1",
        authorizationUrl: "https://checkout.paystack.com/AC1",
        reference: "x",
      }),
  };
  const handleQuoteCharge =
    charge || vi.fn().mockResolvedValue({ state: "success", payment: { paystackReference: "R1" } });
  const requireAdmin = vi.fn(async () =>
    admin ? { user: { email: "owner@oceaniccoder.dev" } } : { status: 401, error: "Sign in" },
  );
  const handler = createHandler({
    env,
    requireAdmin,
    services: () => services,
    handleQuoteCharge,
  });
  const call = async (req, { cookie = unlocked(quote) } = {}) => {
    const context = { log: { error: vi.fn() } };
    await handler(context, { headers: cookie ? { cookie } : {}, ...req });
    return { status: context.res.status, body: JSON.parse(context.res.body), context };
  };
  return { repo, services, handleQuoteCharge, requireAdmin, call };
}

const start = (over = {}) => ({
  method: "POST",
  body: {
    token: TOKEN,
    stageId: "deposit",
    method: "momo",
    network: "mtn",
    email: "kofi@example.com",
    ...over,
  },
});

describe("quote-pay POST", () => {
  beforeEach(() => {
    process.env.RECEIPT_SIGNING_SECRET = "s";
  });

  it("writes a pending row and initialises Paystack with the server's amount", async () => {
    const t = setup();
    const r = await t.call(start());
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ accessCode: "AC1" });
    const args = t.services.initialize.mock.calls[0][0];
    expect(args).toMatchObject({
      amountMinor: 6000,
      currency: "GHS",
      channels: ["mobile_money"],
      email: "kofi@example.com",
    });
    expect(args.metadata).toMatchObject({
      kind: "quote",
      quoteNumber: "Q-2026-0001",
      stageId: "deposit",
    });
    expect(args.callbackUrl).toBe(
      `https://oceaniccoder.dev/q/${TOKEN}/paid?reference=${encodeURIComponent(r.body.reference)}`,
    );
    const [row] = [...t.repo.payments.values()];
    expect(row).toMatchObject({
      status: "pending",
      kind: "quote",
      amountMinor: 6000,
      accessCode: "AC1",
      paystackReference: r.body.reference,
    });
  });

  it("records the Mobile Money network the client picked", async () => {
    const t = setup();
    expect((await t.call(start({ network: "telecel" }))).status).toBe(200);
    expect(t.services.initialize.mock.calls[0][0].metadata).toMatchObject({
      momoNetwork: "telecel",
    });
    const [row] = [...t.repo.payments.values()];
    expect(row.note).toBe("network:telecel");
  });

  it("asks for a network for Mobile Money, and ignores one for card", async () => {
    expect((await setup().call(start({ network: undefined }))).status).toBe(400);
    expect((await setup().call(start({ network: "orange" }))).status).toBe(400);
    const t = setup();
    expect((await t.call(start({ method: "card", network: "mtn" }))).status).toBe(200);
    const [row] = [...t.repo.payments.values()];
    expect(row.note || "").toBe("");
  });

  it("reuses pending: a second click within 15 minutes gets the same reference", async () => {
    const t = setup();
    const first = await t.call(start());
    const second = await t.call(start());
    expect(second.body.reference).toBe(first.body.reference);
    expect(t.services.initialize).toHaveBeenCalledTimes(1);
  });

  it("refuses stages that aren't due and quotes that aren't accepted", async () => {
    expect((await setup().call(start({ stageId: "balance" }))).status).toBe(409);
    expect((await setup({ quote: { ...accepted, status: "sent" } }).call(start())).status).toBe(
      409,
    );
    expect((await setup().call(start({ method: "bitcoin" }))).status).toBe(400);
    expect((await setup().call(start({ email: "nope" }))).status).toBe(400);
  });

  it("marks the row failed and answers 502 when Paystack refuses", async () => {
    const t = setup({ initialize: vi.fn().mockRejectedValue(new Error("Currency not supported")) });
    const r = await t.call(start());
    expect(r.status).toBe(502);
    expect([...t.repo.payments.values()][0].status).toBe("failed");
  });
});

describe("quote-pay GET", () => {
  it("only checks references that belong to this quote", async () => {
    const t = setup({
      payments: [
        { id: "p1", kind: "quote", quoteId: "other", paystackReference: "R1", status: "pending" },
      ],
    });
    expect((await t.call({ method: "GET", query: { token: TOKEN, reference: "R1" } })).status).toBe(
      404,
    );
  });

  it("settles and returns a receipt path when paid", async () => {
    process.env.RECEIPT_SIGNING_SECRET = "s";
    const t = setup({
      payments: [
        { id: "p1", kind: "quote", quoteId: "q1", paystackReference: "R1", status: "pending" },
      ],
    });
    const r = await t.call({ method: "GET", query: { token: TOKEN, reference: "R1" } });
    expect(r.body.state).toBe("paid");
    expect(r.body.receiptPath).toMatch(/^\/receipt\/R1\?s=/);
    expect(t.handleQuoteCharge).toHaveBeenCalledWith("R1", expect.anything());
  });

  it("reports pending without a receipt", async () => {
    const t = setup({
      payments: [
        { id: "p1", kind: "quote", quoteId: "q1", paystackReference: "R1", status: "pending" },
      ],
      charge: vi.fn().mockResolvedValue({ state: "pending" }),
    });
    expect(
      (await t.call({ method: "GET", query: { token: TOKEN, reference: "R1" } })).body,
    ).toEqual({ state: "pending", receiptPath: null });
  });
});

describe("quote-pay access gate", () => {
  const pending = [
    { id: "p1", kind: "quote", quoteId: "q1", paystackReference: "R1", status: "pending" },
  ];
  const checkR1 = { method: "GET", query: { token: TOKEN, reference: "R1" } };

  beforeEach(() => {
    process.env.RECEIPT_SIGNING_SECRET = "s";
  });

  it("refuses to start a payment without an unlock", async () => {
    const t = setup();
    const r = await t.call(start(), { cookie: null });
    expect(r).toMatchObject({ status: 401, body: { locked: true } });
    expect(r.body.accessCode).toBeUndefined();
    expect(t.services.initialize).not.toHaveBeenCalled();
    expect(t.repo.payments.size).toBe(0);
  });

  it("has no admin bypass for starting a payment", async () => {
    const t = setup({ admin: true });
    const r = await t.call({ ...start(), query: { admin: "1" } }, { cookie: null });
    expect(r.status).toBe(401);
    expect(t.requireAdmin).not.toHaveBeenCalled();
  });

  it("still settles a payment without an unlock, but returns no receipt path", async () => {
    const t = setup({ payments: pending });
    const r = await t.call(checkR1, { cookie: null });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ state: "paid", receiptPath: null });
    expect(t.handleQuoteCharge).toHaveBeenCalledWith("R1", expect.anything());
  });

  it("returns the receipt path to the admin", async () => {
    const t = setup({ payments: pending, admin: true });
    const r = await t.call(
      { method: "GET", query: { ...checkR1.query, admin: "1" } },
      { cookie: null },
    );
    expect(r.body.receiptPath).toMatch(/^\/receipt\/R1\?s=/);
  });

  it("still settles when the access secret is missing", async () => {
    const t = setup({ payments: pending, env: {} });
    const r = await t.call(checkR1, { cookie: null });
    expect(r.body).toEqual({ state: "paid", receiptPath: null });
    expect(t.handleQuoteCharge).toHaveBeenCalled();
  });

  it("still settles when the locks can't be read, and logs it", async () => {
    const locks = createFakeLocks();
    locks.has = async () => {
      throw new Error("locks down");
    };
    const t = setup({ payments: pending, locks });
    const r = await t.call(checkR1);
    expect(r.body).toEqual({ state: "paid", receiptPath: null });
    expect(r.context.log.error).toHaveBeenCalledWith(expect.stringContaining("locks down"));
  });
});
