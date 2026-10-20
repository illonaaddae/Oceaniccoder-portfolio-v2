// POST /api/quote-access — the email code that opens a client quote link.
//   { action: "status", token }                  -> { locked, canUnlock, maskedEmail }
//   { action: "send", token }                    -> { challenge, retryAfterSeconds, ... }
//   { action: "verify", token, challenge, code } -> { ok: true } + the unlock cookie
// Rules and reasons: docs/plans/2026-10-20-quote-access-code.md and
// api/shared/quotes/access.js. Codes go only to the client email on the quote,
// and only on this POST, so a mail scanner opening the link never sends one.
//
// Logs name the quote number and counts only: never the code, challenge,
// cookie, link token, email address or IP.

const { send, readJson, handleError, HttpError, str } = require("../shared/http");
const { isTokenShape, hashToken } = require("../shared/tokens");
const { clientIp } = require("../shared/turnstile");
const { createRateLimiter } = require("../shared/rateLimit");
const { sendEmail } = require("../shared/email/send");
const T = require("../shared/email/quoteEmails");
const V = require("../shared/quotes/views");
const A = require("../shared/quotes/access");
const { createServices } = require("../shared/quotes/service");

const MINUTE_MS = 60 * 1000;
const SENDS_PER_IP_HOUR = 10;
const VERIFIES_PER_IP_10_MIN = 30;
const RESEND_AFTER_SECONDS = 60;
const VISIBLE = ["sent", "accepted", "declined", "expired"];
const CONTACT = "hello@oceaniccoder.dev";

const inactive = () => new HttpError(404, "This link is no longer active.", { inactive: true });
const NO_EMAIL = `This quote can't be opened with a code. Contact ${CONTACT} to open it.`;
const GATE_OFF = "This quote opens without a code right now.";
const TOO_MANY = "Too many tries. Ask for a new code.";
const NEW_CODE = {
  invalid: "That code isn't valid any more. Ask for a new one.",
  expired: "That code has expired. Ask for a new one.",
  stale: "That code is for an older version of this link. Ask for a new one.",
};

// Resend's error text can quote the recipient; keep addresses out of the logs.
const redact = (text) => String(text || "").replace(/[^\s@]+@[^\s@]+/g, "[email]");

