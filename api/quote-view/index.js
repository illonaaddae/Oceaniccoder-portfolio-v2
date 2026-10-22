// GET /api/quote-view?token= — the client's quote page data. Public, keyed by
// the link token. Expiry is applied here, lazily, so no timer job is needed.
// Behind the quote access gate (api/shared/quotes/access.js): without an
// unlock it answers 401 locked, and the first view is recorded only after
// one. ?admin=1 (the dashboard's Preview link) checks the admin session
// instead and records nothing.

const { send, handleError } = require("../shared/http");
const { requireAdmin } = require("../shared/adminAuth");
const { isTokenShape, hashToken } = require("../shared/tokens");
const M = require("../shared/quotes/model");
const V = require("../shared/quotes/views");
const A = require("../shared/quotes/access");
const { createServices } = require("../shared/quotes/service");

const INACTIVE = { error: "This link is no longer active.", inactive: true };
const VISIBLE = ["sent", "accepted", "declined", "expired"];

function createHandler(deps) {
  const env = deps.env || process.env;
  const checkAdmin = deps.requireAdmin || requireAdmin;
  return async function (context, req) {
    const query = req.query || {};
    if (!isTokenShape(query.token)) return send(context, 404, INACTIVE);
    try {
      const svc = deps.services();
      let quote = await svc.repo.findByTokenHash(hashToken(query.token));
      if (!quote || !VISIBLE.includes(quote.status)) return send(context, 404, INACTIVE);
      const now = svc.now();
      const via = await A.requireAccess({
        env,
        logError: (message) => context.log.error(message),
        locks: svc.locks,
        req,
        quote,
        nowMs: now.getTime(),
        isAdmin: A.adminCheck(checkAdmin, context, req, query.admin),
      });
      if (M.isExpired(quote, now.getTime()))
        quote = await svc.repo.update(quote.id, { status: "expired" });
      if (via !== "admin" && query.preview !== "1" && quote.status === "sent" && !quote.viewedAt) {
        quote = await svc.repo.update(quote.id, { viewedAt: now.toISOString() });
      }
      const payments = await svc.repo.listPayments(quote.quoteNumber);
      const stages = M.stageStates(quote, payments, now.getTime());
      return send(context, 200, {
        quote: V.clientQuoteView(quote, stages, {
          receiptSecret: process.env.RECEIPT_SIGNING_SECRET,
        }),
      });
    } catch (err) {
      return handleError(context, err, "quote-view");
    }
  };
}

module.exports = createHandler({ services: createServices });
module.exports.createHandler = createHandler;
