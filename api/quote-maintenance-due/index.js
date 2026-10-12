// POST /api/quote-maintenance-due — sends every maintenance offer that is due.
// Called once a day by .github/workflows/maintenance-offers.yml with the
// shared secret in the x-cron-key header. A quote is due when it is fully
// paid, has at least one plan, has no maintenanceOfferSentAt yet and its
// offer date (a week before the free period ends) has passed.

const crypto = require("crypto");
const { send, handleError } = require("../shared/http");
const M = require("../shared/quotes/model");
const { createServices } = require("../shared/quotes/service");
const { sendMaintenanceOffer } = require("../shared/quotes/maintenance");

// Hashing both sides first gives equal-length buffers, so the comparison
// takes the same time whatever the caller sent.
function sameSecret(given, expected) {
  const digest = (v) => crypto.createHash("sha256").update(String(v)).digest();
  return crypto.timingSafeEqual(digest(given), digest(expected));
}

function header(req, name) {
  const headers = req.headers || {};
  if (typeof headers.get === "function") return headers.get(name) || "";
  return headers[name] || headers[name.toLowerCase()] || "";
}

function createHandler(deps) {
  return async function (context, req) {
    if (req.method && req.method.toUpperCase() !== "POST")
      return send(context, 405, { error: "Use POST." });
    const secret = deps.secret();
    if (!secret) return send(context, 503, { error: "CRON_SECRET is not configured." });
    const given = header(req, "x-cron-key");
    if (!given || !sameSecret(given, secret)) return send(context, 401, { error: "Unauthorized." });

    try {
      const svc = deps.services();
      const nowMs = svc.now().getTime();
      let sent = 0;
      let failed = 0;
      for (const quote of await svc.repo.listMaintenanceCandidates()) {
        try {
          const payments = await svc.repo.listPayments(quote.quoteNumber);
          const stages = M.stageStates(quote, payments, nowMs);
          const offer = M.maintenanceOffer(quote, stages);
          if (!offer || offer.sentAt || !offer.dueAt || Date.parse(offer.dueAt) > nowMs) continue;
          if (!quote.clientEmail) {
            failed += 1;
            context.log.error(`quote-maintenance-due: ${quote.quoteNumber} has no client email`);
            continue;
          }
          const result = await sendMaintenanceOffer(svc, quote, stages);
          if (result.ok) sent += 1;
          else {
            failed += 1;
            context.log.error(`quote-maintenance-due: ${quote.quoteNumber}: ${result.error}`);
          }
        } catch (err) {
          // One bad quote must not stop the others.
          failed += 1;
          context.log.error(
            `quote-maintenance-due: ${quote.quoteNumber}: ${err && (err.stack || err.message)}`,
          );
        }
      }
      return send(context, 200, { sent, failed });
    } catch (err) {
      return handleError(context, err, "quote-maintenance-due");
    }
  };
}

module.exports = createHandler({
  services: createServices,
  secret: () => process.env.CRON_SECRET,
});
module.exports.createHandler = createHandler;
