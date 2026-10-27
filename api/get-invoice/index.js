/* global require, module */
// GET /api/get-invoice?number=INV-123456&s=<signature>[&admin=1]
// Fetches an invoice for its pay page. Needs the signature from the emailed or
// admin pay link; until 2026-11-21 an unsigned link still opens an old unpaid
// invoice (api/shared/invoiceLinks.js). Reads the invoice from Cosmos DB.
//
// Behind the invoice access gate (shared/invoices/access.js): once the link
// finds the invoice, a browser with no unlock gets 401 locked and nothing
// from the invoice. admin=1 (the dashboard's preview link) checks the admin
// session, only when there is no unlock. INVOICE_ACCESS_GATE=off answers as
// before the gate. Design: docs/plans/2026-10-25-invoice-receipt-access-codes.md (8.4).

const cosmos = require("../shared/cosmos");
const { errorReason } = require("../shared/errors");
const { withDeadline } = require("../shared/deadline");
const { HttpError } = require("../shared/http");
const { requireAdmin } = require("../shared/adminAuth");
const { adminCheck } = require("../shared/access/core");
const { createCosmosLocks } = require("../shared/locks");
const I = require("../shared/invoices/access");
const { createRateLimiter } = require("../shared/rateLimit");
const { clientIp } = require("../shared/turnstile");

// Only our own pages call this, and the answer holds a client's details, so
// no other origin may read it and no cache may keep it.
const CORS = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://oceaniccoder.dev",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  Vary: "Origin",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

// One reply for a bad signature, an unsigned link out of grace, an unknown
// number and a number two invoices share, so a guess learns nothing about
// which invoices exist. The text is doc-access's too.
const NOT_FOUND = { error: I.INVOICE_NOT_FOUND };

// Per instance. A client opens their pay page a handful of times; this caps
// anyone trying invoice numbers in bulk.
const LOOKUPS_PER_IP = 30;
const LOOKUP_WINDOW_MS = 10 * 60 * 1000;

const COLLECTION_ID = "invoices";

// Answer the pay page with an error rather than leave it waiting on a
// Cosmos endpoint that accepted the connection and never replied.
const READ_TIMEOUT_MS = 5000;

/** Up to two invoices with that number: enough to tell one from several. */
async function findInvoicesByNumber(number) {
  const { resources } = await withDeadline(READ_TIMEOUT_MS, (abortSignal) =>
    cosmos
      .getDatabase()
      .container(COLLECTION_ID)
      .items.query(
        {
          query: "SELECT TOP 2 * FROM c WHERE c.invoiceNumber = @number",
          parameters: [{ name: "@number", value: number }],
        },
        { abortSignal },
      )
      .fetchAll(),
  );
  return resources;
}

function createServices() {
  return {
    invoices: { findInvoicesByNumber },
    locks: createCosmosLocks(cosmos.getDatabase()),
    now: () => new Date(),
  };
}

const reply = (context, status, body) => {
  context.res = { status, headers: CORS, body: JSON.stringify(body) };
};

// Only the fields the pay page needs: no phone, no archive flag.
const publicView = (doc) => ({
  invoiceNumber: doc.invoiceNumber,
  clientName: doc.clientName,
  clientEmail: doc.clientEmail,
  total: doc.total,
  currency: doc.currency,
  status: doc.status,
  dueDate: doc.dueDate || null,
  estimatedDelivery: doc.estimatedDelivery || null,
});

/**
 * deps: services() gives { invoices: { findInvoicesByNumber }, locks, now };
 * env and requireAdmin replace process.env and shared/adminAuth in tests.
 */
function createHandler(deps) {
  const env = deps.env || process.env;
  const checkAdmin = deps.requireAdmin || requireAdmin;
  const allowFromIp = createRateLimiter({ limit: LOOKUPS_PER_IP, windowMs: LOOKUP_WINDOW_MS });

  return async function (context, req) {
    if (req.method === "OPTIONS") {
      context.res = { status: 204, headers: CORS, body: "" };
      return;
    }

    if (!allowFromIp(clientIp(req) || "unknown", 1, Date.now()))
      return reply(context, 429, { error: "Too many requests. Try again in a few minutes." });

    const query = req.query || {};
    const number = query.number || "";
    if (!number) return reply(context, 400, { error: "Missing invoice number" });

    // doc-access's rules and order for finding the invoice: the locator's
    // shape, then the switch and the secret (503), then the signature (or the
    // unsigned grace) before any lookup; two rows with the number fail
    // closed. Every locator failure is the same 404.
    const locator = I.invoiceLocator({ env, logWarn: (line) => context.log.warn(line) });
    const logError = (line) => context.log.error(line);
    const body = { number, s: query.s };
    try {
      const svc = deps.services();
      let doc;
      try {
        locator.check(body);
        if (I.invoiceAccess.gateEnabled(env, logError)) I.invoiceAccess.accessSecret(env, logError);
        doc = await locator.find(svc, body);
      } catch (err) {
        if (err instanceof HttpError && err.status === 404) return reply(context, 404, NOT_FOUND);
        throw err;
      }
      const via = await I.invoiceAccess.requireAccess({
        env,
        logError,
        locks: svc.locks,
        req,
        record: doc,
        nowMs: svc.now().getTime(),
        isAdmin: adminCheck(checkAdmin, context, req, query.admin),
      });
      return reply(
        context,
        200,
        via === "admin" ? { ...publicView(doc), preview: true } : publicView(doc),
      );
    } catch (err) {
      // 401 locked carries only the error and the flag; 503 only the error.
      if (err instanceof HttpError && err.status === 401) {
        context.log(`get-invoice locked number=${number}`);
        return reply(context, 401, { error: err.message, ...err.extra });
      }
      if (err instanceof HttpError && err.status === 503)
        return reply(context, 503, { error: err.message });
      context.log.error("get-invoice error:", errorReason(err));
      return reply(context, 500, { error: "Internal error" });
    }
  };
}

module.exports = createHandler({ services: createServices });
module.exports.createHandler = createHandler;
