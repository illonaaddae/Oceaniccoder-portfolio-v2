// @vitest-environment node
// The webhook invoice flow on Cosmos, run against the in-memory fake with
// the real store. Email sending is a recorder, so nothing leaves the process.
import { describe, it, expect, vi } from "vitest";

const {
  recordInvoiceCharge,
  claimRetryAlert,
  releaseRetryAlert,
  claimEscalation,
  releaseEscalation,
  NOTIFY_CLAIM_MS,
  ESCALATE_AFTER_MS,
} = await import("./invoiceCharge.js");
const { createCosmosInvoiceStore, MAX_REPLACE_ATTEMPTS } =
  await import("../shared/invoices/store.cosmos.js");
const { createFakeCosmos } = await import("../shared/fakeCosmos.js");
const { paymentIdFor } = await import("../shared/quotes/repo.cosmos.js");
const { createCosmosLocks } = await import("../shared/locks.js");
const { lockId } = await import("../shared/tokens.js");

const REFERENCE = "PAY-INV-2026-0042-1760000000";
const PAYMENT_ID = paymentIdFor(REFERENCE);

const charge = (over = {}) => ({
  reference: REFERENCE,
  invoiceNumber: "INV-2026-0042",
  amountPaid: 500,
  currency: "GHS",
  method: "momo",
  ...over,
});

const invoiceDoc = (over = {}) => ({
  id: "inv1",
  invoiceNumber: "INV-2026-0042",
  clientName: "Ama Owusu",
  clientEmail: "ama@example.com",
  total: 500,
  currency: "GHS",
  status: "sent",
  ...over,
});

const transient = () => Object.assign(new Error("Service Unavailable"), { code: 503 });

function setup({ invoice = invoiceDoc(), now = () => new Date("2026-10-17T10:00:00.000Z") } = {}) {
  const db = createFakeCosmos();
  const invoices = db.container("invoices");
  const payments = db.container("payments");
  if (invoice) invoices.seed(invoice);
  const store = createCosmosInvoiceStore(db, { now });
  const sendEmails = vi.fn(async () => {});
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const run = (over = {}) =>
    recordInvoiceCharge({ store, charge: charge(over), sendEmails, log, now });
  return { db, store, invoices, payments, sendEmails, log, run };
}

const stored = (container, id) => {
  const { _rid, _self, _etag, _attachments, _ts, ...fields } = container.docs.get(id);
  return fields;
};

// Fails the next `count` calls of a fake-container hook, then lets them through.
function failNext(container, hook, count = 1, error = transient) {
  let left = count;
  container.hooks[hook] = async () => {
    if (left > 0) {
      left -= 1;
      throw error();
    }
  };
}

