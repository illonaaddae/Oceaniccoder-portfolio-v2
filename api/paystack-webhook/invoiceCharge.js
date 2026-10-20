// Records a Paystack charge against an invoice on Cosmos DB
// (DATA_BACKEND=cosmos). Same outcome as the Appwrite branch in index.js:
// the payments row, the invoice marked paid (or only un-archived when the
// money does not settle it) and the same emails. The difference is that
// every step is written down on the payments row, so a crash or a second
// delivery of the same event finishes the work instead of repeating it:
//
//   1. A row for the reference under an older (Appwrite) id: already
//      recorded before the cutover, so stop. So is a row at our id that
//      this flow did not write (no invoiceApplied field). A row at our id
//      for another charge is a conflict and is left alone.
//   2. Find the invoice (exactly one; several with the number stop here).
//      A row from an earlier attempt names its invoiceId; that invoice is
//      used, and the charge stops if it is gone or renumbered.
//      settle() decides paid or left open: evaluateSettlement as on
//      Appwrite, except that an invoice without a currency is in GHS and
//      one without a usable total stays open.
//   3. Create the row at paymentIdFor(reference) with invoiceApplied false,
//      the invoiceId and the settlement (settles, expected, invoiceCurrency).
//      A 409 means another delivery created it first; carry on from it. From
//      here on the stored settlement decides, so an edit to the invoice total
//      between a crash and the retry does not change what the retry does.
//   4. Not applied yet: change the invoice, then set invoiceApplied.
//   5. Not notified yet: claim the emails, send them, set notifiedAt. A
//      crash between sending and notifiedAt resends them (at least once).
//
// Store errors are thrown. The caller alerts (once per reference, see
// claimRetryAlert and releaseRetryAlert) and answers 500, so Paystack retries and the next delivery
// resumes at the first step not done.

const { evaluateSettlement } = require("./settlement");
const { lockId, paymentIdFor } = require("../shared/tokens");

// A delivery that claims the emails and then dies leaves its claim behind;
// once it is this old another delivery takes over. Longer than a function
// run, shorter than Paystack's first retry interval.
const NOTIFY_CLAIM_MS = 2 * 60 * 1000;

// A payment still failing this long after its first alert gets one more
// email: Paystack stops retrying 72 hours after the charge, and by then it
// has to be recorded by hand.
const ESCALATE_AFTER_MS = 24 * 60 * 60 * 1000;

// Invoices written before currencies were stored are in cedis.
const DEFAULT_INVOICE_CURRENCY = "GHS";

const currencySymbol = (currency) => (currency === "GHS" ? "₵" : currency);

/**
 * What a payments row at paymentIdFor(reference) means for this charge. The
 * id comes from the reference alone, so a quote payment or a row for another
 * invoice could sit there; that row is never touched.
 */
function rowState(row, { reference, invoiceNumber }) {
  if (
    row.paystackReference !== reference ||
    row.quoteNumber ||
    row.stageId ||
    row.invoiceNumber !== invoiceNumber
  ) {
    return "conflict";
  }
  // Only this flow writes invoiceApplied. A row without it was imported or
  // written some other way, after the work it stands for was done.
  if (!Object.prototype.hasOwnProperty.call(row, "invoiceApplied")) return "duplicate";
  if (row.invoiceApplied && row.notifiedAt) return "duplicate";
  return "resume";
}

async function createOrRead(store, row) {
  try {
    return await store.createPayment(row);
  } catch (err) {
    if (!err || err.code !== 409) throw err;
    const existing = await store.readPayment(row.id);
    if (!existing) throw new Error(`payment ${row.id} conflicted on create but cannot be read`);
    return existing;
  }
}

// Paid when the money settles the invoice, otherwise only un-archived: an
// archived invoice that receives any money must not stay hidden. Decided on
// the invoice as stored at each attempt, so an archive that lands between
// the read and the write is cleared on the retry the etag forces.
function invoiceChange(settles) {
  return (current) => {
    const unarchive = current.archivedAt ? { archivedAt: null } : null;
    if (settles) return { status: "paid", ...unarchive };
    return unarchive;
  };
}

