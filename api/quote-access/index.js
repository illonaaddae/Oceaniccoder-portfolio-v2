// POST /api/quote-access — opening a client quote link in a new browser.
//   { action: "status", token }                  -> { locked, canUnlock, blocked, maskedEmail }
//   { action: "claim", token, linkCode }         -> { ok: true } + the unlock cookie
//   { action: "send", token }                    -> { challenge, retryAfterSeconds, ... }
//   { action: "verify", token, challenge, code } -> { ok: true } + the unlock cookie
// Rules and reasons: docs/plans/2026-10-20-quote-access-code.md. The actions
// live in shared/access/endpoint.js; this finds the quote by its link token
// and gives the quote's emails and wording. Codes go only to the client email
// on the quote.

const { HttpError } = require("../shared/http");
const { isTokenShape, hashToken } = require("../shared/tokens");
const T = require("../shared/email/quoteEmails");
const V = require("../shared/quotes/views");
const { quoteAccess } = require("../shared/quotes/accessScheme");
const { createAccessEndpoint } = require("../shared/access/endpoint");
const { createServices } = require("../shared/quotes/service");

const VISIBLE = ["sent", "accepted", "declined", "expired"];
const CONTACT = "hello@oceaniccoder.dev";

const inactive = () => new HttpError(404, "This link is no longer active.", { inactive: true });

const locator = {
  check(body) {
    if (!isTokenShape(body.token)) throw inactive();
  },
  async find(svc, body) {
    const quote = await svc.repo.findByTokenHash(hashToken(body.token));
    if (!quote || !VISIBLE.includes(quote.status)) throw inactive();
    return quote;
  },
};

const emails = {
  code: (quote, code, minutes) => T.accessCode(V.accessCodeView(quote, code, minutes)),
  lockedAlert: (quote, at, blocked) => T.accessLockedAlert(V.accessLockedView(quote, at, blocked)),
};

const labels = {
  ref: "quote",
  noEmail: `This quote can't be opened with a code. Contact ${CONTACT} to open it.`,
  gateOff: "This quote opens without a code right now.",
  blocked: `Too many wrong codes were entered on this link, so no more codes will be sent. Contact ${CONTACT} for a new link.`,
};

function createHandler(deps) {
  return createAccessEndpoint({ ...deps, access: quoteAccess, locator, emails, labels });
}

module.exports = createHandler({ services: createServices });
module.exports.createHandler = createHandler;
