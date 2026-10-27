// The POST endpoint that opens a client document link in a new browser, for
// any kind of record built with shared/access/core.js:
//   { action: "status", ...locator }                  -> { locked, canUnlock, blocked, maskedEmail }
//   { action: "claim", ...locator, linkCode }         -> { ok: true } + the unlock cookie
//   { action: "send", ...locator }                    -> { challenge, retryAfterSeconds, ... }
//   { action: "verify", ...locator, challenge, code } -> { ok: true } + the unlock cookie
// Claim takes the one-time link code from the emailed link's #k= fragment;
// when it is missing or spent, the page asks for a 6-digit code instead.
// Codes go only to the client email on the record. Everything is a POST from
// page script, so a mail scanner that only fetches the link never claims a
// link code or sends a code.
//
// Logs name the record's number and counts only: never the code, link code,
// challenge, cookie, link token, email address or IP.

const { send, readJson, handleError, HttpError, str } = require("../http");
const { clientIp } = require("../turnstile");
const { createRateLimiter } = require("../rateLimit");
const { sendEmail } = require("../email/send");
const { maskEmail, CODE_TTL_MS, MAX_TRIES, MAX_MISSES, GUESSABLE_MAX_MISSES } = require("./core");

const MINUTE_MS = 60 * 1000;
const SENDS_PER_IP_HOUR = 10;
const VERIFIES_PER_IP_10_MIN = 30;
// Classic Functions may freeze the instance once the handler returns, so the
// lockout alert is awaited, but never for longer than this.
const ALERT_WAIT_MS = 2000;

const TOO_MANY = "Too many tries. Ask for a new code.";
const LINK_CODE_NEEDED = "This link needs a code to open here. We'll email you one.";
const NEW_CODE = {
  invalid: "That code isn't valid any more. Ask for a new one.",
  expired: "That code has expired. Ask for a new one.",
  stale: "That code is for an older version of this link. Ask for a new one.",
};

const ACTION_NAMES = ["status", "claim", "send", "verify"];

/** Whether the endpoint knows this action, for a router that checks it before the kind. */
const isAccessAction = (action) => typeof action === "string" && ACTION_NAMES.includes(action);

// Resend's error text can quote the recipient; keep addresses out of the logs.
const redact = (text) => String(text || "").replace(/[^\s@]+@[^\s@]+/g, "[email]");

/**
 * The handler for one kind of record. deps:
 *   access    createAccess(scheme) for the kind
 *   locator   check(body) throws the "not found" error for a malformed
 *             locator, before any switch, secret or lookup; find(svc, body)
 *             loads the record or throws that same error; guessable(body),
 *             optional, is true for a locator anyone could type (an unsigned
 *             invoice link): status and send then never show the masked
 *             address, code emails get the tighter guessable quota, and
 *             wrong codes count in a scope of their own that never blocks
 *             the record's other links
 *   emails    code(record, code, minutes) and lockedAlert(record, atIso,
 *             blocked, { linkBlocked }) give { subject, html, text };
 *             linkBlocked: only a guessable link's own share ran out
 *   labels    ref (the record's name in log lines) and the kind's texts
 *             noEmail, gateOff and blocked; log, the log tag, defaults to
 *             the scheme's logTag
 *   services  () => { locks, now, ... }, passed to locator.find
 *   env, send, alertWaitMs  replaceable in tests
 */
