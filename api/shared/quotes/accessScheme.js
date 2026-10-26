// The quote kind of shared/access/core.js. Every value here is already out in
// the world (cookie names, link codes in sent emails, lock rows), so none of
// them may change: access.golden.test.js pins what they produce.

const { createAccess } = require("../access/core");

const QUOTE_SCHEME = {
  label: "qa",
  rows: "qa",
  cookie: "qa",
  gateVar: "QUOTE_ACCESS_GATE",
  logTag: "quote-access",
  unavailable: "Quote links are unavailable right now. Please try again later.",
  locked: "Enter the code we email you to open this quote.",
  // A link code is bound to the quote's current link token; the epoch, send
  // quotas and wrong-code count are the quote's own.
  subject: (quote) => ({
    id: quote.id,
    revision: quote.revision,
    linkId: quote.tokenHash,
    clientEmail: quote.clientEmail,
    scopeId: quote.id,
    logName: quote.quoteNumber,
  }),
};

module.exports = { QUOTE_SCHEME, quoteAccess: createAccess(QUOTE_SCHEME) };
