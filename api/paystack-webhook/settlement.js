/**
 * Decides whether a Paystack charge actually settles an invoice.
 *
 * Kept out of the handler so the arithmetic is testable on its own. The charge
 * amount is set in the browser — the payment components hand Paystack Inline
 * `invoice.total * 100` — so it is caller-controlled and has to be checked
 * against the invoice server-side before anything is marked paid.
 */

/** Currency rounding only — not a discount. */
const TOLERANCE = 0.01;

/**
 * @param {object} args
 * @param {number} args.amountPaid  amount in the base unit (not pesewas)
 * @param {string} args.currency    currency Paystack reported
 * @param {object} args.invoice     the Appwrite invoice document
 */
function evaluateSettlement({ amountPaid, currency, invoice }) {
  const expected = Number(invoice?.total);
  const knownTotal = Number.isFinite(expected) && expected > 0;

  const invoiceCurrency = String(invoice?.currency || currency || "").toUpperCase();
  const paidCurrency = String(currency || "").toUpperCase();
  const currencyMismatch = Boolean(
    invoiceCurrency && paidCurrency && invoiceCurrency !== paidCurrency,
  );

  const paid = Number(amountPaid) || 0;
  const shortfall = knownTotal ? expected - paid : 0;
  const underpaid = knownTotal && shortfall > TOLERANCE;
  const overpaid = knownTotal && paid - expected > TOLERANCE;

  return {
    knownTotal,
    expected: knownTotal ? expected : null,
    shortfall: underpaid ? shortfall : 0,
    surplus: overpaid ? paid - expected : 0,
    underpaid,
    overpaid,
    currencyMismatch,
    invoiceCurrency,
    paidCurrency,
    // An invoice closes only when the money covers it in the right currency.
    // A shortfall is still recorded — the money did arrive — but leaves the
    // invoice open so it is chased rather than silently written off.
    settles: !underpaid && !currencyMismatch,
  };
}

module.exports = { evaluateSettlement, TOLERANCE };
