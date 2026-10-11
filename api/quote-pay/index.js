// /api/quote-pay
//   POST — start paying a due stage. The server works out the amount, writes a
//          pending payments row, then initialises Paystack. The browser gets
//          only the access code.
//   GET  — check a reference from the return page or while the popup is open.
//          Verifies with Paystack and settles if needed (same code path as the
//          webhook), so the page never trusts a query string.

const { send, readJson, handleError, HttpError, str } = require("../shared/http");
const { isTokenShape, hashToken } = require("../shared/tokens");
const M = require("../shared/quotes/model");
const V = require("../shared/quotes/views");
const { createServices, handleQuoteCharge } = require("../shared/quotes/service");

const CHANNELS = { card: "card", momo: "mobile_money", apple_pay: "apple_pay" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REUSE_MS = 15 * 60 * 1000;
const STATE = {
  success: "paid",
  pending: "pending",
  failed: "failed",
  duplicate: "duplicate",
  unknown: "pending",
};

async function quoteFor(svc, token) {
  if (!isTokenShape(token))
    throw new HttpError(404, "This link is no longer active.", { inactive: true });
  const quote = await svc.repo.findByTokenHash(hashToken(token));
  if (!quote) throw new HttpError(404, "This link is no longer active.", { inactive: true });
  return quote;
}

async function start(svc, body) {
  const method = str(body.method, 20);
  const email = str(body.email, 254).toLowerCase();
  if (!CHANNELS[method]) throw new HttpError(400, "Choose card, Mobile Money or Apple Pay.");
  if (!EMAIL_RE.test(email)) throw new HttpError(400, "Enter a valid email for your receipt.");
  // Paystack's window still asks for the number; the network is kept for the receipt.
  const network = method === "momo" ? str(body.network, 20) : "";
  if (method === "momo" && !Object.prototype.hasOwnProperty.call(M.MOMO_NETWORKS, network))
    throw new HttpError(400, "Choose your Mobile Money network.");

  const quote = await quoteFor(svc, body.token);
  if (quote.status !== "accepted") throw new HttpError(409, "Accept the quote before paying.");
  const now = svc.now();
  const payments = await svc.repo.listPayments(quote.quoteNumber);
  const stage = M.stageStates(quote, payments, now.getTime()).find((s) => s.id === body.stageId);
  if (!stage) throw new HttpError(404, "That payment stage doesn't exist.");
  if (stage.state === "paid") throw new HttpError(409, "This stage is already paid.");
  if (stage.state !== "due") throw new HttpError(409, "This stage isn't ready for payment yet.");

  // A second click, or the same page in two tabs: hand back the open checkout
  // instead of starting another charge.
  const reuse = payments.find(
    (p) =>
      p.stageId === stage.id &&
      p.status === "pending" &&
      p.method === method &&
      (method !== "momo" || p.note === `${M.NETWORK_NOTE}${network}`) &&
      p.clientEmail === email &&
      p.accessCode &&
      now.getTime() - Date.parse(p.createdAt) < REUSE_MS,
  );
  if (reuse) {
    return {
      accessCode: reuse.accessCode,
      authorizationUrl: `https://checkout.paystack.com/${reuse.accessCode}`,
      reference: reuse.paystackReference,
    };
  }

  const reference = M.paymentReference(quote.quoteNumber, stage.index);
  const row = await svc.repo.createPayment(
    M.paymentRow(quote, stage, {
      clientEmail: email,
      method,
      status: "pending",
      paystackReference: reference,
      ...(network ? { note: `${M.NETWORK_NOTE}${network}` } : {}),
    }),
  );
  const base = V.siteBase();
  try {
    const init = await svc.initialize({
      email,
      amountMinor: stage.amountMinor,
      currency: quote.currency,
      reference,
      channels: [CHANNELS[method]],
      callbackUrl: `${base}/q/${body.token}/paid?reference=${encodeURIComponent(reference)}`,
      metadata: {
        kind: "quote",
        quoteNumber: quote.quoteNumber,
        stageId: stage.id,
        momoNetwork: network || null,
        cancel_action: `${base}/q/${body.token}/pay/${stage.id}`,
      },
    });
    await svc.repo.updatePayment(row.id, { accessCode: init.accessCode });
    return { accessCode: init.accessCode, authorizationUrl: init.authorizationUrl, reference };
  } catch (err) {
    await svc.repo.updatePayment(row.id, {
      status: "failed",
      note: `initialize: ${err.message}`.slice(0, 300),
    });
    throw new HttpError(502, "Paystack couldn't start the payment. Please try again in a minute.");
  }
}

async function check(svc, query, charge) {
  const quote = await quoteFor(svc, query.token);
  const reference = str(query.reference, 80);
  const payment = reference ? await svc.repo.findPaymentByReference(reference) : null;
  if (!payment || payment.quoteId !== quote.id) throw new HttpError(404, "Payment not found.");
  const result = await charge(reference, svc);
  const state = STATE[result.state] || "pending";
  const receiptPath =
    state === "paid" ? V.receiptPath(reference, process.env.RECEIPT_SIGNING_SECRET) : null;
  return { state, receiptPath };
}

function createHandler(deps) {
  return async function (context, req) {
    try {
      const svc = deps.services();
      const body =
        req.method === "GET"
          ? await check(svc, req.query || {}, deps.handleQuoteCharge)
          : await start(svc, readJson(req));
      return send(context, 200, body);
    } catch (err) {
      return handleError(context, err, "quote-pay");
    }
  };
}

module.exports = createHandler({ services: createServices, handleQuoteCharge });
module.exports.createHandler = createHandler;
