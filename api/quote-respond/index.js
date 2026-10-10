// POST /api/quote-respond — the client accepts (typed name + agreement) or
// declines. Acceptance stores evidence: the name, a hashed IP, the browser
// string and a snapshot of exactly what was accepted.

const { send, readJson, handleError, HttpError, str } = require("../shared/http");
const { isTokenShape, hashToken, hashIp } = require("../shared/tokens");
const { clientIp } = require("../shared/turnstile");
const M = require("../shared/quotes/model");
const V = require("../shared/quotes/views");
const { createServices } = require("../shared/quotes/service");

const INACTIVE_MSG = "This link is no longer active.";

function view(quote, now) {
  return {
    quote: V.clientQuoteView(quote, M.stageStates(quote, [], now.getTime()), {
      receiptSecret: process.env.RECEIPT_SIGNING_SECRET,
    }),
  };
}

async function accept(svc, quote, body, req, token) {
  const name = str(body.name, 200);
  if (name.length < 3 || name.length > 120)
    throw new HttpError(400, "Type your full name to accept.");
  if (body.agree !== true)
    throw new HttpError(400, "Tick the box to agree to the scope, payment plan and terms.");
  const now = svc.now();
  if (quote.status === "accepted") return view(quote, now);
  if (!M.canMove(quote.status, "accepted"))
    throw new HttpError(409, "This quote can no longer be accepted.");

  const snapshot = JSON.stringify({
    revision: quote.revision,
    title: quote.title,
    scope: quote.scope || "",
    timeline: quote.timeline || "",
    items: quote.items,
    subtotalMinor: quote.subtotalMinor,
    discountMinor: quote.discountMinor || 0,
    totalMinor: quote.totalMinor,
    currency: quote.currency,
    schedule: quote.schedule,
    terms: quote.terms || "",
  });
  const updated = await svc.repo.update(quote.id, {
    status: "accepted",
    respondedAt: now.toISOString(),
    acceptedName: name,
    acceptedIpHash: hashIp(clientIp(req)),
    acceptedUa: String((req.headers && req.headers["user-agent"]) || "").slice(0, 300),
    acceptedSnapshot: snapshot,
  });
  const stages = M.stageStates(updated, [], now.getTime());
  await Promise.all([
    svc.notify.quoteAccepted(updated, token, stages),
    svc.notify.decision(updated, "accepted"),
    svc.repo.setInquiryStatus(updated.inquiryId, "won"),
  ]);
  return view(updated, now);
}

async function decline(svc, quote, body) {
  const reason = str(body.reason, 1000);
  if (reason.length > 500) throw new HttpError(400, "Keep the reason under 500 characters.");
  const now = svc.now();
  if (quote.status === "declined") return view(quote, now);
  if (!M.canMove(quote.status, "declined"))
    throw new HttpError(409, "This quote can no longer be declined.");
  const updated = await svc.repo.update(quote.id, {
    status: "declined",
    respondedAt: now.toISOString(),
    declineReason: reason,
  });
  await Promise.all([
    svc.notify.decision(updated, "declined"),
    svc.repo.setInquiryStatus(updated.inquiryId, "declined"),
  ]);
  return view(updated, now);
}

function createHandler(deps) {
  return async function (context, req) {
    try {
      const body = readJson(req);
      if (!isTokenShape(body.token)) throw new HttpError(404, INACTIVE_MSG, { inactive: true });
      if (body.action !== "accept" && body.action !== "decline")
        throw new HttpError(400, "Unknown action.");
      const svc = deps.services();
      const quote = await svc.repo.findByTokenHash(hashToken(body.token));
      if (!quote || ["draft", "cancelled"].includes(quote.status))
        throw new HttpError(404, INACTIVE_MSG, { inactive: true });
      if (M.isExpired(quote, svc.now().getTime()) || quote.status === "expired") {
        if (quote.status !== "expired") await svc.repo.update(quote.id, { status: "expired" });
        throw new HttpError(409, "This quote has expired. Ask for an updated quote.");
      }
      const result =
        body.action === "accept"
          ? await accept(svc, quote, body, req, body.token)
          : await decline(svc, quote, body);
      return send(context, 200, result);
    } catch (err) {
      return handleError(context, err, "quote-respond");
    }
  };
}

module.exports = createHandler({ services: createServices });
module.exports.createHandler = createHandler;
