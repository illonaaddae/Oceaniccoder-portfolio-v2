// POST /api/quote-access — opening a client quote link in a new browser.
//   { action: "status", token }                  -> { locked, canUnlock, blocked, maskedEmail }
//   { action: "claim", token, linkCode }         -> { ok: true } + the unlock cookie
//   { action: "send", token }                    -> { challenge, retryAfterSeconds, ... }
//   { action: "verify", token, challenge, code } -> { ok: true } + the unlock cookie
// Rules and reasons: docs/plans/2026-10-20-quote-access-code.md and
// api/shared/quotes/access.js. Claim takes the one-time link code from the
// emailed link's #k= fragment; when it is missing or spent, the page asks for
// a 6-digit code instead. Codes go only to the client email on the quote.
// Everything is a POST from page script, so a mail scanner that only fetches
// the link never claims a link code or sends a code.
//
// Logs name the quote number and counts only: never the code, link code,
// challenge, cookie, link token, email address or IP.

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
// Classic Functions may freeze the instance once the handler returns, so the
// lockout alert is awaited, but never for longer than this.
const ALERT_WAIT_MS = 2000;
const VISIBLE = ["sent", "accepted", "declined", "expired"];
const CONTACT = "hello@oceaniccoder.dev";

const inactive = () => new HttpError(404, "This link is no longer active.", { inactive: true });
const NO_EMAIL = `This quote can't be opened with a code. Contact ${CONTACT} to open it.`;
const GATE_OFF = "This quote opens without a code right now.";
const TOO_MANY = "Too many tries. Ask for a new code.";
const LINK_CODE_NEEDED = "This link needs a code to open here. We'll email you one.";
const BLOCKED = `Too many wrong codes were entered on this link, so no more codes will be sent. Contact ${CONTACT} for a new link.`;
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
  const alertWaitMs = deps.alertWaitMs ?? ALERT_WAIT_MS;
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
    const blocked =
      !unlocked &&
      Boolean(maskedEmail) &&
      (await A.sendsBlocked(svc.locks, quote, await A.currentEpoch(svc.locks, quote)));
    return {
      status: 200,
      body: {
        locked: !unlocked,
        canUnlock: Boolean(maskedEmail) && !blocked,
        blocked,
        maskedEmail,
      },
    };
  }

  async function sendCode({ context, svc, secret, quote, ip, nowMs }) {
    if (!allowSendFromIp(ip || "unknown", 1, nowMs))
      throw new HttpError(429, "Too many codes asked for. Try again later.");
    if (!A.maskEmail(quote.clientEmail)) throw new HttpError(409, NO_EMAIL, { noEmail: true });
    const epoch = await A.currentEpoch(svc.locks, quote);
    if (await A.sendsBlocked(svc.locks, quote, epoch)) {
      context.log(`quote-access blocked quote=${quote.quoteNumber}`);
      throw new HttpError(403, BLOCKED, { blocked: true });
    }
    const slots = await A.takeSendSlots(svc.locks, quote, epoch, nowMs);
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

    // Anything that goes wrong after the slots were taken hands the gap back,
    // so the client can ask again at once. A failed hand-back is logged and
    // the client still gets the error for the original failure.
    const releaseGap = async () => {
      try {
        await slots.releaseGap();
      } catch (err) {
        context.log.error(
          `quote-access gap release failed quote=${quote.quoteNumber}: ${redact(err && err.message)}`,
        );
      }
    };
    let issued;
    let mail;
    try {
      issued = A.issueChallenge(secret, quote, epoch, nowMs);
      const minutes = A.CODE_TTL_MS / MINUTE_MS;
      mail = await sendMail({
        to: quote.clientEmail,
        ...T.accessCode(V.accessCodeView(quote, issued.code, minutes)),
      });
    } catch (err) {
      await releaseGap();
      throw err;
    }
    if (!mail.ok) {
      await releaseGap();
      context.log.error(
        `quote-access send failed quote=${quote.quoteNumber}: ${redact(mail.error)}`,
      );
      throw new HttpError(502, "We couldn't send the code. Please try again in a minute.");
    }
    context.log(`quote-access send quote=${quote.quoteNumber}`);
    return {
      status: 200,
      body: {
        challenge: issued.challenge,
        maskedEmail: A.maskEmail(quote.clientEmail),
        expiresInSeconds: A.CODE_TTL_MS / 1000,
        retryAfterSeconds: slots.retryAfterSeconds,
      },
    };
  }

  // Awaited but capped at ALERT_WAIT_MS: the 429 must not wait on Resend, and
  // a fire-and-forget send could be frozen with the instance after return.
  async function alertLockout(context, quote, nowMs, blocked) {
    let timer;
    const timedOut = new Promise((resolve) => {
      timer = setTimeout(() => resolve({ ok: false, error: "timed out" }), alertWaitMs);
    });
    const sending = Promise.resolve()
      .then(() =>
        sendMail({
          to: env.RESEND_TO_EMAIL,
          ...T.accessLockedAlert(V.accessLockedView(quote, new Date(nowMs).toISOString(), blocked)),
        }),
      )
      .catch((err) => ({ ok: false, error: err && err.message }));
    const mail = await Promise.race([sending, timedOut]);
    clearTimeout(timer);
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
    // Challenges fetched before the block must not keep a guesser going after it.
    if (await A.sendsBlocked(svc.locks, quote, checked.epoch))
      throw new HttpError(403, BLOCKED, { blocked: true });

    const attempt = await A.takeTry(svc.locks, checked.challengeId);
    if (!attempt) throw new HttpError(429, TOO_MANY, { triesLeft: 0, newCodeNeeded: true });
    const triesLeft = A.MAX_TRIES - attempt;
    if (!A.codeMatches(secret, checked.challengeId, code)) {
      context.log(`quote-access verify quote=${quote.quoteNumber} triesLeft=${triesLeft}`);
      if (triesLeft > 0)
        throw new HttpError(400, "That code isn't right. Check the email and try again.", {
          triesLeft,
        });
      // Only one request can hold the last try slot, so this runs once per challenge.
      const lockouts = await A.recordLockout(svc.locks, quote, checked.epoch);
      const blocked = lockouts >= A.MAX_LOCKOUTS;
      context.log.warn(`quote-access lock quote=${quote.quoteNumber} lockouts=${lockouts}`);
      await alertLockout(context, quote, nowMs, blocked);
      if (blocked) throw new HttpError(403, BLOCKED, { triesLeft: 0, blocked: true });
      throw new HttpError(429, TOO_MANY, { triesLeft: 0, newCodeNeeded: true });
    }
    if (!(await A.takeUse(svc.locks, checked.challengeId)))
      throw new HttpError(409, "That code has already been used. Ask for a new one.", {
        newCodeNeeded: true,
      });
    // The epoch the code was checked against, so a rotate mid-request can't
    // hand an old code a cookie for the new epoch.
    context.log(`quote-access verify ok quote=${quote.quoteNumber}`);
    return {
      status: 200,
      body: { ok: true },
      cookie: A.sessionCookie(secret, quote, checked.epoch, nowMs),
    };
  }

  // Allowed even when codes are blocked: a link code can't be guessed, it
  // only comes in an email the admin sent, so it proves what a typed code
  // would. The block is there to stop guessing.
  async function claim({ context, svc, secret, quote, body, ip, nowMs }) {
    if (!allowVerifyFromIp(ip || "unknown", 1, nowMs)) throw new HttpError(429, TOO_MANY);
    const checked = await A.checkLinkCode({
      secret,
      locks: svc.locks,
      quote,
      linkCode: body.linkCode,
      nowMs,
    });
    if (!checked.ok) {
      context.log(`quote-access claim refused quote=${quote.quoteNumber} reason=${checked.reason}`);
      throw new HttpError(400, LINK_CODE_NEEDED, { codeNeeded: true });
    }
    if (!(await A.claimLinkCode(svc.locks, checked.nonce))) {
      context.log(`quote-access claim refused quote=${quote.quoteNumber} reason=used`);
      throw new HttpError(409, LINK_CODE_NEEDED, { codeNeeded: true });
    }
    context.log(`quote-access claim ok quote=${quote.quoteNumber}`);
    return {
      status: 200,
      body: { ok: true },
      cookie: A.sessionCookie(secret, quote, checked.epoch, nowMs),
    };
  }

  const ACTIONS = { status, claim, send: sendCode, verify: verifyCode };

  return async function (context, req) {
    try {
      // function.json allows only POST; this keeps a GET from ever claiming
      // a link code if that binding changes.
      if (req.method !== "POST") throw new HttpError(405, "Use POST.");
      const body = readJson(req);
      const run = Object.hasOwn(ACTIONS, body.action) ? ACTIONS[body.action] : null;
      if (!run) throw new HttpError(400, "Unknown action.");
      if (!isTokenShape(body.token)) throw inactive();
      const logError = (message) => context.log.error(message);
      if (!A.gateEnabled(env, logError)) {
        if (body.action === "status") return send(context, 200, { locked: false, gateOff: true });
        throw new HttpError(409, GATE_OFF, { gateOff: true });
      }
      const secret = A.accessSecret(env, logError);
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
