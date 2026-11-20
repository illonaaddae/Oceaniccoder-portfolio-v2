// GET /api/quote-receipt?reference=&s=[&admin=1] — a printable receipt behind
// an HMAC link. Receipt links don't expire and keep working after the quote
// link rotates, because they don't depend on the quote token.
//
// Behind the receipt access gate (shared/receipts/access.js): once the link
// finds the receipt, a browser with no unlock for that receipt, no unlock for
// its quote and no admin session (admin=1, checked only without an unlock)
// gets 401 locked and nothing from the receipt. Receipt unlocks follow the
// quote's epoch, so New link or Revise on the quote ends them.
// RECEIPT_ACCESS_GATE=off answers as before the gate.
// Design: docs/plans/2026-10-25-invoice-receipt-access-codes.md (8.4).

const { send, handleError } = require("../shared/http");
const { requireAdmin } = require("../shared/adminAuth");
const { adminCheck } = require("../shared/access/core");
const { quoteAccess } = require("../shared/quotes/accessScheme");
const R = require("../shared/receipts/access");
const M = require("../shared/quotes/model");
const V = require("../shared/quotes/views");
const { createServices } = require("../shared/quotes/service");

/**
 * deps: services() gives { repo, locks, now }; env and requireAdmin replace
 * process.env and shared/adminAuth in tests.
 */
function createHandler(deps) {
  const env = deps.env || process.env;
  const checkAdmin = deps.requireAdmin || requireAdmin;
  return async function (context, req) {
    const query = req.query || {};
    const logError = (line) => context.log.error(line);
    const body = { reference: query.reference, s: query.s };
    try {
      // doc-access's order: the locator's shape, then the switch and the
      // secret (503), then the signature and the lookups. Every locator
      // failure is the same 404.
      const locator = R.receiptLocator({ env });
      locator.check(body);
      const gated = R.receiptAccess.gateEnabled(env, logError);
      const secret = gated ? R.receiptAccess.accessSecret(env, logError) : null;
      const svc = deps.services();
      const record = await locator.find(svc, body);
      const { quote, payment } = record;
      if (gated) {
        const nowMs = svc.now().getTime();
        // A browser signed in to the quote may open that quote's receipts.
        const quoteSession = await quoteAccess.hasAccess({
          secret,
          locks: svc.locks,
          req,
          record: quote,
          nowMs,
        });
        if (!quoteSession)
          await R.receiptAccess.requireAccess({
            env,
            logError,
            locks: svc.locks,
            req,
            record,
            nowMs,
            isAdmin: adminCheck(checkAdmin, context, req, query.admin),
          });
      }
      const stages = M.stageStates(quote, await svc.repo.listPayments(quote.quoteNumber));
      return send(context, 200, { receipt: V.receiptView(quote, payment, stages) });
    } catch (err) {
      return handleError(context, err, "quote-receipt");
    }
  };
}

module.exports = createHandler({ services: createServices });
module.exports.createHandler = createHandler;