describe("recordInvoiceCharge on Cosmos", () => {
  it("records a settling payment, marks the invoice paid and sends the emails once", async () => {
    const { invoices, payments, sendEmails, run } = setup();
    expect(await run()).toEqual({ outcome: "recorded" });

    expect(stored(invoices, "inv1")).toMatchObject({ status: "paid" });
    expect(payments.docs.size).toBe(1);
    expect(stored(payments, PAYMENT_ID)).toMatchObject({
      id: PAYMENT_ID,
      invoiceNumber: "INV-2026-0042",
      clientName: "Ama Owusu",
      clientEmail: "ama@example.com",
      amount: 500,
      currency: "GHS",
      method: "momo",
      paystackReference: REFERENCE,
      paidAt: "2026-10-17T10:00:00.000Z",
      status: "success",
      invoiceApplied: true,
      notifiedAt: "2026-10-17T10:00:00.000Z",
    });
    expect(sendEmails).toHaveBeenCalledTimes(1);
    expect(sendEmails.mock.calls[0][0]).toMatchObject({
      invoiceNumber: "INV-2026-0042",
      clientName: "Ama Owusu",
      clientEmail: "ama@example.com",
      amountPaid: 500,
      currency: "GHS",
      reference: REFERENCE,
      settlement: expect.objectContaining({ settles: true }),
    });
  });

  it("ignores a second delivery of the same charge", async () => {
    const { invoices, payments, sendEmails, run } = setup();
    await run();
    const invoiceAfterFirst = stored(invoices, "inv1");
    expect(await run()).toEqual({ outcome: "duplicate" });
    expect(payments.docs.size).toBe(1);
    expect(sendEmails).toHaveBeenCalledTimes(1);
    expect(stored(invoices, "inv1")).toEqual(invoiceAfterFirst);
  });

  it("treats a row imported from Appwrite under its old id as already recorded", async () => {
    const { invoices, payments, sendEmails, run } = setup();
    payments.seed({ id: "6702appwriteid", paystackReference: REFERENCE, status: "success" });
    expect(await run()).toEqual({ outcome: "duplicate" });
    expect(payments.docs.size).toBe(1);
    expect(stored(invoices, "inv1").status).toBe("sent");
    expect(sendEmails).not.toHaveBeenCalled();
  });

  it("finishes on retry after a crash between the payment row and the invoice", async () => {
    const { invoices, payments, sendEmails, run } = setup();
    failNext(invoices, "beforeReplace");
    await expect(run()).rejects.toSatisfy(
      (err) => err.message === "Service Unavailable" && !err.paymentRecorded,
    );
    expect(stored(payments, PAYMENT_ID).invoiceApplied).toBe(false);
    expect(stored(invoices, "inv1").status).toBe("sent");
    expect(sendEmails).not.toHaveBeenCalled();

    expect(await run()).toEqual({ outcome: "recorded" });
    expect(payments.docs.size).toBe(1);
    expect(stored(invoices, "inv1").status).toBe("paid");
    expect(stored(payments, PAYMENT_ID)).toMatchObject({ invoiceApplied: true });
    expect(sendEmails).toHaveBeenCalledTimes(1);
  });

  it("sends the emails once on retry after a crash between the invoice and the emails", async () => {
    const { invoices, payments, sendEmails, run } = setup();
    // The invoice write succeeds; setting invoiceApplied on the row fails.
    failNext(payments, "beforeReplace");
    await expect(run()).rejects.toThrow("Service Unavailable");
    expect(stored(invoices, "inv1").status).toBe("paid");
    expect(sendEmails).not.toHaveBeenCalled();

    expect(await run()).toEqual({ outcome: "recorded" });
    expect(sendEmails).toHaveBeenCalledTimes(1);
    expect(await run()).toEqual({ outcome: "duplicate" });
    expect(sendEmails).toHaveBeenCalledTimes(1);
  });

  describe("a failure after the row shows invoiceApplied", () => {
    const appliedRow = (over = {}) => ({
      id: PAYMENT_ID,
      invoiceNumber: "INV-2026-0042",
      paystackReference: REFERENCE,
      amount: 500,
      currency: "GHS",
      invoiceApplied: true,
      ...over,
    });

    it("is marked paymentRecorded when reading its invoice fails", async () => {
      const { invoices, payments, run } = setup();
      payments.seed(appliedRow({ invoiceId: "inv1" }));
      failNext(invoices, "beforeRead");
      await expect(run()).rejects.toMatchObject({ paymentRecorded: true });
    });

    it("is marked paymentRecorded when the lookup by number fails", async () => {
      const { store, payments, sendEmails, log } = setup();
      payments.seed(appliedRow());
      store.findInvoicesByNumber = async () => {
        throw transient();
      };
      await expect(
        recordInvoiceCharge({ store, charge: charge(), sendEmails, log }),
      ).rejects.toMatchObject({ paymentRecorded: true });
    });

    it("is not marked when the row is not applied yet", async () => {
      const { invoices, payments, run } = setup();
      payments.seed(appliedRow({ invoiceId: "inv1", invoiceApplied: false }));
      failNext(invoices, "beforeRead");
      await expect(run()).rejects.toSatisfy(
        (err) => err.message === "Service Unavailable" && !err.paymentRecorded,
      );
    });
  });

  it("stops as a conflict when the invoice a resumed row names is gone", async () => {
    const { invoices, payments, sendEmails, run } = setup();
    failNext(invoices, "beforeReplace");
    await expect(run()).rejects.toThrow("Service Unavailable");
    expect(stored(payments, PAYMENT_ID).invoiceId).toBe("inv1");
    invoices.docs.delete("inv1");
    invoices.seed(invoiceDoc({ id: "inv2" }));
    expect(await run()).toEqual({ outcome: "conflict" });
    expect(stored(invoices, "inv2").status).toBe("sent");
    expect(sendEmails).not.toHaveBeenCalled();
  });

  it("settles a resumed row without a stored settlement against the current invoice", async () => {
    const { payments, sendEmails, run } = setup({ invoice: invoiceDoc({ total: 1000 }) });
    payments.seed({
      id: PAYMENT_ID,
      invoiceNumber: "INV-2026-0042",
      paystackReference: REFERENCE,
      amount: 500,
      currency: "GHS",
      invoiceApplied: true,
    });
    expect(await run()).toEqual({ outcome: "recorded" });
    expect(sendEmails.mock.calls[0][0].settlement).toMatchObject({
      settles: false,
      underpaid: true,
      expected: 1000,
    });
  });

  it("resends the emails, once the claim is stale, when notifiedAt could not be saved", async () => {
    let clock = new Date("2026-10-17T10:00:00.000Z");
    const { payments, sendEmails, run } = setup({ now: () => clock });
    let replaces = 0;
    payments.hooks.beforeReplace = async (id, body) => {
      replaces += 1;
      if (body.notifiedAt && replaces === 3) throw transient();
    };
    await expect(run()).rejects.toMatchObject({
      message: "Service Unavailable",
      paymentRecorded: true,
    });
    expect(sendEmails).toHaveBeenCalledTimes(1);

    // A retry inside the claim window leaves the claimer to finish.
    clock = new Date(clock.getTime() + NOTIFY_CLAIM_MS - 1);
    expect(await run()).toEqual({ outcome: "busy" });
    expect(sendEmails).toHaveBeenCalledTimes(1);

    // After it, the claimer is presumed dead and the emails go again.
    clock = new Date(clock.getTime() + 2);
    expect(await run()).toEqual({ outcome: "recorded" });
    expect(sendEmails).toHaveBeenCalledTimes(2);
    expect(stored(payments, PAYMENT_ID).notifiedAt).toBe(clock.toISOString());
  });

  it("records an underpayment but leaves the invoice open", async () => {
    const { invoices, payments, sendEmails, log, run } = setup({
      invoice: invoiceDoc({ total: 1000 }),
    });
    expect(await run()).toEqual({ outcome: "recorded" });
    expect(stored(invoices, "inv1").status).toBe("sent");
    expect(stored(payments, PAYMENT_ID)).toMatchObject({ amount: 500, invoiceApplied: true });
    expect(sendEmails.mock.calls[0][0].settlement).toMatchObject({
      settles: false,
      underpaid: true,
      shortfall: 500,
    });
    expect(log.error).toHaveBeenCalledWith(
      "paystack-webhook: invoice INV-2026-0042 NOT marked paid — paid ₵500.00 against a total of ₵1000.00",
    );
  });

  it("leaves the invoice open when paid in another currency", async () => {
    const { invoices, payments, sendEmails, log, run } = setup();
    expect(await run({ currency: "USD" })).toEqual({ outcome: "recorded" });
    expect(stored(invoices, "inv1").status).toBe("sent");
    expect(stored(payments, PAYMENT_ID)).toMatchObject({ currency: "USD" });
    expect(sendEmails.mock.calls[0][0].settlement).toMatchObject({
      settles: false,
      currencyMismatch: true,
    });
    expect(log.error).toHaveBeenCalledWith(
      "paystack-webhook: invoice INV-2026-0042 NOT marked paid — paid in USD but invoiced in GHS",
    );
  });

  it("un-archives an archived invoice when it is paid", async () => {
    const { invoices, run } = setup({
      invoice: invoiceDoc({ archivedAt: "2026-10-11T00:00:00.000Z" }),
    });
    await run();
    expect(stored(invoices, "inv1")).toMatchObject({ status: "paid", archivedAt: null });
  });

  it("un-archives but does not close an archived invoice on a part-payment", async () => {
    const { invoices, run } = setup({
      invoice: invoiceDoc({ total: 1000, archivedAt: "2026-10-11T00:00:00.000Z" }),
    });
    await run();
    expect(stored(invoices, "inv1")).toMatchObject({ status: "sent", archivedAt: null });
  });

  it("un-archives an archived invoice paid in another currency", async () => {
    const { invoices, run } = setup({
      invoice: invoiceDoc({ archivedAt: "2026-10-11T00:00:00.000Z" }),
    });
    await run({ currency: "USD" });
    expect(stored(invoices, "inv1")).toMatchObject({ status: "sent", archivedAt: null });
  });

  it("leaves a never-archived part-paid invoice untouched", async () => {
    const { invoices, run } = setup({ invoice: invoiceDoc({ total: 1000 }) });
    const before = invoices.docs.get("inv1")._etag;
    await run();
    expect(invoices.docs.get("inv1")._etag).toBe(before);
  });

  it("clears an archive that landed between the read and the paid write", async () => {
    const { invoices, run } = setup();
    let raced = false;
    invoices.hooks.beforeReplace = async (id) => {
      if (raced) return;
      raced = true;
      const { _rid, _self, _etag, _attachments, _ts, ...doc } = invoices.docs.get(id);
      invoices.seed({ ...doc, archivedAt: "2026-10-12T00:00:00Z" });
    };
    await run();
    expect(stored(invoices, "inv1")).toMatchObject({ status: "paid", archivedAt: null });
  });

  it("records two concurrent deliveries once and sends one set of emails", async () => {
    const { invoices, payments, sendEmails, run } = setup();
    const outcomes = (await Promise.all([run(), run()])).map((r) => r.outcome);
    expect(outcomes).toContain("recorded");
    for (const outcome of outcomes) expect(["recorded", "busy"]).toContain(outcome);
    expect(payments.docs.size).toBe(1);
    expect(stored(invoices, "inv1").status).toBe("paid");
    expect(sendEmails).toHaveBeenCalledTimes(1);

    // Whichever delivery was told to retry now finds the work done.
    expect(await run()).toEqual({ outcome: "duplicate" });
    expect(sendEmails).toHaveBeenCalledTimes(1);
  });

  it("resumes the other delivery's row when the create conflicts", async () => {
    const { payments, sendEmails, run } = setup();
    // Another delivery creates the row after our read but before our create.
    payments.hooks.beforeCreate = async (body) => {
      payments.hooks.beforeCreate = null;
      payments.seed({ ...body, createdAt: "x", updatedAt: "x" });
    };
    expect(await run()).toEqual({ outcome: "recorded" });
    expect(payments.docs.size).toBe(1);
    expect(stored(payments, PAYMENT_ID)).toMatchObject({ invoiceApplied: true });
    expect(sendEmails).toHaveBeenCalledTimes(1);
  });

  it("writes nothing when no invoice matches", async () => {
    const { payments, sendEmails, run } = setup({ invoice: null });
    expect(await run()).toEqual({ outcome: "no-invoice" });
    expect(payments.docs.size).toBe(0);
    expect(sendEmails).not.toHaveBeenCalled();
  });

  it("refuses a charge without a reference", async () => {
    const { payments, run } = setup();
    await expect(run({ reference: "" })).rejects.toThrow(/without a Paystack reference/);
    expect(payments.docs.size).toBe(0);
  });

  it("throws a transient read error for the caller to retry", async () => {
    const { payments, run } = setup();
    failNext(payments, "beforeRead");
    await expect(run()).rejects.toThrow("Service Unavailable");
    expect(payments.docs.size).toBe(0);
  });

  it("gives up after repeated etag conflicts on the invoice", async () => {
    const { invoices, payments, sendEmails, run } = setup();
    const conflict = () => Object.assign(new Error("Precondition Failed"), { code: 412 });
    failNext(invoices, "beforeReplace", MAX_REPLACE_ATTEMPTS, conflict);
    await expect(run()).rejects.toMatchObject({ code: 412 });
    expect(stored(payments, PAYMENT_ID).invoiceApplied).toBe(false);
    expect(sendEmails).not.toHaveBeenCalled();
  });
  describe("a row already at our id", () => {
    const ours = (over = {}) => ({
      id: PAYMENT_ID,
      invoiceNumber: "INV-2026-0042",
      paystackReference: REFERENCE,
      invoiceApplied: false,
      ...over,
    });

    it.each([
      ["a quote payment", { quoteNumber: "Q-2026-0001" }],
      ["a quote stage", { stageId: "deposit" }],
      ["another invoice", { invoiceNumber: "INV-2026-0099" }],
      ["another reference", { paystackReference: "PAY-OTHER" }],
    ])("is left alone when it belongs to %s", async (_, over) => {
      const { invoices, payments, sendEmails, log, run } = setup();
      const seeded = payments.seed(ours(over));
      expect(await run()).toEqual({ outcome: "conflict" });
      expect(payments.docs.get(PAYMENT_ID)._etag).toBe(seeded._etag);
      expect(stored(invoices, "inv1").status).toBe("sent");
      expect(sendEmails).not.toHaveBeenCalled();
      expect(log.error).toHaveBeenCalledWith(expect.stringContaining("does not belong"));
    });

    it("is left alone when another charge's row wins the create", async () => {
      const { invoices, payments, sendEmails, run } = setup();
      payments.hooks.beforeCreate = async () => {
        payments.hooks.beforeCreate = null;
        payments.seed(ours({ quoteNumber: "Q-2026-0001" }));
      };
      expect(await run()).toEqual({ outcome: "conflict" });
      expect(stored(invoices, "inv1").status).toBe("sent");
      expect(sendEmails).not.toHaveBeenCalled();
    });

    it("counts as already processed when it has no invoiceApplied field", async () => {
      const { invoices, payments, sendEmails, run } = setup();
      const { invoiceApplied, ...imported } = ours();
      const seeded = payments.seed(imported);
      expect(await run()).toEqual({ outcome: "duplicate" });
      expect(payments.docs.get(PAYMENT_ID)._etag).toBe(seeded._etag);
      expect(stored(invoices, "inv1").status).toBe("sent");
      expect(sendEmails).not.toHaveBeenCalled();
    });
  });

  describe("an invoice that cannot be checked", () => {
    it("records the payment but leaves an invoice with no total open", async () => {
      const { invoices, payments, sendEmails, log, run } = setup({
        invoice: invoiceDoc({ total: undefined }),
      });
      expect(await run()).toEqual({ outcome: "recorded" });
      expect(stored(invoices, "inv1").status).toBe("sent");
      expect(stored(payments, PAYMENT_ID)).toMatchObject({ amount: 500, invoiceApplied: true });
      expect(sendEmails.mock.calls[0][0].settlement).toMatchObject({
        settles: false,
        unverifiedTotal: true,
      });
      expect(log.error).toHaveBeenCalledWith(
        "paystack-webhook: invoice INV-2026-0042 NOT marked paid — it has no usable total (undefined) to check ₵500.00 against",
      );
    });

    it.each([0, -5, "abc"])("does not close an invoice whose total is %s", async (total) => {
      const { invoices, run } = setup({ invoice: invoiceDoc({ total }) });
      await run();
      expect(stored(invoices, "inv1").status).toBe("sent");
    });

    it("un-archives but does not close an archived invoice with no total", async () => {
      const { invoices, run } = setup({
        invoice: invoiceDoc({ total: null, archivedAt: "2026-10-11T00:00:00.000Z" }),
      });
      await run();
      expect(stored(invoices, "inv1")).toMatchObject({ status: "sent", archivedAt: null });
    });

    it("treats an invoice without a currency as cedis", async () => {
      const { invoices, sendEmails, run } = setup({ invoice: invoiceDoc({ currency: undefined }) });
      await run({ currency: "USD" });
      expect(stored(invoices, "inv1").status).toBe("sent");
      expect(sendEmails.mock.calls[0][0].settlement).toMatchObject({
        currencyMismatch: true,
        invoiceCurrency: "GHS",
      });
    });

    it("still closes an invoice without a currency paid in cedis", async () => {
      const { invoices, run } = setup({ invoice: invoiceDoc({ currency: undefined }) });
      await run();
      expect(stored(invoices, "inv1").status).toBe("paid");
    });

    it("marks nothing when two invoices share the number", async () => {
      const { invoices, payments, sendEmails, run } = setup();
      invoices.seed(invoiceDoc({ id: "inv2" }));
      expect(await run()).toEqual({ outcome: "ambiguous-invoice" });
      expect(stored(invoices, "inv1").status).toBe("sent");
      expect(stored(invoices, "inv2").status).toBe("sent");
      expect(payments.docs.size).toBe(0);
      expect(sendEmails).not.toHaveBeenCalled();
    });
  });
});

