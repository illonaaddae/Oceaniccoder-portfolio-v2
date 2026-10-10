// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const { createHandler } = await import("./index.js");
const { createFakeRepo } = await import("../shared/quotes/fakes.js");
const { signReceipt } = await import("../shared/tokens.js");
const M = await import("../shared/quotes/model.js");

const quote = {
  id: "q1",
  quoteNumber: "Q-2026-0001",
  status: "accepted",
  currency: "GHS",
  title: "Store",
  clientName: "Kofi",
  totalMinor: 10000,
  schedule: M.DEFAULT_SCHEDULE,
  respondedAt: "2026-10-09T00:00:00.000Z",
  payState: { due: {} },
};
const payment = {
  id: "p1",
  kind: "quote",
  quoteId: "q1",
  quoteNumber: "Q-2026-0001",
  stageId: "deposit",
  paystackReference: "R1",
  status: "success",
  amountMinor: 6000,
  currency: "GHS",
  method: "momo",
  paidAt: "2026-10-10T00:00:00.000Z",
};

function call(query, payments = [payment]) {
  const repo = createFakeRepo({ quotes: [quote], payments });
  const handler = createHandler({ services: () => ({ repo, now: () => new Date() }) });
  const context = { log: { error: vi.fn() } };
  return handler(context, { method: "GET", query }).then(() => ({
    status: context.res.status,
    body: JSON.parse(context.res.body),
  }));
}

describe("quote-receipt", () => {
  beforeEach(() => (process.env.RECEIPT_SIGNING_SECRET = "s"));

  it("returns the receipt for a valid signature", async () => {
    const r = await call({ reference: "R1", s: signReceipt("R1", "s") });
    expect(r.status).toBe(200);
    expect(r.body.receipt).toMatchObject({
      amountMinor: 6000,
      method: "Mobile Money",
      stageLabel: "Deposit",
      balanceMinor: 4000,
    });
  });

  it("404s on a bad signature or an unpaid payment", async () => {
    expect((await call({ reference: "R1", s: "x".repeat(32) })).status).toBe(404);
    expect(
      (
        await call({ reference: "R1", s: signReceipt("R1", "s") }, [
          { ...payment, status: "pending" },
        ])
      ).status,
    ).toBe(404);
  });
});
