// Numbers for one-off invoices, the rows in the `invoices` container:
// INV-<year>-<4-digit count>, counted per year and assigned here so two
// invoices never share one. get-invoice, the pay link and the Paystack
// webhook all find an invoice by its number.
//
// Rows numbered INV-<6 digits> by the old browser code keep their numbers
// and don't count towards the sequence. Quote stage invoices
// (<quoteNumber>-INV-<n>, quotes/model.js) have no row here and are numbered
// from their quote.

const { createWithNextNumber } = require("../numbering");

function standaloneInvoiceNumber(year, seq) {
  return `INV-${year}-${String(seq).padStart(4, "0")}`;
}

/**
 * Creates `doc` in the invoices container with the next number for `year`,
 * replacing any invoiceNumber it carries. Returns the row as stored.
 */
function createStandaloneInvoice(container, locks, doc, year = new Date().getUTCFullYear()) {
  return createWithNextNumber(container, locks, {
    field: "invoiceNumber",
    prefix: `INV-${year}-`,
    format: (seq) => standaloneInvoiceNumber(year, seq),
    build: (number) => ({ ...doc, invoiceNumber: number }),
    label: "invoice number",
  });
}

module.exports = { standaloneInvoiceNumber, createStandaloneInvoice };
