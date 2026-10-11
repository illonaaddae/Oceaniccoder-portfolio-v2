// GET /api/quote-receipt?reference=&s= — a printable receipt behind an HMAC
// link. Receipt links don't expire and keep working after the quote link
// rotates, because they don't depend on the quote token.

const { send, handleError, HttpError, str } = require("../shared/http");
const { verifyReceipt } = require("../shared/tokens");
const M = require("../shared/quotes/model");
const V = require("../shared/quotes/views");
const { createServices } = require("../shared/quotes/service");

function createHandler(deps) {
  return async function (context, req) {
    try {
      const query = req.query || {};
      const reference = str(query.reference, 80);
      if (!reference || !verifyReceipt(reference, query.s, process.env.RECEIPT_SIGNING_SECRET)) {
        throw new HttpError(404, "Receipt not found.");
      }
      const svc = deps.services();
      const payment = await svc.repo.findPaymentByReference(reference);
      if (!payment || payment.kind !== "quote" || payment.status !== "success")
        throw new HttpError(404, "Receipt not found.");
      const quote = await svc.repo.get(payment.quoteId);
      if (!quote) throw new HttpError(404, "Receipt not found.");
      const stages = M.stageStates(quote, await svc.repo.listPayments(quote.quoteNumber));
      return send(context, 200, { receipt: V.receiptView(quote, payment, stages) });
    } catch (err) {
      return handleError(context, err, "quote-receipt");
    }
  };
}

module.exports = createHandler({ services: createServices });
module.exports.createHandler = createHandler;