describe("claimRetryAlert", () => {
  const claim = (ctx) =>
    claimRetryAlert({
      store: ctx.store,
      locks: createCosmosLocks(ctx.db),
      reference: REFERENCE,
      invoiceNumber: "INV-2026-0042",
      log: ctx.log,
    });

  it("lets only the first failure before the payment row mail the admin", async () => {
    const ctx = setup();
    expect(await claim(ctx)).toBe(true);
    expect(await claim(ctx)).toBe(false);
    expect(ctx.db.container("locks").docs.has(lockId(`alert:${REFERENCE}`))).toBe(true);
  });

  it("records the alert on the payment row once it exists", async () => {
    const ctx = setup();
    failNext(ctx.invoices, "beforeReplace", 2);
    await expect(ctx.run()).rejects.toThrow();
    expect(await claim(ctx)).toBe(true);
    expect(stored(ctx.payments, PAYMENT_ID).alertedAt).toEqual(expect.any(String));
    await expect(ctx.run()).rejects.toThrow();
    expect(await claim(ctx)).toBe(false);
  });

  it("does not mail again after the row appears if it mailed before", async () => {
    const ctx = setup();
    expect(await claim(ctx)).toBe(true);
    failNext(ctx.invoices, "beforeReplace", 1);
    await expect(ctx.run()).rejects.toThrow();
    expect(await claim(ctx)).toBe(false);
  });

  it("gives exactly one of several concurrent claims", async () => {
    const ctx = setup();
    const results = await Promise.all([claim(ctx), claim(ctx), claim(ctx)]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("can be claimed again once a claim whose email failed is released", async () => {
    const ctx = setup();
    failNext(ctx.invoices, "beforeReplace", 1);
    await expect(ctx.run()).rejects.toThrow();
    expect(await claim(ctx)).toBe(true);
    await releaseRetryAlert({
      store: ctx.store,
      locks: createCosmosLocks(ctx.db),
      reference: REFERENCE,
      invoiceNumber: "INV-2026-0042",
    });
    expect(stored(ctx.payments, PAYMENT_ID).alertedAt).toBeNull();
    expect(ctx.db.container("locks").docs.has(lockId(`alert:${REFERENCE}`))).toBe(false);
    expect(await claim(ctx)).toBe(true);
    expect(await claim(ctx)).toBe(false);
  });

  it("still gives the lock back when alertedAt cannot be cleared", async () => {
    const ctx = setup();
    failNext(ctx.invoices, "beforeReplace", 1);
    await expect(ctx.run()).rejects.toThrow();
    expect(await claim(ctx)).toBe(true);
    failNext(ctx.payments, "beforeReplace", 10);
    const log = { warn: vi.fn() };
    await releaseRetryAlert({
      store: ctx.store,
      locks: createCosmosLocks(ctx.db),
      reference: REFERENCE,
      invoiceNumber: "INV-2026-0042",
      log,
    });
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining("could not clear alertedAt"));
    expect(ctx.db.container("locks").docs.has(lockId(`alert:${REFERENCE}`))).toBe(false);
  });

  it("keeps the claim when alertedAt cannot be written", async () => {
    const ctx = setup();
    failNext(ctx.invoices, "beforeReplace", 1);
    await expect(ctx.run()).rejects.toThrow();
    failNext(ctx.payments, "beforeReplace", 1);
    expect(await claim(ctx)).toBe(true);
    expect(ctx.log.error).toHaveBeenCalledWith(expect.stringContaining("could not note alertedAt"));
  });

  it("does not write to a row that belongs to another charge", async () => {
    const ctx = setup();
    const seeded = ctx.payments.seed({
      id: PAYMENT_ID,
      paystackReference: REFERENCE,
      quoteNumber: "Q-2026-0001",
    });
    expect(await claim(ctx)).toBe(true);
    expect(ctx.payments.docs.get(PAYMENT_ID)._etag).toBe(seeded._etag);
  });
});

describe("claimEscalation", () => {
  const LOCK_ID = lockId(`alert:${REFERENCE}`);
  const FIRST = new Date("2026-10-17T10:00:00.000Z");
  const at = (ms) => () => new Date(FIRST.getTime() + ms);
  const seedLock = (db, fields) =>
    db.container("locks").seed({ id: LOCK_ID, key: `alert:${REFERENCE}`, ...fields });

  it("claims once, and only from 24 hours after firstFailedAt", async () => {
    const { db, store } = setup();
    seedLock(db, { createdAt: FIRST.toISOString(), firstFailedAt: FIRST.toISOString() });
    const claim = (now) => claimEscalation({ store, reference: REFERENCE, now });
    expect(await claim(at(ESCALATE_AFTER_MS - 1))).toBe(false);
    expect(await claim(at(ESCALATE_AFTER_MS))).toBe(true);
    expect(await claim(at(ESCALATE_AFTER_MS + 1))).toBe(false);

    await releaseEscalation({ store, reference: REFERENCE });
    expect(db.container("locks").docs.get(LOCK_ID).escalatedAt).toBeNull();
    expect(await claim(at(ESCALATE_AFTER_MS + 2))).toBe(true);
  });

  it("falls back to the lock's createdAt without firstFailedAt", async () => {
    const { db, store } = setup();
    seedLock(db, { createdAt: FIRST.toISOString() });
    expect(await claimEscalation({ store, reference: REFERENCE, now: at(ESCALATE_AFTER_MS) })).toBe(
      true,
    );
  });

  it("claims nothing when the alert lock is gone", async () => {
    const { store } = setup();
    expect(await claimEscalation({ store, reference: REFERENCE, now: at(ESCALATE_AFTER_MS) })).toBe(
      false,
    );
    await expect(releaseEscalation({ store, reference: REFERENCE })).resolves.toBeUndefined();
  });

  it("starts from the firstFailedAt claimRetryAlert notes on the lock", async () => {
    const { db, store, log } = setup();
    expect(
      await claimRetryAlert({
        store,
        locks: createCosmosLocks(db),
        reference: REFERENCE,
        invoiceNumber: "INV-2026-0042",
        log,
        now: () => FIRST,
      }),
    ).toBe(true);
    expect(db.container("locks").docs.get(LOCK_ID).firstFailedAt).toBe(FIRST.toISOString());
  });
});
