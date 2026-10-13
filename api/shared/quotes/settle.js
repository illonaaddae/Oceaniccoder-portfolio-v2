// Settles one quote payment reference. Called by the webhook, the return-page
// check and polling, which can all arrive within the same second; the lock
// documents make sure exactly one of them records the payment and emails.

const M = require("./model");
const S = require("./settlement");

async function settleQuotePayment({
  repo,
  locks,
  verify,
  notify,
  reference,
  now = () => new Date().toISOString(),
  secretKey = process.env.PAYSTACK_SECRET_KEY || "",
}) {
  const payment = await repo.findPaymentByReference(reference);
  if (!payment || payment.kind !== "quote") return { state: "unknown" };
  if (payment.status !== "pending") return { state: payment.status, payment };

  let tx;
  try {
    tx = await verify(reference);
  } catch (err) {
    // Paystack doesn't know the reference until the customer reaches checkout.
    if (err.status === 400 || err.status === 404) return { state: "pending", payment };
    throw err;
  }

  const mapped = S.mapPaystackStatus(tx.status);
  if (mapped === "pending") return { state: "pending", payment };

  const settleKey = `settle:${reference}`;
  if (!(await locks.take(settleKey))) {
    const current = await repo.findPaymentByReference(reference);
    return { state: current.status, payment: current };
  }

  // Every branch below except a plain Paystack failure means money may have
  // been captured, so the row must stay visible (M.canArchivePayment refuses
  // to archive it). If the admin archived the attempt, clear that:
  //   1. in the status write itself when the row we read was archived;
  //   2. again if the row as written is still archived (an archive that
  //      landed between our read and our write).
  // The second write is best effort and never throws: the money is already
  // recorded, and the receipt emails after it must still go out. The Payments
  // tab never shows a money row as archived anyway. archivedAt is only sent
  // when set, so a database without the column still records payments.
  const recordCaptured = async (patch) => {
    const p = await repo.updatePayment(payment.id, {
      ...patch,
      ...(payment.archivedAt ? { archivedAt: null } : {}),
    });
    if (!p || !p.archivedAt) return p;
    try {
      return await repo.updatePayment(payment.id, { archivedAt: null });
    } catch {
      return p;
    }
  };

  let stageKey = null;
  try {
    const quote = await repo.get(payment.quoteId);
    const gateway = {
      channel: tx.channel || "",
      method: S.methodFromChannel(tx.channel),
      paystackId: String(tx.id || ""),
    };

    if (!quote) {
      const p = await recordCaptured({
        ...gateway,
        status: "failed",
        note: "quote not found",
      });
      return { state: "failed", payment: p };
    }

    if (mapped === "failed") {
      const p = await repo.updatePayment(payment.id, {
        ...gateway,
        status: "failed",
        note: `${M.PAYSTACK_FAILURE_NOTE}${tx.gateway_response || tx.status}`.slice(0, 300),
      });
      return { state: "failed", payment: p };
    }

    if (tx.domain && tx.domain !== S.keyMode(secretKey)) {
      const p = await recordCaptured({
        ...gateway,
        status: "failed",
        note: "mode-mismatch",
      });
      await notify.paymentProblem(quote, p, "mode-mismatch");
      return { state: "failed", payment: p };
    }

    const payments = await repo.listPayments(quote.quoteNumber);
    const stage = M.stageStates(quote, payments).find((s) => s.id === payment.stageId);
    if (stage && stage.state === "paid") {
      // Already recorded by another payment (or by hand): never record twice.
      const p = await recordCaptured({
        ...gateway,
        status: "duplicate",
        note: "stage already paid",
      });
      await notify.paymentProblem(quote, p, "duplicate");
      return { state: "duplicate", payment: p };
    }
    const check = S.checkSettlement({
      expectedMinor: stage ? stage.amountMinor : 0,
      expectedCurrency: quote.currency,
      paidMinor: tx.amount,
      paidCurrency: tx.currency,
    });
    if (!check.ok) {
      const p = await recordCaptured({
        ...gateway,
        status: "failed",
        note: check.reason,
      });
      await notify.paymentProblem(quote, p, check.reason);
      return { state: "failed", payment: p };
    }

    stageKey = `stage:${quote.id}:${stage.id}`;
    if (!(await locks.take(stageKey))) {
      stageKey = null; // held by the earlier payment; not ours to release
      const p = await recordCaptured({
        ...gateway,
        status: "duplicate",
        note: "stage already paid",
      });
      await notify.paymentProblem(quote, p, "duplicate");
      return { state: "duplicate", payment: p };
    }

    // An attempt the admin archived can still be paid if the client finishes
    // checkout later; recordCaptured un-archives it.
    const p = await recordCaptured({
      ...gateway,
      status: "success",
      paidAt: tx.paid_at || now(),
    });
    const after = M.stageStates(quote, [...payments.filter((x) => x.id !== p.id), p]);
    await notify.paymentReceived(quote, p, after);
    return { state: "success", payment: p };
  } catch (err) {
    // Release the stage lock only when this payment is provably still pending.
    // If the success write may have landed (or the re-read fails), keep the
    // lock: stranding a stage is safer than recording it twice.
    if (stageKey) {
      try {
        const fresh = await repo.findPaymentByReference(reference);
        if (fresh && fresh.status === "pending") await locks.release(stageKey);
      } catch {
        // keep the stage lock
      }
    }
    try {
      await locks.release(settleKey);
    } catch {
      // original error matters more
    }
    throw err;
  }
}

module.exports = { settleQuotePayment };
