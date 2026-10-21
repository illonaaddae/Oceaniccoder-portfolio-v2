// Signed pay links for one-off invoices: /pay/<invoiceNumber>?s=<signature>.
// Invoice numbers are guessable, so the pay page only shows an invoice to a
// request that carries the signature from the email or the admin dashboard.

const { signInvoice, verifyInvoice } = require("./tokens");

// Invoice emails sent before signed links shipped carry no signature. Those
// links keep working until this date (30 days after the 2026-10-21 release),
// then answer 404 like any unsigned request. Hard-coded rather than an env var
// so a typo in app settings cannot reopen unsigned access.
const UNSIGNED_LINKS_ACCEPTED_UNTIL = Date.parse("2026-11-21T00:00:00.000Z");

/** Throws when the secret is missing: a pay link without a signature is no use. */
function invoicePayPath(invoiceNumber, secret) {
  return `/pay/${encodeURIComponent(invoiceNumber)}?s=${signInvoice(invoiceNumber, secret)}`;
}

/**
 * True when the request may see the invoice. A signature that is present but
 * wrong is always refused; only a missing one falls back to the grace period.
 */
function canOpenInvoice(invoiceNumber, sig, secret, now = Date.now()) {
  if (sig !== undefined && sig !== null && sig !== "") {
    return verifyInvoice(invoiceNumber, sig, secret);
  }
  return now < UNSIGNED_LINKS_ACCEPTED_UNTIL;
}

module.exports = { UNSIGNED_LINKS_ACCEPTED_UNTIL, invoicePayPath, canOpenInvoice };