function createAccessEndpoint(deps) {
  const { access, locator, emails } = deps;
  const labels = { log: access.scheme.logTag, ...deps.labels };
  const env = deps.env || process.env;
  const sendMail = deps.send || sendEmail;
  const alertWaitMs = deps.alertWaitMs ?? ALERT_WAIT_MS;
  const allowSendFromIp = createRateLimiter({ limit: SENDS_PER_IP_HOUR, windowMs: 60 * MINUTE_MS });
  const allowVerifyFromIp = createRateLimiter({
    limit: VERIFIES_PER_IP_10_MIN,
    windowMs: 10 * MINUTE_MS,
  });
  const name = (record) => `${labels.ref}=${access.subject(record).logName}`;

  async function status({ svc, secret, record, req, guessable, nowMs }) {
    const unlocked = await access.hasAccess({ secret, locks: svc.locks, req, record, nowMs });
    const maskedEmail = maskEmail(access.subject(record).clientEmail);
    const blocked =
      !unlocked &&
      Boolean(maskedEmail) &&
      (await access.sendsBlocked(svc.locks, record, await access.currentEpoch(svc.locks, record), {
        guessable,
      }));
    return {
      status: 200,
      body: {
        locked: !unlocked,
        canUnlock: Boolean(maskedEmail) && !blocked,
        blocked,
        maskedEmail: guessable ? null : maskedEmail,
      },
    };
  }

  async function sendCode({ context, svc, secret, record, ip, guessable, nowMs }) {
    if (!allowSendFromIp(ip || "unknown", 1, nowMs))
      throw new HttpError(429, "Too many codes asked for. Try again later.");
    const { clientEmail } = access.subject(record);
    if (!maskEmail(clientEmail)) throw new HttpError(409, labels.noEmail, { noEmail: true });
    const epoch = await access.currentEpoch(svc.locks, record);
    if (await access.sendsBlocked(svc.locks, record, epoch, { guessable })) {
      context.log(`${labels.log} blocked ${name(record)}`);
      throw new HttpError(403, labels.blocked, { blocked: true });
    }
    const slots = await access.takeSendSlots(svc.locks, record, epoch, nowMs, { guessable });
    if (!slots.ok) {
      context.log(`${labels.log} limit ${name(record)}`);
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
          `${labels.log} gap release failed ${name(record)}: ${redact(err && err.message)}`,
        );
      }
    };
    let issued;
    let mail;
    try {
      issued = access.issueChallenge(secret, record, epoch, nowMs);
      const minutes = CODE_TTL_MS / MINUTE_MS;
      mail = await sendMail({ to: clientEmail, ...emails.code(record, issued.code, minutes) });
    } catch (err) {
      await releaseGap();
      throw err;
    }
    if (!mail.ok) {
      await releaseGap();
      context.log.error(`${labels.log} send failed ${name(record)}: ${redact(mail.error)}`);
      throw new HttpError(502, "We couldn't send the code. Please try again in a minute.");
    }
    context.log(`${labels.log} send ${name(record)}`);
    return {
      status: 200,
      body: {
        challenge: issued.challenge,
        maskedEmail: guessable ? null : maskEmail(clientEmail),
        expiresInSeconds: CODE_TTL_MS / 1000,
        retryAfterSeconds: slots.retryAfterSeconds,
      },
    };
  }

  // Awaited but capped at ALERT_WAIT_MS: the 429 must not wait on Resend, and
  // a fire-and-forget send could be frozen with the instance after return.
  async function alertLockout(context, record, nowMs, blocked, linkBlocked = false) {
    let timer;
    const timedOut = new Promise((resolve) => {
      timer = setTimeout(() => resolve({ ok: false, error: "timed out" }), alertWaitMs);
    });
    const sending = Promise.resolve()
      .then(() =>
        sendMail({
          to: env.RESEND_TO_EMAIL,
          ...emails.lockedAlert(record, new Date(nowMs).toISOString(), blocked, { linkBlocked }),
        }),
      )
      .catch((err) => ({ ok: false, error: err && err.message }));
    const mail = await Promise.race([sending, timedOut]);
    clearTimeout(timer);
    if (!mail.ok)
      context.log.error(`${labels.log} lock alert failed ${name(record)}: ${redact(mail.error)}`);
  }

  async function verifyCode({ context, svc, secret, record, body, ip, guessable, nowMs }) {
    if (!allowVerifyFromIp(ip || "unknown", 1, nowMs)) throw new HttpError(429, TOO_MANY);
    const code = str(body.code, 40).replace(/[\s-]/g, "");
    if (!/^\d{6}$/.test(code)) throw new HttpError(400, "Enter the 6-digit code from the email.");
    const checked = await access.checkChallenge({
      secret,
      locks: svc.locks,
      record,
      challenge: body.challenge,
      nowMs,
    });
    if (!checked.ok) throw new HttpError(400, NEW_CODE[checked.reason], { newCodeNeeded: true });
    // Challenges fetched before the block must not keep a guesser going after it.
    if (await access.sendsBlocked(svc.locks, record, checked.epoch, { guessable }))
      throw new HttpError(403, labels.blocked, { blocked: true });

    const attempt = await access.takeTry(svc.locks, checked.challengeId);
    if (!attempt) throw new HttpError(429, TOO_MANY, { triesLeft: 0, newCodeNeeded: true });
    const triesLeft = MAX_TRIES - attempt;
    if (!access.codeMatches(secret, checked.challengeId, code)) {
      const misses = await access.recordMiss(svc.locks, record, checked.epoch, { guessable });
      // A guessable link's own share running out blocks that link only; for
      // it, misses counts that share (core recordMiss).
      const linkBlocked = guessable && misses === GUESSABLE_MAX_MISSES;
      const blocked = misses === 0 || misses === MAX_MISSES || linkBlocked;
      const lockedOut = triesLeft === 0;
      context.log(`${labels.log} verify ${name(record)} triesLeft=${triesLeft} misses=${misses}`);
      // One alert per locked-out challenge (owner decision), and one when the
      // record blocks; never both for one guess. At most MAX_MISSES / MAX_TRIES
      // + 1 alerts per revision and epoch, plus one when a guessable link
      // blocks. Only one request can get the last try slot of a challenge, or
      // miss slot MAX_MISSES, or a guessable link's last slot. That block has
      // its own alert (linkBlocked): the record and its signed link still work.
      if (misses === MAX_MISSES || linkBlocked || (lockedOut && !blocked)) {
        context.log.warn(
          `${labels.log} ${misses === MAX_MISSES ? "blocked" : "lock"} ${name(record)}`,
        );
        await alertLockout(context, record, nowMs, misses === MAX_MISSES, linkBlocked);
      }
      if (blocked) throw new HttpError(403, labels.blocked, { triesLeft: 0, blocked: true });
      if (!lockedOut)
        throw new HttpError(400, "That code isn't right. Check the email and try again.", {
          triesLeft,
        });
      throw new HttpError(429, TOO_MANY, { triesLeft: 0, newCodeNeeded: true });
    }
    if (!(await access.takeUse(svc.locks, checked.challengeId)))
      throw new HttpError(409, "That code has already been used. Ask for a new one.", {
        newCodeNeeded: true,
      });
    // The epoch the code was checked against, so a reset mid-request can't
    // hand an old code a cookie for the new epoch.
    context.log(`${labels.log} verify ok ${name(record)}`);
    return {
      status: 200,
      body: { ok: true },
      cookie: access.sessionCookie(secret, record, checked.epoch, nowMs),
    };
  }

  // Allowed even when codes are blocked: a link code can't be guessed, it
  // only comes in an email the admin sent, so it proves what a typed code
  // would. The block is there to stop guessing.
  async function claim({ context, svc, secret, record, body, ip, nowMs }) {
    if (!allowVerifyFromIp(ip || "unknown", 1, nowMs)) throw new HttpError(429, TOO_MANY);
    const checked = await access.checkLinkCode({
      secret,
      locks: svc.locks,
      record,
      linkCode: body.linkCode,
      nowMs,
    });
    if (!checked.ok) {
      context.log(`${labels.log} claim refused ${name(record)} reason=${checked.reason}`);
      throw new HttpError(400, LINK_CODE_NEEDED, { codeNeeded: true });
    }
    if (!(await access.claimLinkCode(svc.locks, checked.nonce))) {
      context.log(`${labels.log} claim refused ${name(record)} reason=used`);
      throw new HttpError(409, LINK_CODE_NEEDED, { codeNeeded: true });
    }
    context.log(`${labels.log} claim ok ${name(record)}`);
    return {
      status: 200,
      body: { ok: true },
      cookie: access.sessionCookie(secret, record, checked.epoch, nowMs),
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
      locator.check(body);
      const logError = (message) => context.log.error(message);
      if (!access.gateEnabled(env, logError)) {
        if (body.action === "status") return send(context, 200, { locked: false, gateOff: true });
        throw new HttpError(409, labels.gateOff, { gateOff: true });
      }
      const secret = access.accessSecret(env, logError);
      const svc = deps.services();
      const record = await locator.find(svc, body);
      const result = await run({
        context,
        svc,
        secret,
        record,
        body,
        req,
        guessable: Boolean(locator.guessable && locator.guessable(body)),
        ip: clientIp(req),
        nowMs: svc.now().getTime(),
      });
      send(context, result.status, result.body);
      if (result.cookie) context.res.headers["Set-Cookie"] = result.cookie;
    } catch (err) {
      return handleError(context, err, labels.log);
    }
  };
}

module.exports = { createAccessEndpoint, isAccessAction };
