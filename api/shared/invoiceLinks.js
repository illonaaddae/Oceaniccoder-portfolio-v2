// Signed pay links for one-off invoices: /pay/<invoiceNumber>?s=<signature>.
// Invoice numbers are guessable, so the pay page only shows an invoice to a
// request that carries the signature from the email or the admin dashboard.

const { signInvoice, verifyInvoice } = require("./tokens");

const hasSignature = (sig) => sig !== undefined && sig !== null && sig !== "";

/** Throws when the secret is missing: a pay link without a signature is no use. */
function invoicePayPath(invoiceNumber, secret) {
  return `/pay/${encodeURIComponent(invoiceNumber)}?s=${signInvoice(invoiceNumber, secret)}`;
}

/**
 * True when the request may see the invoice: only a signature that verifies.
 * Unsigned links (emails sent before signing shipped) no longer open; the
 * client asks for a new signed link instead.
 */
function canOpenInvoice(invoiceNumber, sig, secret) {
  return hasSignature(sig) && verifyInvoice(invoiceNumber, sig, secret);
}

module.exports = {
  invoicePayPath,
  canOpenInvoice,
};
