// The receipt kind of shared/access/core.js, for quote payment receipt links
// (/receipt/<reference>?s=<signature>). Design:
// docs/plans/2026-10-25-invoice-receipt-access-codes.md (8.2 to 8.4).
//
// A receipt has its own HMAC labels and cookie ("ra"), so a receipt unlock
// opens that receipt only, never the quote or another receipt. Its epoch,
// send quotas and wrong-code count are its quote's ("qa" rows, scoped by the
// quote id at the quote's revision): New link or Revise on the quote ends
// receipt unlocks too, and several receipt links give no extra guesses or
// sends. Codes go to the quote's client email, not the payer's typed one
// (owner decision Q1, 2026-10-26). The quote scheme prunes the shared rows.

const { HttpError } = require("../http");
const { createAccess } = require("../access/core");
const { verifyReceipt } = require("../tokens");
const T = require("../email/quoteEmails");
const V = require("../quotes/views");

const CONTACT = "hello@oceaniccoder.dev";
const MAX_REFERENCE_LENGTH = 80;
// signLink in shared/tokens.js cuts every signature to 32 characters.
const SIGNATURE_LENGTH = 32;

// quote-receipt's answer for every locator failure.
const RECEIPT_NOT_FOUND = "Receipt not found.";

function receiptSubject(quote, payment) {
  const reference = payment.paystackReference;
  return {
    id: reference,
    revision: quote.revision,
    linkId: `receipt:${reference}`,
    clientEmail: quote.clientEmail,
    scopeId: quote.id,
    logName: reference,
  };
}

const RECEIPT_SCHEME = {
  label: "ra",
  rows: "qa",
  cookie: "ra",
  prunes: false,
  gateVar: "RECEIPT_ACCESS_GATE",
  logTag: "receipt-access",
  unavailable: "Receipt links are unavailable right now. Please try again later.",
  locked: "Enter the code we email you to open this receipt.",
  // The record is what receiptLocator finds: { quote, payment }.
  subject: ({ quote, payment }) => receiptSubject(quote, payment),
};

const receiptAccess = createAccess(RECEIPT_SCHEME);

const notFound = () => new HttpError(404, RECEIPT_NOT_FOUND, { inactive: true });

/**
 * Finds a receipt from { reference, s } with quote-receipt's rules: a right
 * signature, a successful quote payment, and its quote. Every failure is the
 * same 404, and check() and the signature test run before any lookup. env
 * supplies RECEIPT_SIGNING_SECRET, which signs receipt links.
 */
function receiptLocator({ env = process.env } = {}) {
  return {
    check(body) {
      const { reference, s } = body;
      if (typeof reference !== "string" || !reference || reference.length > MAX_REFERENCE_LENGTH)
        throw notFound();
      if (typeof s !== "string" || s.length !== SIGNATURE_LENGTH) throw notFound();
    },
    async find(svc, body) {
      if (!verifyReceipt(body.reference, body.s, env.RECEIPT_SIGNING_SECRET)) throw notFound();
      const payment = await svc.repo.findPaymentByReference(body.reference);
      if (!payment || payment.kind !== "quote" || payment.status !== "success") throw notFound();
      const quote = await svc.repo.get(payment.quoteId);
      if (!quote) throw notFound();
      return { quote, payment };
    },
  };
}

const receiptEmails = {
  code: ({ quote, payment }, code, minutes) =>
    T.accessCode({
      kind: "receipt",
      clientFirstName: V.firstName(quote.clientName),
      number: payment.paystackReference,
      code,
      minutes,
    }),
  // Receipt lockouts count against the quote, so the owner gets the quote's
  // alert, naming the receipt.
  lockedAlert: ({ quote, payment }, at, blocked) =>
    T.accessLockedAlert({
      ...V.accessLockedView(quote, at, blocked),
      reference: payment.paystackReference,
    }),
};

const receiptLabels = {
  ref: "receipt",
  noEmail: `This receipt can't be opened with a code. Contact ${CONTACT} to open it.`,
  gateOff: "This receipt opens without a code right now.",
  blocked: `Too many wrong codes were entered on this quote's links, so no more codes will be sent. Contact ${CONTACT} to open it.`,
};

module.exports = {
  RECEIPT_SCHEME,
  RECEIPT_NOT_FOUND,
  receiptSubject,
  receiptAccess,
  receiptLocator,
  receiptEmails,
  receiptLabels,
};
