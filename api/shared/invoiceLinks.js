// Signed pay links for one-off invoices: /pay/<invoiceNumber>?s=<signature>.
// Invoice numbers are guessable, so the pay page only shows an invoice to a
// request that carries the signature from the email or the admin dashboard.

const { signInvoice, verifyInvoice } = require("./tokens");

// Invoice emails sent before signed links shipped carry no signature. Those
// links keep working until this date (30 days after the 2026-10-21 release),
// then answer 404 like any unsigned request. Hard-coded rather than an env var
// so a typo in app settings cannot reopen unsigned access.
const UNSIGNED_LINKS_ACCEPTED_UNTIL = Date.parse("2026-11-21T00:00:00.000Z");

// Only invoices that could have gone out by email unsigned get the grace:
// created before this date and not yet paid. It sits on the cutover date, a
// few days after this ships, so an invoice emailed by the old code during the
// deploy still opens; invoices created after it never open unsigned.
const UNSIGNED_INVOICES_CREATED_BEFORE = Date.parse("2026-10-28T00:00:00.000Z");

const hasSignature = (sig) => sig !== undefined && sig !== null && sig !== "";

/** Throws when the secret is missing: a pay link without a signature is no use. */
function invoicePayPath(invoiceNumber, secret) {
  return `/pay/${encodeURIComponent(invoiceNumber)}?s=${signInvoice(invoiceNumber, secret)}`;
}

/**
 * True when the request may see the invoice. A signature that is present but
 * wrong is always refused; only a missing one falls back to the grace period.
 */
function canOpenInvoice(invoiceNumber, sig, secret, now = Date.now()) {
  if (hasSignature(sig)) return verifyInvoice(invoiceNumber, sig, secret);
  return now < UNSIGNED_LINKS_ACCEPTED_UNTIL;
}

/**
 * For an unsigned request that canOpenInvoice let through: true only for an
 * unpaid invoice old enough to have been emailed without a signature. Drafts
 * and archived invoices stay in: editing a draft re-emails it with its status
 * unchanged, and archiving never ends the client's pay link.
 */
function unsignedGraceCovers(doc) {
  // Server-assigned numbers (INV-2026-0008) are sequential and so guessable,
  // and every email carrying one has a signed link: they never need the grace.
  if (/^INV-\d{4}-\d{4,}$/.test(String(doc && doc.invoiceNumber))) return false;
  // Rows imported from Appwrite carry $createdAt; rows written on Cosmos carry createdAt.
  const created = Date.parse(doc && (doc.$createdAt || doc.createdAt));
  return created < UNSIGNED_INVOICES_CREATED_BEFORE && doc.status !== "paid";
}

module.exports = {
  UNSIGNED_LINKS_ACCEPTED_UNTIL,
  UNSIGNED_INVOICES_CREATED_BEFORE,
  hasSignature,
  invoicePayPath,
  canOpenInvoice,
  unsignedGraceCovers,
};