// evaluateSettlement as on Appwrite, with two stricter rules for Cosmos: an
// invoice without a currency is in cedis (not whatever was paid), and one
// without a usable total stays open, because nothing can be checked.
function settle({ amountPaid, currency, invoice }) {
  const settlement = evaluateSettlement({
    amountPaid,
    currency,
    invoice: { ...invoice, currency: invoice.currency || DEFAULT_INVOICE_CURRENCY },
  });
  if (settlement.knownTotal) return settlement;
  return { ...settlement, settles: false, unverifiedTotal: true };
}

/**
 * The settlement a payments row was created with, or null for a row written
 * before it was stored. A resumed run must finish with the decision the first
 * run applied to the invoice: settling against the invoice as it is now would
 * tell the client and admin something else after an edit to its total.
 */
function recordedSettlement(row) {
  if (!Object.prototype.hasOwnProperty.call(row, "settles")) return null;
  return settle({
    amountPaid: row.amount,
    currency: row.currency,
    invoice: { total: row.expected, currency: row.invoiceCurrency },
  });
}

function notPaidReason({ settlement, amountPaid, currency, invoice }) {
  const sym = currencySymbol(currency);
  if (settlement.currencyMismatch) {
    return `paid in ${settlement.paidCurrency} but invoiced in ${settlement.invoiceCurrency}`;
  }
  if (settlement.unverifiedTotal) {
    return `it has no usable total (${invoice.total}) to check ${sym}${amountPaid.toFixed(2)} against`;
  }
  return `paid ${sym}${amountPaid.toFixed(2)} against a total of ${sym}${settlement.expected.toFixed(2)}`;
}

/** Marks a store error as raised after the payment was fully recorded. */
function markRecorded(err) {
  const error = err instanceof Error ? err : new Error(String(err));
  error.paymentRecorded = true;
  return error;
}

/**
 * @param {object} args
 * @param {object} args.store       createCosmosInvoiceStore(db)
 * @param {object} args.charge      { reference, invoiceNumber, amountPaid, currency, method }
 * @param {Function} args.sendEmails  ({ invoiceNumber, clientName, clientEmail,
 *                                    amountPaid, currency, reference, settlement }) => Promise
 * @param {object} args.log         context.log
 * @param {Function} [args.now]
 * Store errors are thrown; one thrown after the invoice change was recorded
 * has paymentRecorded: true, as only the emails are left to finish.
 * @returns {Promise<{ outcome: "recorded" | "duplicate" | "conflict" | "no-invoice"
 *   | "ambiguous-invoice" | "busy" }>}
 *   "conflict": the row at our id belongs to another charge, or the invoice
 *   it was created for is gone or no longer has this number.
 *   "busy": another delivery is sending the emails right now; answer so that
 *   Paystack retries, and the retry will find the work done.
 */
async function recordInvoiceCharge(args) {
  // Set once the payments row is seen with invoiceApplied: from then on the
  // payment is recorded whatever fails, and the caller must not say otherwise.
  const progress = { applied: false };
  try {
    return await recordSteps(args, progress);
  } catch (err) {
    throw progress.applied ? markRecorded(err) : err;
  }
}

