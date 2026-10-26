// POST /api/doc-access — opening a one-off invoice pay link or a quote
// payment receipt link in a new browser.
//   { kind: "invoice", number, s?, action, ... }
//   { kind: "receipt", reference, s, action, ... }
// The actions (status, claim, send, verify) and their answers are
// /api/quote-access's, from shared/access/endpoint.js; each kind brings its
// locator, emails, wording and switch (shared/invoices/access.js,
// shared/receipts/access.js). Design:
// docs/plans/2026-10-25-invoice-receipt-access-codes.md (8.4).
//
// Order of checks: POST, a known action, a known kind, the per-IP lookup
// limit, then the kind's endpoint: locator shape, the kind's switch, the
// secret, the record, the action. Locator failures answer one 404 per kind before any lock read or
// email. Logs name the invoice number or receipt reference only.

const { HttpError, readJson, handleError } = require("../shared/http");
const { createAccessEndpoint, isAccessAction } = require("../shared/access/endpoint");
const I = require("../shared/invoices/access");
const R = require("../shared/receipts/access");
const { getDatabase } = require("../shared/cosmos");
const { createCosmosInvoiceStore } = require("../shared/invoices/store.cosmos");
const { createServices } = require("../shared/quotes/service");
const { createRateLimiter } = require("../shared/rateLimit");
const { clientIp } = require("../shared/turnstile");

const LOG = "doc-access";
// Every action looks a record up, and a locator that finds nothing costs the
// caller nothing else, so lookups are capped per IP like get-invoice's: 30 in
// 10 minutes, per instance, for both kinds together. A client opening a page
// makes one to three.
const LOOKUPS_PER_IP = 30;
const LOOKUP_WINDOW_MS = 10 * 60 * 1000;

/**
 * deps as createAccessEndpoint's: services, and env, send, alertWaitMs for
 * tests; now, the lookup limiter's clock in ms, too.
 */
function createHandler(deps) {
  const env = deps.env || process.env;
  const now = deps.now || Date.now;
  const allowLookupFromIp = createRateLimiter({
    limit: LOOKUPS_PER_IP,
    windowMs: LOOKUP_WINDOW_MS,
  });
  const byKind = {
    invoice: createAccessEndpoint({
      ...deps,
      access: I.invoiceAccess,
      locator: I.invoiceLocator({ env }),
      emails: I.invoiceEmails,
      labels: { ...I.invoiceLabels, log: LOG },
    }),
    receipt: createAccessEndpoint({
      ...deps,
      access: R.receiptAccess,
      locator: R.receiptLocator({ env }),
      emails: R.receiptEmails,
      labels: { ...R.receiptLabels, log: LOG },
    }),
  };
  return async function (context, req) {
    try {
      if (req.method !== "POST") throw new HttpError(405, "Use POST.");
      const body = readJson(req);
      if (!isAccessAction(body.action)) throw new HttpError(400, "Unknown action.");
      if (!Object.hasOwn(byKind, body.kind)) throw new HttpError(400, "Unknown kind.");
      if (!allowLookupFromIp(clientIp(req) || "unknown", 1, now()))
        throw new HttpError(429, "Too many requests. Try again in a few minutes.");
      return await byKind[body.kind](context, req);
    } catch (err) {
      return handleError(context, err, LOG);
    }
  };
}

// Quotes and payments for receipts, invoice rows for invoices, and the locks.
function createDocServices() {
  return { ...createServices(), invoices: createCosmosInvoiceStore(getDatabase()) };
}

module.exports = createHandler({ services: createDocServices });
module.exports.createHandler = createHandler;
