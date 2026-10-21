// POST /api/quote-respond — the client accepts (typed name + agreement) or
// declines. Acceptance stores evidence: the name, a hashed IP, the browser
// string and a snapshot of exactly what was accepted.
//
// One response per quote revision: the write is guarded by an atomic lock on
// the revision, so a double submit or an accept/decline race writes once.
// Emails and the inquiry status run after the write; their failures are
// logged and never fail the response.
//
// Behind the quote access gate (api/shared/quotes/access.js): without an
// unlock it answers 401 locked. There is no admin bypass; the admin doesn't
// answer a quote for the client.

const { send, readJson, handleError, HttpError, str } = require("../shared/http");
const { isTokenShape, hashToken, hashIp } = require("../shared/tokens");
const { clientIp } = require("../shared/turnstile");
const M = require("../shared/quotes/model");
const V = require("../shared/quotes/views");
const A = require("../shared/quotes/access");
const { createServices } = require("../shared/quotes/service");

const INACTIVE_MSG = "This link is no longer active.";
const SETTLED = ["accepted", "declined"];

async function view(svc, quote, now) {
  const payments = await svc.repo.listPayments(quote.quoteNumber);
  return {
    quote: V.clientQuoteView(quote, M.stageStates(quote, payments, now.getTime()), {
      receiptSecret: process.env.RECEIPT_SIGNING_SECRET,
    }),
  };
}

// Runs the post-write side effects. Every rejection is logged; none reach the client.
async function settleSideEffects(context, label, tasks) {
  const results = await Promise.allSettled(tasks.map((t) => t.run()));
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      context.log.warn(`quote-respond ${label}: ${tasks[i].name} failed`, r.reason);
    }
  });
}

// The winner may not have written its response yet when we lose the lock, so
// poll briefly for it before giving up.
const LOSER_POLLS = 5;
const LOSER_POLL_MS = 100;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Takes the one-response-per-revision lock. Returns null when this request
// won it; otherwise returns the view of whichever response got there first.
async function claimRevision(svc, quote, now) {
  const won = await svc.locks.take(`respond:${quote.id}:${quote.revision}`);
  if (won) return null;
  for (let attempt = 0; attempt < LOSER_POLLS; attempt += 1) {
    const fresh = await svc.repo.get(quote.id);
    if (fresh && SETTLED.includes(fresh.status)) return view(svc, fresh, now);
    await sleep(LOSER_POLL_MS);
  }
  throw new HttpError(409, "Your response is already being recorded. Refresh in a moment.");
}

async function releaseRevision(svc, quote) {
  await svc.locks.release(`respond:${quote.id}:${quote.revision}`);
}

async function writeOnce(svc, quote, fields) {
  try {
    return await svc.repo.update(quote.id, fields);
  } catch (err) {
    await releaseRevision(svc, quote);
    throw err;
  }
}

async function accept(context, svc, quote, body, req, token) {
  const name = str(body.name, 200);
  if (name.length < 3 || name.length > 120)
    throw new HttpError(400, "Type your full name to accept.");
  if (body.agree !== true)
    throw new HttpError(400, "Tick the box to agree to the scope, payment plan and terms.");
  const now = svc.now();
  if (quote.status === "accepted") return view(svc, quote, now);
  if (!M.canMove(quote.status, "accepted"))
    throw new HttpError(409, "This quote can no longer be accepted.");

  const claimed = await claimRevision(svc, quote, now);
  if (claimed) return claimed;

  const snapshot = JSON.stringify({
    revision: quote.revision,
    quoteNumber: quote.quoteNumber,
    title: quote.title,
    clientName: quote.clientName,
    clientEmail: quote.clientEmail || "",
    scope: quote.scope || "",
    timeline: quote.timeline || "",
    items: quote.items,
    subtotalMinor: quote.subtotalMinor,
    discountMinor: quote.discountMinor || 0,
    totalMinor: quote.totalMinor,
    currency: quote.currency,
    schedule: quote.schedule,
    terms: quote.terms || "",
    validUntil: quote.validUntil || null,
    highlights: quote.highlights || [],
    runningCosts: quote.runningCosts || [],
    exclusions: quote.exclusions || "",
    assumptions: quote.assumptions || "",
    nextSteps: quote.nextSteps || "",
    optionalTitle: quote.optionalTitle || "",
    optionalItems: quote.optionalItems || [],
    discountLabel: quote.discountLabel || "",
    extras: quote.extras || {},
  });
  const updated = await writeOnce(svc, quote, {
    status: "accepted",
    respondedAt: now.toISOString(),
    acceptedName: name,
    acceptedIpHash: hashIp(clientIp(req)),
    acceptedUa: String((req.headers && req.headers["user-agent"]) || "").slice(0, 300),
    acceptedSnapshot: snapshot,
  });
  const stages = M.stageStates(updated, [], now.getTime());
  await settleSideEffects(context, "accept", [
    { name: "quoteAccepted", run: () => svc.notify.quoteAccepted(updated, token, stages) },
    { name: "decision", run: () => svc.notify.decision(updated, "accepted") },
    { name: "inquiryStatus", run: () => svc.repo.setInquiryStatus(updated.inquiryId, "won") },
  ]);
  return view(svc, updated, now);
}

async function decline(context, svc, quote, body) {
  const reason = str(body.reason, 1000);
  if (reason.length > 500) throw new HttpError(400, "Keep the reason under 500 characters.");
  const now = svc.now();
  if (quote.status === "declined") return view(svc, quote, now);
  if (!M.canMove(quote.status, "declined"))
    throw new HttpError(409, "This quote can no longer be declined.");

  const claimed = await claimRevision(svc, quote, now);
  if (claimed) return claimed;

  const updated = await writeOnce(svc, quote, {
    status: "declined",
    respondedAt: now.toISOString(),
    declineReason: reason,
  });
  await settleSideEffects(context, "decline", [
    { name: "decision", run: () => svc.notify.decision(updated, "declined") },
    { name: "inquiryStatus", run: () => svc.repo.setInquiryStatus(updated.inquiryId, "declined") },
  ]);
  return view(svc, updated, now);
}

function createHandler(deps) {
  const env = deps.env || process.env;
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
      await A.requireAccess({
        env,
        logError: (message) => context.log.error(message),
        locks: svc.locks,
        req,
        quote,
        nowMs: svc.now().getTime(),
      });
      if (M.isExpired(quote, svc.now().getTime()) || quote.status === "expired") {
        if (quote.status !== "expired") await svc.repo.update(quote.id, { status: "expired" });
        throw new HttpError(409, "This quote has expired. Ask for an updated quote.");
      }
      const result =
        body.action === "accept"
          ? await accept(context, svc, quote, body, req, body.token)
          : await decline(context, svc, quote, body);
      return send(context, 200, result);
    } catch (err) {
      return handleError(context, err, "quote-respond");
    }
  };
}

module.exports = createHandler({ services: createServices });
module.exports.createHandler = createHandler;