async function recordSteps({ store, charge, sendEmails, log, now = () => new Date() }, progress) {
  const { reference, invoiceNumber, amountPaid, currency, method } = charge;
  if (typeof reference !== "string" || !reference) {
    throw new Error("a payment without a Paystack reference cannot be recorded exactly once");
  }
  const paymentId = paymentIdFor(reference);
  const duplicate = () => {
    log.info(
      `paystack-webhook: reference ${reference} already recorded — ignoring duplicate delivery`,
    );
    return { outcome: "duplicate" };
  };
  // null to carry on with the row, or the outcome to stop with.
  const stopFor = (row) => {
    const state = rowState(row, charge);
    if (state === "conflict") {
      log.error(
        `paystack-webhook: payments row ${paymentId} does not belong to invoice ${invoiceNumber} — left alone`,
      );
      return { outcome: "conflict" };
    }
    return state === "duplicate" ? duplicate() : null;
  };

  let payment = await store.readPayment(paymentId);
  if (!payment) {
    // A row under any other id was written by the Appwrite webhook, which
    // finished all its work in one go. A row under our id means a concurrent
    // delivery created it after the read above, so resume it.
    const older = await store.findPaymentByReference(reference);
    if (older && older.id !== paymentId) return duplicate();
    payment = older;
  }
  if (payment) {
    const stop = stopFor(payment);
    if (stop) return stop;
    if (payment.invoiceApplied) progress.applied = true;
  }

  // A resumed row names the invoice it was created for. Looking the number up
  // again could find another invoice if the admin renumbered this one and
  // gave its number to another meanwhile, so the row's invoice is used, and
  // the payment stops if that invoice is gone or numbered differently now.
  const boundInvoice = async (row) => {
    const bound = await store.readInvoice(row.invoiceId);
    if (bound && bound.invoiceNumber === invoiceNumber) return bound;
    log.error(
      `paystack-webhook: invoice ${row.invoiceId} of payments row ${paymentId} is gone or no longer numbered ${invoiceNumber} — left alone`,
    );
    return null;
  };
  const hasInvoiceId = (row) => typeof row.invoiceId === "string" && row.invoiceId !== "";

  let invoice;
  if (payment && hasInvoiceId(payment)) {
    invoice = await boundInvoice(payment);
    if (!invoice) return { outcome: "conflict" };
  } else {
    // Rows written before invoiceId was stored keep the lookup by number.
    const matches = await store.findInvoicesByNumber(invoiceNumber);
    if (matches.length === 0) return { outcome: "no-invoice" };
    if (matches.length > 1) return { outcome: "ambiguous-invoice" };
    [invoice] = matches;
  }

  const clientName = invoice.clientName || "Client";
  const clientEmail = invoice.clientEmail;
  const current = settle({ amountPaid, currency, invoice });

  if (!payment) {
    payment = await createOrRead(store, {
      id: paymentId,
      invoiceNumber,
      clientName,
      clientEmail: clientEmail || "",
      amount: amountPaid,
      currency,
      method,
      paystackReference: reference,
      paidAt: now().toISOString(),
      status: "success",
      invoiceApplied: false,
      invoiceId: invoice.id,
      settles: current.settles,
      expected: current.expected,
      invoiceCurrency: current.invoiceCurrency,
    });
    const stop = stopFor(payment);
    if (stop) return stop;
    if (payment.invoiceApplied) progress.applied = true;
    // A concurrent delivery created the row first, for another invoice.
    if (hasInvoiceId(payment) && payment.invoiceId !== invoice.id) {
      invoice = await boundInvoice(payment);
      if (!invoice) return { outcome: "conflict" };
    }
    log.info(`paystack-webhook: payment record created for ${invoiceNumber}`);
  }

  const settlement = recordedSettlement(payment) || current;
  if (settlement.unverifiedTotal) {
    log.error(
      `paystack-webhook: invoice ${invoiceNumber} has no usable total (${invoice.total}) — recording the payment and leaving the invoice open`,
    );
  }

  if (!payment.invoiceApplied) {
    await store.updateInvoice(invoice.id, invoiceChange(settlement.settles));
    if (settlement.settles) {
      log.info(`paystack-webhook: invoice ${invoiceNumber} marked as paid`);
    } else {
      log.error(
        `paystack-webhook: invoice ${invoiceNumber} NOT marked paid — ` +
          notPaidReason({ settlement, amountPaid, currency, invoice }),
      );
    }
    ({ doc: payment } = await store.updatePayment(paymentId, (current) =>
      current.invoiceApplied ? null : { invoiceApplied: true },
    ));
  }
  progress.applied = true;

  if (payment.notifiedAt) return { outcome: "recorded" };

  const claimedAt = now();
  const claim = await store.updatePayment(paymentId, (current) => {
    if (current.notifiedAt) return null;
    const previous = Date.parse(current.notifyClaimedAt || "");
    if (Number.isFinite(previous) && claimedAt.getTime() - previous < NOTIFY_CLAIM_MS) return null;
    return { notifyClaimedAt: claimedAt.toISOString() };
  });
  if (!claim.changed) {
    if (claim.doc.notifiedAt) return { outcome: "recorded" };
    log.info(`paystack-webhook: another delivery is sending the emails for ${reference}`);
    return { outcome: "busy" };
  }

  await sendEmails({
    invoiceNumber,
    clientName,
    clientEmail,
    amountPaid,
    currency,
    reference,
    settlement,
  });
  await store.updatePayment(paymentId, () => ({ notifiedAt: now().toISOString() }));
  return { outcome: "recorded" };
}

const ALERT_KEY = (reference) => `alert:${reference}`;

