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
//   2. Find the invoice (exactly one); evaluateSettlement decides paid or
//      left open. An invoice without a usable total is never closed here.
//   3. Create the row at paymentIdFor(reference) with invoiceApplied false.
//      A 409 means another delivery created it first; carry on from it.
//   4. Not applied yet: change the invoice, then set invoiceApplied.
//   5. Not notified yet: claim the emails, send them, set notifiedAt. A
//      crash between sending and notifiedAt resends them (at least once).
//
// Store errors are thrown. The caller alerts and answers 500, so Paystack
// retries and the next delivery resumes at the first step not done.

const { evaluateSettlement } = require("./settlement");
const { paymentIdFor } = require("../shared/quotes/repo.cosmos");

// A delivery that claims the emails and then dies leaves its claim behind;
// once it is this old another delivery takes over. Longer than a function
// run, shorter than Paystack's first retry interval.
const NOTIFY_CLAIM_MS = 2 * 60 * 1000;

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

/**
 * @param {object} args
 * @param {object} args.store       createCosmosInvoiceStore(db)
 * @param {object} args.charge      { reference, invoiceNumber, amountPaid, currency, method }
 * @param {Function} args.sendEmails  ({ invoiceNumber, clientName, clientEmail,
 *                                    amountPaid, currency, reference, settlement }) => Promise
 * @param {object} args.log         context.log
 * @param {Function} [args.now]
 * @returns {Promise<{ outcome: "recorded" | "duplicate" | "conflict" | "no-invoice"
 *   | "ambiguous-invoice" | "busy" }>}
 *   "conflict": the row at our id belongs to another charge.
 *   "busy": another delivery is sending the emails right now; answer so that
 *   Paystack retries, and the retry will find the work done.
 */
async function recordInvoiceCharge({ store, charge, sendEmails, log, now = () => new Date() }) {
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
  }

  const matches = await store.findInvoicesByNumber(invoiceNumber);
  if (matches.length === 0) return { outcome: "no-invoice" };
  if (matches.length > 1) return { outcome: "ambiguous-invoice" };
  const [invoice] = matches;

  const clientName = invoice.clientName || "Client";
  const clientEmail = invoice.clientEmail;
  const settlement = settle({ amountPaid, currency, invoice });
  if (settlement.unverifiedTotal) {
    log.error(
      `paystack-webhook: invoice ${invoiceNumber} has no usable total (${invoice.total}) — recording the payment and leaving the invoice open`,
    );
  }

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
    });
    const stop = stopFor(payment);
    if (stop) return stop;
    log.info(`paystack-webhook: payment record created for ${invoiceNumber}`);
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

module.exports = { recordInvoiceCharge, NOTIFY_CLAIM_MS };
