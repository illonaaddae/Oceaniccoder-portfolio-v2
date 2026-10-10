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

  it("marks a pending reference duplicate when the stage was paid with no stage lock held", async () => {
    const payments = [
      pending({ id: "p0", paystackReference: "REF0", status: "success", paidAt: "2026-10-01" }),
      pending({ id: "p1" }),
    ];
    const { repo, locks, notify, run } = setup({ payments });
    expect(locks.held.size).toBe(0);
    expect((await run("REF1")).state).toBe("duplicate");
    expect(repo.payments.get("p1").status).toBe("duplicate");
    expect(notify.paymentProblem).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "duplicate",
    );
    expect(notify.paymentReceived).not.toHaveBeenCalled();
  });

  it("keeps the stage lock when the success write lands but then errors", async () => {
    const { repo, locks, run } = setup();
    const original = repo.updatePayment;
    repo.updatePayment = vi.fn(async (id, patch) => {
      await original(id, patch);
      throw new Error("timeout after write");
    });
    await expect(run()).rejects.toThrow("timeout after write");
    expect(repo.payments.get("p1").status).toBe("success");
    expect(locks.held.has("stage:q1:deposit")).toBe(true);
    expect(locks.held.has("settle:REF1")).toBe(false);
  });

  it("keeps the stage lock when the re-read after an error also fails", async () => {
    const { repo, locks, run } = setup();
    repo.updatePayment = vi.fn().mockRejectedValue(new Error("write failed"));
    const find = repo.findPaymentByReference;
    let calls = 0;
    repo.findPaymentByReference = vi.fn(async (r) => {
      calls += 1;
      if (calls > 1) throw new Error("read failed");
      return find(r);
    });
    await expect(run()).rejects.toThrow("write failed");
    expect(locks.held.has("stage:q1:deposit")).toBe(true);
    expect(locks.held.has("settle:REF1")).toBe(false);
  });

  it("settles two references for one stage concurrently as one success and one duplicate", async () => {
    const payments = [pending(), pending({ id: "p2", paystackReference: "REF2" })];
    const { run } = setup({ payments });
    const states = (await Promise.all([run("REF1"), run("REF2")])).map((r) => r.state).sort();
    expect(states).toEqual(["duplicate", "success"]);
  });

  it("returns the current status without updating when another caller holds the settle lock", async () => {
    const { repo, locks, notify, run } = setup();
    await locks.take("settle:REF1");
    const spy = vi.spyOn(repo, "updatePayment");
    expect((await run()).state).toBe("pending");
    expect(spy).not.toHaveBeenCalled();
    expect(notify.paymentReceived).not.toHaveBeenCalled();
  });

  it("leaves the winner's stage lock held after a duplicate", async () => {
    const payments = [pending(), pending({ id: "p2", paystackReference: "REF2" })];
    const { locks, run } = setup({ payments });
    await run("REF1");
    await run("REF2");
    expect(locks.held.has("stage:q1:deposit")).toBe(true);
  });

  it("fails the payment without notifying when the quote is missing", async () => {
    const { repo, notify, run } = setup();
    repo.quotes.delete("q1");
    expect((await run()).state).toBe("failed");
    expect(repo.payments.get("p1")).toMatchObject({ status: "failed", note: "quote not found" });
    expect(notify.paymentProblem).not.toHaveBeenCalled();
    expect(notify.paymentReceived).not.toHaveBeenCalled();
  });
});
