// Email-code access to a client quote link (docs/plans/2026-10-20-quote-access-code.md).
//
// The link token finds the quote; a 6-digit code emailed to the client proves
// the person holding the link can read the client's mail. Nothing secret is
// stored: the challenge is an HMAC-signed token, the code is derived from it,
// and the 30-day unlock is an HMAC-signed HttpOnly cookie. Counts that must
// hold across instances (tries, single use, send quotas, the access epoch)
// are rows in the existing `locks` table, so this works on Appwrite and on
// Cosmos without a schema change.
//
// Session binding: a cookie holds the quote id, revision, access epoch and a
// keyed tag of the client email. Revise bumps the revision. Rotate ("New
// link") takes the next epoch slot (bumpEpoch). Changing the client email
// changes the tag, so an unlock earned through the old address ends. A payment
// request, or "Email again" to the same address, issues a fresh link but
// changes none of these, so the client stays unlocked.

const crypto = require("crypto");
const { HttpError } = require("../http");

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const CODE_TTL_MS = 10 * MINUTE_MS;
const SESSION_TTL_MS = 30 * DAY_MS;
const MAX_TRIES = 5;
const SENDS_PER_HOUR = 5;
const SENDS_PER_DAY = 10;
const MIN_SECRET_LENGTH = 32;
// Far above any real number of "New link" presses on one revision; stops a
// runaway loop if the locks table misbehaves.
const MAX_EPOCH = 1000;
const MAX_TOKEN_LENGTH = 1024;
const SECRET_MISSING = "Quote links are unavailable right now. Please try again later.";

let secretErrorLogged = false;

/** Whether the gate is on. Unset or "on" means on; "off" is the kill switch. */
function gateEnabled(env = process.env) {
  const value = env.QUOTE_ACCESS_GATE;
  if (value === undefined || value === "" || value === "on") return true;
  if (value === "off") return false;
  throw new Error(`QUOTE_ACCESS_GATE must be "on" or "off", not "${value}"`);
}

/** QUOTE_ACCESS_SECRET, or a 503 when it is missing or too short (fails closed). */
function accessSecret(env = process.env, logError = console.error) {
  const secret = env.QUOTE_ACCESS_SECRET;
  if (typeof secret === "string" && secret.length >= MIN_SECRET_LENGTH) return secret;
  if (!secretErrorLogged) {
    secretErrorLogged = true;
    logError(
      `quote-access: QUOTE_ACCESS_SECRET is missing or shorter than ${MIN_SECRET_LENGTH} characters`,
    );
  }
  throw new HttpError(503, SECRET_MISSING);
}

const hmac = (secret, label, data) =>
  crypto.createHmac("sha256", secret).update(`${label}${data}`).digest();

