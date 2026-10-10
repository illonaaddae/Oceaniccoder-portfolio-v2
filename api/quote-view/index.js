// GET /api/quote-view?token= — the client's quote page data. Public, keyed by
// the link token. Expiry is applied here, lazily, so no timer job is needed.

const { send, handleError } = require("../shared/http");
const { isTokenShape, hashToken } = require("../shared/tokens");
const M = require("../shared/quotes/model");
const V = require("../shared/quotes/views");
const { createServices } = require("../shared/quotes/service");

const INACTIVE = { error: "This link is no longer active.", inactive: true };
const VISIBLE = ["sent", "accepted", "declined", "expired"];

function createHandler(deps) {
  return async function (context, req) {
    const query = req.query || {};
    if (!isTokenShape(query.token)) return send(context, 404, INACTIVE);
    try {
      const svc = deps.services();
      let quote = await svc.repo.findByTokenHash(hashToken(query.token));
      if (!quote || !VISIBLE.includes(quote.status)) return send(context, 404, INACTIVE);
      const now = svc.now();
      if (M.isExpired(quote, now.getTime()))
        quote = await svc.repo.update(quote.id, { status: "expired" });
      if (query.preview !== "1" && quote.status === "sent" && !quote.viewedAt) {
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
