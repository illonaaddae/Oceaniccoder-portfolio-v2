// The invoice kind of shared/access/core.js, for one-off invoice pay links
// (/pay/<number>?s=<signature>). Design:
// docs/plans/2026-10-25-invoice-receipt-access-codes.md (8.2 to 8.4).
//
// An invoice has no revision and no stored link token: its revision is 0,
// and a link code is bound to "pay:<number>", the current access epoch and
// the client email on the row. Changing the row's client email ends every
// unlock; Reset access (a new epoch) ends them all.

const { HttpError } = require("../http");
const { createAccess } = require("../access/core");
const { canOpenInvoice, hasSignature, unsignedGraceCovers } = require("../invoiceLinks");
const T = require("../email/quoteEmails");
const V = require("../quotes/views");

const CONTACT = "hello@oceaniccoder.dev";
const MAX_NUMBER_LENGTH = 40;
// signLink in shared/tokens.js cuts every signature to 32 characters.
const SIGNATURE_LENGTH = 32;

// get-invoice's answer for every locator failure, so the pay page shows the
// same thing whichever call failed and a guess learns nothing.
const INVOICE_NOT_FOUND =
  "This payment link is not valid. Ask us for a new one at hello@oceaniccoder.dev.";

function invoiceSubject(invoice) {
  return {
    id: invoice.id,
    revision: 0,
    linkId: `pay:${invoice.invoiceNumber}`,
    clientEmail: invoice.clientEmail,
    scopeId: invoice.id,
    logName: invoice.invoiceNumber,
  };
}

const INVOICE_SCHEME = {
  label: "ia",
  rows: "ia",
  cookie: "ia",
  gateVar: "INVOICE_ACCESS_GATE",
  logTag: "invoice-access",
  unavailable: "Invoice links are unavailable right now. Please try again later.",
  locked: "Enter the code we email you to open this invoice.",
  subject: invoiceSubject,
};

const invoiceAccess = createAccess(INVOICE_SCHEME);

const notFound = () => new HttpError(404, INVOICE_NOT_FOUND, { inactive: true });

/**
 * Finds an invoice from { number, s } with get-invoice's rules: a signature
 * that is present must be right; a missing one opens only an old unpaid
 * invoice until the grace ends (shared/invoiceLinks.js). Every failure is the
 * same 404, and check() and the signature test run before any lookup.
 * env supplies RECEIPT_SIGNING_SECRET, which signs pay links.
 */
function invoiceLocator({ env = process.env } = {}) {
  return {
    check(body) {
      const { number, s } = body;
      if (typeof number !== "string" || !number || number.length > MAX_NUMBER_LENGTH)
        throw notFound();
      if (hasSignature(s) && (typeof s !== "string" || s.length !== SIGNATURE_LENGTH))
        throw notFound();
    },
    async find(svc, body) {
      const nowMs = svc.now().getTime();
      if (!canOpenInvoice(body.number, body.s, env.RECEIPT_SIGNING_SECRET, nowMs)) throw notFound();
      // The first of any rows sharing the number, as get-invoice takes.
      const [invoice] = await svc.invoices.findInvoicesByNumber(body.number);
      if (!invoice) throw notFound();
      if (!hasSignature(body.s) && !unsignedGraceCovers(invoice)) throw notFound();
      return invoice;
    },
    // Old invoice numbers are a timestamp's last six digits, so an unsigned
    // link can be guessed.
    guessable: (body) => !hasSignature(body.s),
  };
}

const invoiceEmails = {
  code: (invoice, code, minutes) =>
    T.accessCode({
      kind: "invoice",
      clientFirstName: V.firstName(invoice.clientName),
      number: invoice.invoiceNumber,
      code,
      minutes,
    }),
  lockedAlert: (invoice, at, blocked) =>
    T.accessLockedAlert({
      kind: "invoice",
      blocked,
      clientName: invoice.clientName || "",
      number: invoice.invoiceNumber,
      lockedOn: V.formatDate(at),
      adminLink: `${V.siteBase()}/admin/dashboard`,
    }),
};

const invoiceLabels = {
  ref: "invoice",
  noEmail: `This invoice can't be opened with a code. Contact ${CONTACT} to open it.`,
  gateOff: "This invoice opens without a code right now.",
  blocked: `Too many wrong codes were entered on this link, so no more codes will be sent. Contact ${CONTACT} to open it.`,
};

module.exports = {
  INVOICE_SCHEME,
  INVOICE_NOT_FOUND,
  invoiceSubject,
  invoiceAccess,
  invoiceLocator,
  invoiceEmails,
  invoiceLabels,
};
