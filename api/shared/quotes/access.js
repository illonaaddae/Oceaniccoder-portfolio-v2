// Email-code access to a client quote link (docs/plans/2026-10-20-quote-access-code.md).
//
// The rules live in shared/access/core.js; this is the quote kind of them,
// with the names and arguments the quote functions have always used.
//
// Session binding: a cookie holds the quote id, revision, access epoch and a
// keyed tag of the client email. Revise bumps the revision. Rotate ("New
// link") takes the next epoch slot (bumpEpoch). Changing the client email
// changes the tag, so an unlock earned through the old address ends. A payment
// request, or "Email again" to the same address, issues a fresh link but
// changes none of these, so the client stays unlocked.

const core = require("../access/core");
const { quoteAccess: access } = require("./accessScheme");

module.exports = {
  CODE_TTL_MS: core.CODE_TTL_MS,
  MAX_TRIES: core.MAX_TRIES,
  MAX_MISSES: core.MAX_MISSES,
  gateEnabled: access.gateEnabled,
  accessSecret: access.accessSecret,
  maskEmail: core.maskEmail,
  normalEmail: core.normalEmail,
  currentEpoch: access.currentEpoch,
  bumpEpoch: access.bumpEpoch,
  codeFor: access.codeFor,
  issueChallenge: access.issueChallenge,
  checkChallenge: ({ quote, ...rest }) => access.checkChallenge({ ...rest, record: quote }),
  codeMatches: access.codeMatches,
  takeTry: access.takeTry,
  takeUse: access.takeUse,
  takeSendSlots: access.takeSendSlots,
  recordMiss: access.recordMiss,
  sendsBlocked: access.sendsBlocked,
  sessionCookieName: access.sessionCookieName,
  sessionCookie: access.sessionCookie,
  hasAccess: ({ quote, ...rest }) => access.hasAccess({ ...rest, record: quote }),
  LINK_CODE_TTL_MS: core.LINK_CODE_TTL_MS,
  mintLinkCode: access.mintLinkCode,
  checkLinkCode: ({ quote, ...rest }) => access.checkLinkCode({ ...rest, record: quote }),
  claimLinkCode: access.claimLinkCode,
  // Miss rows of a deleted quote are dropped: repo.get answers null.
  pruneAccessLocks: ({ locks, repo, nowMs }) =>
    access.pruneAccessLocks({ locks, nowMs, getScope: (quoteId) => repo.get(quoteId) }),
  requireAccess: ({ quote, ...rest }) => access.requireAccess({ ...rest, record: quote }),
  adminCheck: core.adminCheck,
};
