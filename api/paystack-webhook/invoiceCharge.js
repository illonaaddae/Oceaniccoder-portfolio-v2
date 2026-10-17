// Records a Paystack charge against an invoice on Cosmos DB
// (DATA_BACKEND=cosmos). Same outcome as the Appwrite branch in index.js:
// the payments row, the invoice marked paid (or only un-archived when the
// money does not settle it) and the same emails. The difference is that
// every step is written down on the payments row, so a crash or a second
// delivery of the same event finishes the work instead of repeating it:
//
//   1. A row for the reference under an older (Appwrite) id: already
//      recorded before the cutover, so stop.
//   2. Find the invoice; evaluateSettlement decides paid or left open.
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

const currencySymbol = (currency) => (currency === "GHS" ? "₵" : currency);

async function createOrResume(store, row) {
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

/**
 * @param {object} args
 * @param {object} args.store       createCosmosInvoiceStore(db)
 * @param {object} args.charge      { reference, invoiceNumber, amountPaid, currency, method }
 * @param {Function} args.sendEmails  ({ invoiceNumber, clientName, clientEmail,
 *                                    amountPaid, currency, reference, settlement }) => Promise
 * @param {object} args.log         context.log
 * @param {Function} [args.now]
 * @returns {Promise<{ outcome: "recorded" | "duplicate" | "no-invoice" | "busy" }>}
 *   "busy": another delivery is sending the emails right now; answer so that
 *   Paystack retries, and the retry will find the work done.
 */
async function recordInvoiceCharge({ store, charge, sendEmails, log, now = () => new Date() }) {
  const { reference, invoiceNumber, amountPaid, currency, method } = charge;
  if (typeof reference !== "string" || !reference) {
    throw new Error("a payment without a Paystack reference cannot be recorded exactly once");
  }
  const paymentId = paymentIdFor(reference);

  let payment = await store.readPayment(paymentId);
  if (!payment) {
    // A row under any other id was written by the Appwrite webhook, which
    // finished all its work in one go. A row under our id means a concurrent
    // delivery created it after the read above, so resume it.
    const older = await store.findPaymentByReference(reference);
    if (older && older.id !== paymentId) {
      log.info(
        `paystack-webhook: reference ${reference} already recorded — ignoring duplicate delivery`,
      );
      return { outcome: "duplicate" };
    }
    payment = older;
  }
  if (payment && payment.invoiceApplied && payment.notifiedAt) {
    log.info(
      `paystack-webhook: reference ${reference} already recorded — ignoring duplicate delivery`,
    );
    return { outcome: "duplicate" };
  }

  const invoice = await store.findInvoiceByNumber(invoiceNumber);
  if (!invoice) return { outcome: "no-invoice" };

  const clientName = invoice.clientName || "Client";
  const clientEmail = invoice.clientEmail;
  const settlement = evaluateSettlement({ amountPaid, currency, invoice });
  const { settles, currencyMismatch, knownTotal, expected, invoiceCurrency, paidCurrency } =
    settlement;
  if (!knownTotal) {
    log.warn(
      `paystack-webhook: invoice ${invoiceNumber} has no usable total (${invoice.total}) — recording the payment without verifying it`,
    );
  }

  if (!payment) {
    payment = await createOrResume(store, {
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
    log.info(`paystack-webhook: payment record created for ${invoiceNumber}`);
  }

  if (!payment.invoiceApplied) {
    await store.updateInvoice(invoice.id, invoiceChange(settles));
    if (settles) {
      log.info(`paystack-webhook: invoice ${invoiceNumber} marked as paid`);
    } else {
      const sym = currencySymbol(currency);
      log.error(
        `paystack-webhook: invoice ${invoiceNumber} NOT marked paid — ` +
          (currencyMismatch
            ? `paid in ${paidCurrency} but invoiced in ${invoiceCurrency}`
            : `paid ${sym}${amountPaid.toFixed(2)} against a total of ${sym}${expected.toFixed(2)}`),
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