function createHandler(deps) {
  const env = deps.env || process.env;
  const sendMail = deps.send || sendEmail;
  const allowSendFromIp = createRateLimiter({ limit: SENDS_PER_IP_HOUR, windowMs: 60 * MINUTE_MS });
  const allowVerifyFromIp = createRateLimiter({
    limit: VERIFIES_PER_IP_10_MIN,
    windowMs: 10 * MINUTE_MS,
  });

  async function findQuote(svc, token) {
    const quote = await svc.repo.findByTokenHash(hashToken(token));
    if (!quote || !VISIBLE.includes(quote.status)) throw inactive();
    return quote;
  }

  async function status({ svc, secret, quote, req, nowMs }) {
    const unlocked = await A.hasAccess({ secret, locks: svc.locks, req, quote, nowMs });
    const maskedEmail = A.maskEmail(quote.clientEmail);
    return {
      status: 200,
      body: { locked: !unlocked, canUnlock: Boolean(maskedEmail), maskedEmail },
    };
  }

  async function sendCode({ context, svc, secret, quote, ip, nowMs }) {
    if (!allowSendFromIp(ip || "unknown", 1, nowMs))
      throw new HttpError(429, "Too many codes asked for. Try again later.");
    if (!A.maskEmail(quote.clientEmail)) throw new HttpError(409, NO_EMAIL, { noEmail: true });
    const slots = await A.takeSendSlots(svc.locks, quote.id, nowMs);
    if (!slots.ok) {
      context.log(`quote-access limit quote=${quote.quoteNumber}`);
      throw new HttpError(
        429,
        "A code was sent recently. Check your inbox, or wait to ask again.",
        {
          retryAfterSeconds: slots.retryAfterSeconds,
        },
      );
    }
    const epoch = await A.currentEpoch(svc.locks, quote);
    const { challenge, code } = A.issueChallenge(secret, quote, epoch, nowMs);
    const minutes = A.CODE_TTL_MS / MINUTE_MS;
    const mail = await sendMail({
      to: quote.clientEmail,
      ...T.accessCode(V.accessCodeView(quote, code, minutes)),
    });
    if (!mail.ok) {
      await slots.releaseMinute();
      context.log.error(
        `quote-access send failed quote=${quote.quoteNumber}: ${redact(mail.error)}`,
      );
      throw new HttpError(502, "We couldn't send the code. Please try again in a minute.");
    }
    context.log(`quote-access send quote=${quote.quoteNumber}`);
    return {
      status: 200,
      body: {
        challenge,
        maskedEmail: A.maskEmail(quote.clientEmail),
        expiresInSeconds: A.CODE_TTL_MS / 1000,
        retryAfterSeconds: RESEND_AFTER_SECONDS,
      },
    };
  }

  async function alertLockout(context, quote, nowMs) {
    const mail = await sendMail({
      to: env.RESEND_TO_EMAIL,
      ...T.accessLockedAlert(V.accessLockedView(quote, new Date(nowMs).toISOString())),
    });
    if (!mail.ok)
      context.log.error(
        `quote-access lock alert failed quote=${quote.quoteNumber}: ${redact(mail.error)}`,
      );
  }

  async function verifyCode({ context, svc, secret, quote, body, ip, nowMs }) {
    if (!allowVerifyFromIp(ip || "unknown", 1, nowMs)) throw new HttpError(429, TOO_MANY);
    const code = str(body.code, 40).replace(/[\s-]/g, "");
    if (!/^\d{6}$/.test(code)) throw new HttpError(400, "Enter the 6-digit code from the email.");
    const checked = await A.checkChallenge({
      secret,
      locks: svc.locks,
      quote,
      challenge: body.challenge,
      nowMs,
    });
    if (!checked.ok) throw new HttpError(400, NEW_CODE[checked.reason], { newCodeNeeded: true });

    const attempt = await A.takeTry(svc.locks, checked.challengeId);
    if (!attempt) throw new HttpError(429, TOO_MANY, { triesLeft: 0, newCodeNeeded: true });
    const triesLeft = A.MAX_TRIES - attempt;
    if (!A.codeMatches(secret, checked.challengeId, code)) {
      context.log(`quote-access verify quote=${quote.quoteNumber} triesLeft=${triesLeft}`);
      if (triesLeft > 0)
        throw new HttpError(400, "That code isn't right. Check the email and try again.", {
          triesLeft,
        });
      context.log.warn(`quote-access lock quote=${quote.quoteNumber}`);
      // Only one request can hold the last try slot, so this sends once per challenge.
      await alertLockout(context, quote, nowMs);
      throw new HttpError(429, TOO_MANY, { triesLeft: 0, newCodeNeeded: true });
    }
    if (!(await A.takeUse(svc.locks, checked.challengeId)))
      throw new HttpError(409, "That code has already been used. Ask for a new one.", {
        newCodeNeeded: true,
      });
    const epoch = await A.currentEpoch(svc.locks, quote);
    context.log(`quote-access verify ok quote=${quote.quoteNumber}`);
    return {
      status: 200,
      body: { ok: true },
      cookie: A.sessionCookie(secret, quote, epoch, nowMs),
    };
  }

  const ACTIONS = { status, send: sendCode, verify: verifyCode };

  return async function (context, req) {
    try {
      const body = readJson(req);
      const run = Object.hasOwn(ACTIONS, body.action) ? ACTIONS[body.action] : null;
      if (!run) throw new HttpError(400, "Unknown action.");
      if (!isTokenShape(body.token)) throw inactive();
      if (!A.gateEnabled(env)) {
        if (body.action === "status") return send(context, 200, { locked: false, gateOff: true });
        throw new HttpError(409, GATE_OFF, { gateOff: true });
      }
      const secret = A.accessSecret(env, (message) => context.log.error(message));
      const svc = deps.services();
      const quote = await findQuote(svc, body.token);
      const result = await run({
        context,
        svc,
        secret,
        quote,
        body,
        req,
        ip: clientIp(req),
        nowMs: svc.now().getTime(),
      });
      send(context, result.status, result.body);
      if (result.cookie) context.res.headers["Set-Cookie"] = result.cookie;
    } catch (err) {
      return handleError(context, err, "quote-access");
    }
  };
}

module.exports = createHandler({ services: createServices });
module.exports.createHandler = createHandler;
