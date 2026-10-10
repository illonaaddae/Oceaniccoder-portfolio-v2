// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { settleQuotePayment } = await import("./settle.js");
const { createFakeRepo, createFakeLocks } = await import("./fakes.js");
const M = await import("./model.js");

const quote = {
  id: "q1",
  quoteNumber: "Q-2026-0001",
  status: "accepted",
  currency: "GHS",
  title: "Store",
  clientName: "Kofi",
  clientEmail: "kofi@example.com",
  totalMinor: 10000,
  schedule: M.DEFAULT_SCHEDULE,
  respondedAt: "2026-10-01T00:00:00Z",
  payState: { due: {} },
};
const pending = (over = {}) => ({
  id: "p1",
  kind: "quote",
  quoteId: "q1",
  quoteNumber: "Q-2026-0001",
  stageId: "deposit",
  amountMinor: 6000,
  currency: "GHS",
  status: "pending",
  paystackReference: "REF1",
  ...over,
});
const tx = (over = {}) => ({
  status: "success",
  amount: 6000,
  currency: "GHS",
  channel: "mobile_money",
  id: 99,
  paid_at: "2026-10-02T00:00:00Z",
  domain: "test",
  ...over,
});

function setup({ payments = [pending()], verifyResult = tx() } = {}) {
  const repo = createFakeRepo({ quotes: [quote], payments });
  const locks = createFakeLocks();
  const notify = {
    paymentReceived: vi.fn().mockResolvedValue({ ok: true }),
    paymentProblem: vi.fn().mockResolvedValue({ ok: true }),
  };
  const verify =
    typeof verifyResult === "function" ? verifyResult : vi.fn().mockResolvedValue(verifyResult);
  const run = (reference = "REF1") =>
    settleQuotePayment({ repo, locks, verify, notify, reference, secretKey: "sk_test_x" });
  return { repo, locks, notify, verify, run };
}

describe("settleQuotePayment", () => {
  it("marks an exact payment paid and sends the receipt once", async () => {
    const { repo, notify, run } = setup();
    expect((await run()).state).toBe("success");
    expect(repo.payments.get("p1")).toMatchObject({
      status: "success",
      method: "momo",
      paystackId: "99",
      paidAt: "2026-10-02T00:00:00Z",
    });
    expect(notify.paymentReceived).toHaveBeenCalledTimes(1);
    expect((await run()).state).toBe("success");
    expect(notify.paymentReceived).toHaveBeenCalledTimes(1);
  });

  it("keeps an abandoned Mobile Money charge pending without taking the lock", async () => {
    const { repo, locks, run } = setup({ verifyResult: tx({ status: "abandoned" }) });
    expect((await run()).state).toBe("pending");
    expect(repo.payments.get("p1").status).toBe("pending");
    expect(locks.held.size).toBe(0);
  });

  it("treats an unknown reference at Paystack as pending", async () => {
    const verify = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("not found"), { status: 404 }));
    const { run } = setup({ verifyResult: verify });
    expect((await run()).state).toBe("pending");
  });

  it("fails an underpayment and alerts the admin", async () => {
    const { repo, notify, run } = setup({ verifyResult: tx({ amount: 5999 }) });
    expect((await run()).state).toBe("failed");
    expect(repo.payments.get("p1").note).toMatch(/underpaid/);
    expect(notify.paymentProblem).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "underpaid",
    );
  });

  it("refuses a test charge on a live key", async () => {
    const { run, notify } = setup({ verifyResult: tx({ domain: "live" }) });
    expect((await run()).state).toBe("failed");
    expect(notify.paymentProblem).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "mode-mismatch",
    );
  });

  it("marks a second successful charge for a paid stage as duplicate", async () => {
    const payments = [pending(), pending({ id: "p2", paystackReference: "REF2" })];
    const { repo, notify, run } = setup({ payments });
    expect((await run("REF1")).state).toBe("success");
    expect((await run("REF2")).state).toBe("duplicate");
    expect(repo.payments.get("p2").status).toBe("duplicate");
    expect(notify.paymentProblem).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "duplicate",
    );
  });

  it("records a Paystack failure", async () => {
    const { repo, run } = setup({
      verifyResult: tx({ status: "failed", gateway_response: "Declined" }),
    });
    expect((await run()).state).toBe("failed");
    expect(repo.payments.get("p1").note).toMatch(/Declined/);
  });

  it("returns unknown for references that are not quote payments", async () => {
    const { run } = setup({ payments: [pending({ kind: "invoice" })] });
    expect((await run()).state).toBe("unknown");
  });

  it("releases the settle lock when something throws, so a retry can finish", async () => {
    const { repo, locks, run } = setup();
    const original = repo.updatePayment;
    repo.updatePayment = vi.fn().mockRejectedValueOnce(new Error("appwrite down"));
    await expect(run()).rejects.toThrow("appwrite down");
    expect(locks.held.size).toBe(0);
    repo.updatePayment = original;
    expect((await run()).state).toBe("success");
  });
});