/**
 * Whether this delivery should email the admin about a retryable failure.
 * Paystack retries for days, so only one email goes per reference (and one
 * escalation a day later, see claimEscalation); the caller logs every attempt. The `alert:<reference>` lock is the only gate:
 * creating it is atomic, so of any number of concurrent deliveries exactly
 * one gets true. Once this charge's payments row exists, alertedAt records
 * on it that the admin was told.
 *
 * The claim is taken before the send, not after, because only a claim taken
 * first keeps concurrent deliveries to one email. If the send fails the
 * caller gives it back with releaseRetryAlert, so the next retry mails.
 */
async function claimRetryAlert({
  store,
  locks,
  reference,
  invoiceNumber,
  log,
  now = () => new Date(),
}) {
  if (!(await locks.take(ALERT_KEY(reference)))) return false;
  // The claim is the lock. firstFailedAt and alertedAt are only records, so
  // failing to write them must not undo the claim: the lock would stay taken
  // with no email. Without firstFailedAt, claimEscalation uses the lock's
  // createdAt, which is the same moment.
  try {
    await store.updateLock(lockId(ALERT_KEY(reference)), (lock) =>
      lock.firstFailedAt ? null : { firstFailedAt: now().toISOString() },
    );
  } catch (err) {
    log.error(`paystack-webhook: could not note firstFailedAt for ${reference}: ${err.message}`);
  }
  try {
    const paymentId = paymentIdFor(reference);
    const row = await store.readPayment(paymentId);
    if (row && rowState(row, { reference, invoiceNumber }) !== "conflict") {
      await store.updatePayment(paymentId, (current) =>
        current.alertedAt ? null : { alertedAt: now().toISOString() },
      );
    }
  } catch (err) {
    log.error(`paystack-webhook: could not note alertedAt for ${reference}: ${err.message}`);
  }
  return true;
}

/**
 * Gives back a claim whose email did not go. alertedAt is cleared before the
 * lock is released, so a delivery that claims in between cannot have its
 * own alertedAt wiped. The lock is released even if the clear fails: the lock
 * is the claim, and a stale alertedAt is only a wrong record, while a lock
 * left behind would stop every later retry from emailing.
 */
async function releaseRetryAlert({ store, locks, reference, invoiceNumber, log }) {
  const paymentId = paymentIdFor(reference);
  try {
    const row = await store.readPayment(paymentId);
    if (row && rowState(row, { reference, invoiceNumber }) !== "conflict") {
      await store.updatePayment(paymentId, (current) =>
        current.alertedAt ? { alertedAt: null } : null,
      );
    }
  } catch (err) {
    log?.warn(`paystack-webhook: could not clear alertedAt for ${reference}: ${err.message}`);
  }
  await locks.release(ALERT_KEY(reference));
}

/**
 * Whether this delivery should send the one escalation for a reference whose
 * alert went out at least ESCALATE_AFTER_MS ago and which still fails. The
 * `escalatedAt` note on the alert lock is the claim: it is set with an etag
 * check, so of concurrent deliveries one gets true. If the send fails the
 * caller gives it back with releaseEscalation.
 */
async function claimEscalation({ store, reference, now = () => new Date() }) {
  const at = now();
  try {
    const { changed } = await store.updateLock(lockId(ALERT_KEY(reference)), (lock) => {
      if (lock.escalatedAt) return null;
      const since = Date.parse(lock.firstFailedAt || lock.createdAt || "");
      if (!Number.isFinite(since) || at.getTime() - since < ESCALATE_AFTER_MS) return null;
      return { escalatedAt: at.toISOString() };
    });
    return changed;
  } catch (err) {
    // The alert claim was given back in the meantime: nothing was alerted yet.
    if (err && err.code === 404) return false;
    throw err;
  }
}

/** Gives back an escalation claim whose email did not go. */
async function releaseEscalation({ store, reference }) {
  try {
    await store.updateLock(lockId(ALERT_KEY(reference)), (lock) =>
      lock.escalatedAt ? { escalatedAt: null } : null,
    );
  } catch (err) {
    if (!(err && err.code === 404)) throw err;
  }
}

module.exports = {
  recordInvoiceCharge,
  claimRetryAlert,
  releaseRetryAlert,
  claimEscalation,
  releaseEscalation,
  NOTIFY_CLAIM_MS,
  ESCALATE_AFTER_MS,
};
