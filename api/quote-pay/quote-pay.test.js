// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const { createHandler } = await import("./index.js");
const { createFakeRepo, createFakeLocks } = await import("../shared/quotes/fakes.js");
const { hashToken, newToken } = await import("../shared/tokens.js");
const M = await import("../shared/quotes/model.js");

const TOKEN = newToken();
const NOW = new Date("2026-10-10T09:00:00.000Z");
const accepted = {
  id: "q1",
  quoteNumber: "Q-2026-0001",
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

function setup({ quote = accepted, payments = [], initialize, charge } = {}) {
  const repo = createFakeRepo({ quotes: [quote], payments });
  const services = {
    repo,
    locks: createFakeLocks(),
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
  const handler = createHandler({ services: () => services, handleQuoteCharge });
  const call = async (req) => {
    const context = { log: { error: vi.fn() } };
    await handler(context, { headers: {}, ...req });
    return { status: context.res.status, body: JSON.parse(context.res.body) };
  };
  return { repo, services, handleQuoteCharge, call };
}

const start = (over = {}) => ({
  method: "POST",
  body: { token: TOKEN, stageId: "deposit", method: "momo", email: "kofi@example.com", ...over },
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