function equalBytes(a, b) {
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Signed token: "v1.<base64url JSON>.<base64url HMAC>". The label keeps a
// challenge from ever verifying as a session, and the reverse.
function sign(secret, label, payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `v1.${body}.${hmac(secret, label, body).toString("base64url")}`;
}

function unsign(secret, label, token) {
  if (typeof token !== "string" || token.length > MAX_TOKEN_LENGTH) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  const [, body, sig] = parts;
  if (!equalBytes(Buffer.from(sig, "base64url"), hmac(secret, label, body))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return payload && typeof payload === "object" && !Array.isArray(payload) ? payload : null;
  } catch {
    return null;
  }
}

const sha256Hex = (text) => crypto.createHash("sha256").update(text).digest("hex");

function normalEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

// Ties a challenge or a session to the client email without putting the
// address in the token. Keyed, so whoever holds a token can't confirm a
// guessed address offline.
const mailTag = (secret, email) =>
  hmac(secret, "qa-mail:", normalEmail(email)).toString("base64url").slice(0, 22);

/** "p•••••@hotmail.com": first character, five dots, the domain. Null if it isn't an address. */
function maskEmail(email) {
  const address = normalEmail(email);
  const at = address.lastIndexOf("@");
  if (at < 1 || at === address.length - 1) return null;
  return `${address[0]}•••••${address.slice(at)}`;
}

const epochKey = (quote, n) => `qa:epoch:${quote.id}:${quote.revision}:${n}`;

/** How many times this revision's access has been reset by rotate (0 if never). */
async function currentEpoch(locks, quote) {
  let n = 0;
  while (await locks.has(epochKey(quote, n + 1))) {
    n += 1;
    if (n >= MAX_EPOCH) throw new Error(`quote-access: epoch limit reached on ${quote.id}`);
  }
  return n;
}

/** Locks every browser out of this revision. Slots are never released, so they stay dense. */
async function bumpEpoch(locks, quote) {
  let n = (await currentEpoch(locks, quote)) + 1;
  while (!(await locks.take(epochKey(quote, n)))) {
    n += 1;
    if (n > MAX_EPOCH) throw new Error(`quote-access: epoch limit reached on ${quote.id}`);
  }
  return n;
}

const isEpochCurrent = async (locks, quote, e) => !(await locks.has(epochKey(quote, e + 1)));

const isCount = (v) => Number.isInteger(v) && v >= 0;

/** The 6-digit code for a challenge id. Derived, never stored. */
function codeFor(secret, challengeId) {
  const n = hmac(secret, "qa-code:", challengeId).readUInt32BE(0) % 1000000;
  return String(n).padStart(6, "0");
}

function issueChallenge(secret, quote, epoch, nowMs) {
  const payload = {
    c: crypto.randomBytes(16).toString("base64url"),
    q: quote.id,
    r: quote.revision,
    e: epoch,
    m: mailTag(secret, quote.clientEmail),
    x: nowMs + CODE_TTL_MS,
  };
  return {
    challenge: sign(secret, "qa-chal:", payload),
    challengeId: payload.c,
    code: codeFor(secret, payload.c),
  };
}

/**
 * Checks a challenge against the quote the link found. Returns
 * { ok: true, challengeId } or { ok: false, reason } with reason one of
 * "invalid" (bad signature or shape), "expired", "stale" (another quote, an
 * older revision or epoch, or the client email changed since it was sent).
 */
async function checkChallenge({ secret, locks, quote, challenge, nowMs }) {
  const p = unsign(secret, "qa-chal:", challenge);
  if (!p || typeof p.c !== "string" || !isCount(p.e) || typeof p.x !== "number")
    return { ok: false, reason: "invalid" };
  if (p.x <= nowMs) return { ok: false, reason: "expired" };
  if (p.q !== quote.id || p.r !== quote.revision || p.m !== mailTag(secret, quote.clientEmail))
    return { ok: false, reason: "stale" };
  if (!(await isEpochCurrent(locks, quote, p.e))) return { ok: false, reason: "stale" };
  return { ok: true, challengeId: p.c };
}

/** Constant-time comparison of a typed code with the challenge's code. */
function codeMatches(secret, challengeId, code) {
  return equalBytes(Buffer.from(codeFor(secret, challengeId)), Buffer.from(String(code)));
}

/** Takes the next of the challenge's five try slots. Returns 1..5, or 0 when none is left. */
async function takeTry(locks, challengeId) {
  for (let n = 1; n <= MAX_TRIES; n += 1) {
    if (await locks.take(`qa:try:${challengeId}:${n}`)) return n;
  }
  return 0;
}

/** Marks the challenge used. False if another request used it first. */
function takeUse(locks, challengeId) {
  return locks.take(`qa:used:${challengeId}`);
}

async function takeFirstFree(locks, prefix, limit) {
  for (let n = 1; n <= limit; n += 1) {
    const key = `${prefix}:${n}`;
    if (await locks.take(key)) return key;
  }
  return null;
}

const secondsUntil = (nowMs, windowMs) => Math.ceil((windowMs - (nowMs % windowMs)) / 1000);

/**
 * Reserves one code email for this quote: one a minute, five an hour, ten a
 * UTC day, across every instance. Returns { ok: true, releaseMinute } or
 * { ok: false, retryAfterSeconds }. releaseMinute() hands the minute back
 * when the email then fails; the hour and day slots stay spent on purpose.
 */
async function takeSendSlots(locks, quoteId, nowMs) {
  const minuteKey = `qa:send:${quoteId}:m:${Math.floor(nowMs / MINUTE_MS)}`;
  if (!(await locks.take(minuteKey)))
    return { ok: false, retryAfterSeconds: secondsUntil(nowMs, MINUTE_MS) };
  const hourKey = await takeFirstFree(
    locks,
    `qa:send:${quoteId}:h:${Math.floor(nowMs / HOUR_MS)}`,
    SENDS_PER_HOUR,
  );
  if (!hourKey) {
    await locks.release(minuteKey);
    return { ok: false, retryAfterSeconds: secondsUntil(nowMs, HOUR_MS) };
  }
  const dayKey = await takeFirstFree(
    locks,
    `qa:send:${quoteId}:d:${Math.floor(nowMs / DAY_MS)}`,
    SENDS_PER_DAY,
  );
  if (!dayKey) {
    await Promise.all([locks.release(minuteKey), locks.release(hourKey)]);
    return { ok: false, retryAfterSeconds: secondsUntil(nowMs, DAY_MS) };
  }
  return { ok: true, releaseMinute: () => locks.release(minuteKey) };
}

/** Per quote, not per link, so a payment request's fresh link keeps the unlock. */
const sessionCookieName = (quoteId) => `oc_qa_${sha256Hex(`qa-name:${quoteId}`).slice(0, 16)}`;

/**
 * The Set-Cookie header for a fresh unlock. Path=/api, because a cookie path
 * only matches at a "/" boundary: "/api/quote-" would never reach
 * /api/quote-view. Not sliding: it is never re-issued on later visits.
 */
function sessionCookie(secret, quote, epoch, nowMs) {
  const value = sign(secret, "qa-sess:", {
    q: quote.id,
    r: quote.revision,
    e: epoch,
    m: mailTag(secret, quote.clientEmail),
    x: nowMs + SESSION_TTL_MS,
  });
  const maxAge = SESSION_TTL_MS / 1000;
  return `${sessionCookieName(quote.id)}=${value}; Max-Age=${maxAge}; Path=/api; HttpOnly; Secure; SameSite=Strict`;
}

function readCookie(req, name) {
  const header = (req && req.headers && req.headers.cookie) || "";
  for (const part of String(header).split(";")) {
    const eq = part.indexOf("=");
    if (eq > 0 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

/** Whether the request carries a live unlock for this quote's revision, epoch and client email. */
async function hasAccess({ secret, locks, req, quote, nowMs }) {
  const p = unsign(secret, "qa-sess:", readCookie(req, sessionCookieName(quote.id)));
  if (!p || !isCount(p.e) || typeof p.x !== "number" || p.x <= nowMs) return false;
  if (p.q !== quote.id || p.r !== quote.revision) return false;
  if (p.m !== mailTag(secret, quote.clientEmail)) return false;
  return isEpochCurrent(locks, quote, p.e);
}

module.exports = {
  CODE_TTL_MS,
  MAX_TRIES,
  gateEnabled,
  accessSecret,
  maskEmail,
  currentEpoch,
  bumpEpoch,
  codeFor,
  issueChallenge,
  checkChallenge,
  codeMatches,
  takeTry,
  takeUse,
  takeSendSlots,
  sessionCookieName,
  sessionCookie,
  hasAccess,
};
