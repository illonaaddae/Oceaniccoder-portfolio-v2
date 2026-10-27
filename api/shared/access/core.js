// Email-code access to a client document link, for any kind of record
// (docs/plans/2026-10-20-quote-access-code.md for the rules,
// docs/plans/2026-10-25-invoice-receipt-access-codes.md for the split).
//
// The link finds the record. The browser proves it can read the client's
// mail either with the one-time link code in the emailed link's fragment
// (#k=), or with a 6-digit code emailed on request. Nothing secret is stored:
// the challenge is an HMAC-signed token, the code is derived from it, and the
// 30-day unlock is an HMAC-signed HttpOnly cookie. Counts that must hold
// across instances (tries, single use, send quotas, the access epoch) are
// rows in the Cosmos `locks` container, so they need no schema of their own.
//
// createAccess(scheme) gives one kind of record its own HMAC labels, lock-row
// prefix, cookie prefix and kill switch, so an unlock for one kind can never
// verify as another. scheme.subject(record) maps a record onto what the rules
// need:
//   id          what cookies, challenges and the mail tag are keyed by
//   revision    a bump ends every unlock
//   linkId      what a link code is bound to
//   clientEmail where codes go, and input to the mail tag
//   scopeId     whose epoch, send quotas and wrong-code count apply
//
// Session binding: a cookie holds the id, revision, access epoch and a keyed
// tag of the client email. A revision bump or the next epoch slot (bumpEpoch)
// ends it; so does changing the client email, which changes the tag.

const crypto = require("crypto");
const { HttpError } = require("../http");

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const CODE_TTL_MS = 10 * MINUTE_MS;
const SESSION_TTL_MS = 30 * DAY_MS;
// A link code works for 45 days from the email it came in: longer than a
// quote's usual validity plus the wait for a payment request, short enough
// that an old email found later is no longer a key. Each new email mints one.
const LINK_CODE_TTL_MS = 45 * DAY_MS;
// Instances' clocks can differ a little; a code minted "in the future" by up
// to this much still works.
const CLOCK_SKEW_MS = 5 * MINUTE_MS;
const MAX_TRIES = 5;
const SENDS_PER_HOUR = 5;
const SENDS_PER_DAY = 10;
// After this many wrong codes on one revision and epoch, across all its
// challenges, no more codes are sent or checked until the access is reset.
// Counting guesses, not locked-out challenges, means four wrong tries per
// challenge can't dodge it.
const MAX_MISSES = 15;
// Wrong codes typed through a guessable link (an unsigned invoice link) also
// count in a scope of their own, capped at one challenge's worth. Reaching it
// blocks only guessable links, and since every guess also takes one of the
// MAX_MISSES slots, a guesser can spend at most 5 of the 15 and never block
// the signed link the client was emailed.
const GUESSABLE_MAX_MISSES = MAX_TRIES;
// The gap between code emails is rolling, not per clock minute: each send
// reserves GAP_BUCKETS buckets of GAP_BUCKET_MS starting at its own, so the
// next one gets through 60 to 90 seconds later.
const GAP_BUCKET_MS = 30 * 1000;
const GAP_BUCKETS = 3;
// A link that can be guessed (an unsigned invoice link in its grace period)
// lets anyone make the client receive code emails, so it gets a tighter quota
// on top of the usual one (owner decision Q3, 2026-10-26): 10 to 15 minutes
// apart (three 5-minute buckets) and three a UTC day.
const GUESSABLE_GAP_BUCKET_MS = 5 * MINUTE_MS;
const GUESSABLE_SENDS_PER_DAY = 3;
const MIN_SECRET_LENGTH = 32;
// One secret for every kind; each scheme's HMAC labels keep their tokens
// apart (design 8.1).
const SECRET_VAR = "QUOTE_ACCESS_SECRET";
// Far above any real number of resets on one revision; stops a runaway loop
// if the locks table misbehaves.
const MAX_EPOCH = 1000;
const MAX_TOKEN_LENGTH = 1024;
// Retention for the lock rows (owner decision, 2026-10-21):
// - send, try and used rows one day; every window they guard is shorter;
// - link-code rows the link-code lifetime plus skew plus a day, so a used link
//   code can't be claimed again while it would still check out, even if the
//   lock store's clock runs behind ours;
// - miss rows until their revision or epoch is superseded, or the record is
//   gone; a live counter is never dropped;
// - epoch rows never; they hold the lockout of every older session.
const SHORT_RETENTION_MS = DAY_MS;
const LINK_RETENTION_MS = LINK_CODE_TTL_MS + CLOCK_SKEW_MS + DAY_MS;

// Webmail domains are shown in full: they say nothing about who the client
// is. Any other domain usually names their business, so it is masked too.
const WEBMAIL = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
]);
const DOTS = "•••••";

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

function maskDomain(domain) {
  if (WEBMAIL.has(domain) || /^gmx\.[a-z]+$/.test(domain)) return domain;
  const dot = domain.lastIndexOf(".");
  if (dot < 1) return `${domain[0]}${DOTS}`;
  return `${domain[0]}${DOTS}${domain.slice(dot)}`;
}

/**
 * "p•••••@hotmail.com" for webmail, "j•••••@s•••••.com" for any other domain
 * (first character, five dots, the top-level domain). Null if it isn't an address.
 */
function maskEmail(email) {
  const address = normalEmail(email);
  const at = address.lastIndexOf("@");
  if (at < 1 || at === address.length - 1) return null;
  return `${address[0]}${DOTS}@${maskDomain(address.slice(at + 1))}`;
}

const isCount = (v) => Number.isInteger(v) && v >= 0;

async function takeFirstFree(locks, prefix, limit) {
  for (let n = 1; n <= limit; n += 1) {
    const key = `${prefix}:${n}`;
    if (await locks.take(key)) return key;
  }
  return null;
}

const secondsUntil = (nowMs, windowMs) => Math.ceil((windowMs - (nowMs % windowMs)) / 1000);

const releaseAll = (locks, keys) => Promise.all(keys.map((key) => locks.release(key)));

// "<rows>:miss:<scopeId>:<revision>:<epoch>:<n>", read from the right so a
// scope id can't shift the fields.
function parseMissKey(key) {
  const parts = key.split(":");
  if (parts.length < 6) return null;
  const [rev, epoch] = parts.slice(-3, -1).map(Number);
  const scopeId = parts.slice(2, -3).join(":");
  if (!scopeId || !isCount(rev) || !isCount(epoch)) return null;
  return { scopeId, rev, epoch };
}

function readCookie(req, name) {
  const header = (req && req.headers && req.headers.cookie) || "";
  for (const part of String(header).split(";")) {
    const eq = part.indexOf("=");
    if (eq > 0 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

const SCHEME_NAME_RE = /^[a-z]{2,8}$/;
// Every scheme created in this process. rows are left out of the uniqueness
// check on purpose (receipts share the quote's rows); only their pruning is.
const usedLabels = new Set();
const usedCookies = new Set();
const prunedRows = new Set();
// createAccess result -> its prune rule, for pruneAcrossSchemes. Kept off the
// returned object: pruneAccessLocks is the single-scheme form of
// pruneAcrossSchemes, and both go through it.
const pruneRules = new WeakMap();

function validateScheme(scheme) {
  const fail = (why) => {
    throw new Error(`createAccess: ${why}`);
  };
  if (!scheme || typeof scheme !== "object") fail("a scheme object is required");
  for (const field of ["label", "rows", "cookie"]) {
    if (typeof scheme[field] !== "string" || !SCHEME_NAME_RE.test(scheme[field]))
      fail(`${field} must be 2 to 8 lowercase letters`);
  }
  if (typeof scheme.subject !== "function") fail("subject must be a function");
  for (const field of ["gateVar", "logTag", "unavailable", "locked"]) {
    if (typeof scheme[field] !== "string" || !scheme[field]) fail(`${field} is required`);
  }
  if (scheme.prunes !== undefined && typeof scheme.prunes !== "boolean")
    fail("prunes must be true or false");
  if (usedLabels.has(scheme.label)) fail(`label "${scheme.label}" is already used`);
  if (usedCookies.has(scheme.cookie)) fail(`cookie "${scheme.cookie}" is already used`);
  const prunes = scheme.prunes !== false;
  if (prunes && prunedRows.has(scheme.rows))
    fail(`rows "${scheme.rows}" are already pruned by another scheme; set prunes: false`);
  usedLabels.add(scheme.label);
  usedCookies.add(scheme.cookie);
  if (prunes) prunedRows.add(scheme.rows);
}

/**
 * The access rules for one kind of record. scheme:
 *   label       HMAC domain prefix: `${label}-chal:`, -code, -sess, -mail, -link, -name
 *   rows        lock-row prefix: `${rows}:epoch:`, :send:, :try:, :used:, :miss:, :lk:
 *   cookie      cookie name prefix: `__Secure-oc_${cookie}_`
 *   gateVar     kill switch env var: unset or "on" is on, "off" is off
 *   logTag      prefix of this module's log lines and errors
 *   unavailable 503 text when the switch or the secret is misconfigured
 *   locked      401 text when a request has no unlock
 *   subject     (record) => { id, revision, linkId, clientEmail, scopeId, logName }
 *               (logName is read only by shared/access/endpoint.js, for log
 *               lines: the record's number, never an email or token)
 *   prunes      whether this scheme deletes its `rows` rows (default true).
 *               A kind that shares another kind's rows (receipts share the
 *               quote's "qa") sets false and leaves pruning to the owner.
 *
 * label and cookie are separate settings even though every kind so far uses
 * the same value for both: the label is a signing domain inside tokens and
 * the cookie prefix is a name stored in client browsers, and either may need
 * to change without the other (a new signing domain must not rename every
 * cookie, nor the reverse).
 *
 * Throws at load when the scheme is malformed, or when its label or cookie
 * is already used by another scheme, or when a second scheme claims to prune
 * the same rows: any of those would let one kind's tokens, cookies or rows
 * pass as another's. Call it once per kind at module load, never inside a
 * handler or factory: a second call with the same names throws.
 */
function createAccess(input) {
  // One read of every field (getters included), so what is validated is what
  // signs.
  const scheme = Object.freeze({ ...input });
  validateScheme(scheme);
  const { label, rows, cookie, gateVar, logTag, unavailable, locked, subject } = scheme;
  const prunes = scheme.prunes !== false;
  let gateErrorLogged = false;
  let secretErrorLogged = false;

  /**
   * Whether the gate is on. Unset or "on" means on; "off" is the kill switch.
   * Any other value is a configuration mistake: 503 rather than guessing which
   * way it was meant, logged once.
   */
  function gateEnabled(env = process.env, logError = console.error) {
    const value = env[gateVar];
    if (value === undefined || value === "" || value === "on") return true;
    if (value === "off") return false;
    if (!gateErrorLogged) {
      gateErrorLogged = true;
      logError(`${logTag}: ${gateVar} must be "on" or "off"`);
    }
    throw new HttpError(503, unavailable);
  }

  /** The access secret, or a 503 when it is missing or too short (fails closed). */
  function accessSecret(env = process.env, logError = console.error) {
    const secret = env[SECRET_VAR];
    if (typeof secret === "string" && secret.length >= MIN_SECRET_LENGTH) return secret;
    if (!secretErrorLogged) {
      secretErrorLogged = true;
      logError(
        `${logTag}: ${SECRET_VAR} is missing or shorter than ${MIN_SECRET_LENGTH} characters`,
      );
    }
    throw new HttpError(503, unavailable);
  }

  // Ties a challenge or a session to the client email without putting the
  // address in the token. Keyed, so whoever holds a token can't confirm a
  // guessed address offline, and over the id too, so two records for the
  // same client don't share a tag.
  const mailTag = (secret, s) =>
    hmac(secret, `${label}-mail:`, `${s.id}:${normalEmail(s.clientEmail)}`)
      .toString("base64url")
      .slice(0, 22);

  const epochKey = (s, n) => `${rows}:epoch:${s.scopeId}:${s.revision}:${n}`;

  async function epochOf(locks, s) {
    let n = 0;
    while (await locks.has(epochKey(s, n + 1))) {
      n += 1;
      if (n >= MAX_EPOCH) throw new Error(`${logTag}: epoch limit reached on ${s.scopeId}`);
    }
    return n;
  }

  /** How many times this revision's access has been reset (0 if never). */
  const currentEpoch = (locks, record) => epochOf(locks, subject(record));

  /** Locks every browser out of this revision. Slots are never released, so they stay dense. */
  async function bumpEpoch(locks, record) {
    const s = subject(record);
    let n = (await epochOf(locks, s)) + 1;
    while (!(await locks.take(epochKey(s, n)))) {
      n += 1;
      if (n > MAX_EPOCH) throw new Error(`${logTag}: epoch limit reached on ${s.scopeId}`);
    }
    return n;
  }

  const isEpochCurrent = async (locks, s, e) => !(await locks.has(epochKey(s, e + 1)));

  /** The 6-digit code for a challenge id. Derived, never stored. */
  function codeFor(secret, challengeId) {
    const n = hmac(secret, `${label}-code:`, challengeId).readUInt32BE(0) % 1000000;
    return String(n).padStart(6, "0");
  }

  function issueChallenge(secret, record, epoch, nowMs) {
    const s = subject(record);
    const payload = {
      c: crypto.randomBytes(16).toString("base64url"),
      q: s.id,
      r: s.revision,
      e: epoch,
      m: mailTag(secret, s),
      x: nowMs + CODE_TTL_MS,
    };
    return {
      challenge: sign(secret, `${label}-chal:`, payload),
      challengeId: payload.c,
      code: codeFor(secret, payload.c),
    };
  }

  /**
   * Checks a challenge against the record the link found. Returns
   * { ok: true, challengeId, epoch } or { ok: false, reason } with reason one
   * of "invalid" (bad signature or shape), "expired", "stale" (another record,
   * an older revision or epoch, or the client email changed since it was sent).
   */
  async function checkChallenge({ secret, locks, record, challenge, nowMs }) {
    const s = subject(record);
    const p = unsign(secret, `${label}-chal:`, challenge);
    if (!p || typeof p.c !== "string" || !isCount(p.e) || typeof p.x !== "number")
      return { ok: false, reason: "invalid" };
    if (p.x <= nowMs) return { ok: false, reason: "expired" };
    if (p.q !== s.id || p.r !== s.revision || p.m !== mailTag(secret, s))
      return { ok: false, reason: "stale" };
    if (!(await isEpochCurrent(locks, s, p.e))) return { ok: false, reason: "stale" };
    return { ok: true, challengeId: p.c, epoch: p.e };
  }

  /** Constant-time comparison of a typed code with the challenge's code. */
  function codeMatches(secret, challengeId, code) {
    return equalBytes(Buffer.from(codeFor(secret, challengeId)), Buffer.from(String(code)));
  }

  /** Takes the next of the challenge's five try slots. Returns 1..5, or 0 when none is left. */
  async function takeTry(locks, challengeId) {
    for (let n = 1; n <= MAX_TRIES; n += 1) {
      if (await locks.take(`${rows}:try:${challengeId}:${n}`)) return n;
    }
    return 0;
  }

  /** Marks the challenge used. False if another request used it first. */
  function takeUse(locks, challengeId) {
    return locks.take(`${rows}:used:${challengeId}`);
  }

  // Send quotas belong to one revision and epoch, so a reset gives a client
  // back a quota that a leaked-link holder used up.
  const sendScope = (s, epoch) => `${rows}:send:${s.scopeId}:${s.revision}:${epoch}`;

  // Takes the gap buckets ("<prefix>:<b>") in ascending order, so of two
  // overlapping sends the later one is refused. Returns the keys, or null
  // after handing back any it took.
  async function takeGap(locks, prefix, bucketMs, nowMs) {
    const first = Math.floor(nowMs / bucketMs);
    const taken = [];
    for (let b = first; b < first + GAP_BUCKETS; b += 1) {
      const key = `${prefix}:${b}`;
      if (!(await locks.take(key))) {
        await releaseAll(locks, taken);
        return null;
      }
      taken.push(key);
    }
    return taken;
  }

  // Seconds until the first gap bucket nobody holds.
  async function gapRetryAfter(locks, prefix, bucketMs, nowMs) {
    let b = Math.floor(nowMs / bucketMs);
    const last = b + GAP_BUCKETS;
    while (b < last && (await locks.has(`${prefix}:${b}`))) b += 1;
    return Math.max(1, Math.ceil((b * bucketMs - nowMs) / 1000));
  }

  const gapEnd = (bucketMs, nowMs) => (Math.floor(nowMs / bucketMs) + GAP_BUCKETS) * bucketMs;

  /**
   * Reserves one code email for this record's revision and epoch: at least 60
   * seconds apart, five an hour, ten a UTC day, across every instance. With
   * guessable (a link anyone could type, such as an unsigned invoice link),
   * also at least 10 minutes apart and three a UTC day. Returns { ok: true,
   * retryAfterSeconds, releaseGap } or { ok: false, retryAfterSeconds }.
   * releaseGap() hands the gaps back when the email then fails; the hour and
   * day slots stay spent on purpose.
   */
  async function takeSendSlots(locks, record, epoch, nowMs, { guessable = false } = {}) {
    const scope = sendScope(subject(record), epoch);
    const gapKeys = await takeGap(locks, `${scope}:g`, GAP_BUCKET_MS, nowMs);
    if (!gapKeys)
      return {
        ok: false,
        retryAfterSeconds: await gapRetryAfter(locks, `${scope}:g`, GAP_BUCKET_MS, nowMs),
      };
    if (guessable) {
      const strictGap = await takeGap(locks, `${scope}:ug`, GUESSABLE_GAP_BUCKET_MS, nowMs);
      if (!strictGap) {
        await releaseAll(locks, gapKeys);
        return {
          ok: false,
          retryAfterSeconds: await gapRetryAfter(
            locks,
            `${scope}:ug`,
            GUESSABLE_GAP_BUCKET_MS,
            nowMs,
          ),
        };
      }
      gapKeys.push(...strictGap);
    }
    const hourKey = await takeFirstFree(
      locks,
      `${scope}:h:${Math.floor(nowMs / HOUR_MS)}`,
      SENDS_PER_HOUR,
    );
    if (!hourKey) {
      await releaseAll(locks, gapKeys);
      return { ok: false, retryAfterSeconds: secondsUntil(nowMs, HOUR_MS) };
    }
    const day = Math.floor(nowMs / DAY_MS);
    const dayKey = await takeFirstFree(locks, `${scope}:d:${day}`, SENDS_PER_DAY);
    const strictDayKey =
      dayKey && guessable
        ? await takeFirstFree(locks, `${scope}:ud:${day}`, GUESSABLE_SENDS_PER_DAY)
        : dayKey;
    if (!dayKey || !strictDayKey) {
      await releaseAll(locks, [...gapKeys, hourKey, ...(dayKey ? [dayKey] : [])]);
      return { ok: false, retryAfterSeconds: secondsUntil(nowMs, DAY_MS) };
    }
    const reservedUntil = guessable
      ? gapEnd(GUESSABLE_GAP_BUCKET_MS, nowMs)
      : gapEnd(GAP_BUCKET_MS, nowMs);
    return {
      ok: true,
      retryAfterSeconds: Math.ceil((reservedUntil - nowMs) / 1000),
      releaseGap: () => releaseAll(locks, gapKeys),
    };
  }

  // "umiss" rows count the guessable links' share (GUESSABLE_MAX_MISSES). Same
  // key shape as "miss", so the prune parses both.
  const missPrefix = (s, epoch, guessable = false) =>
    `${rows}:${guessable ? "umiss" : "miss"}:${s.scopeId}:${s.revision}:${epoch}`;
  const slotNumber = (key) => (key ? Number(key.slice(key.lastIndexOf(":") + 1)) : 0);

  /**
   * Counts one wrong code against this revision and epoch. Returns its number,
   * 1..MAX_MISSES, or 0 when every slot was already taken (a parallel guess got
   * the last one). Exactly one request ever gets MAX_MISSES.
   *
   * With guessable, the code first takes a guessable slot, then one of the
   * usual ones. Returns 0 when either is full (blocked already), MAX_MISSES
   * when it took the last usual slot (everything is now blocked), otherwise
   * its guessable number, 1..GUESSABLE_MAX_MISSES.
   */
  async function recordMiss(locks, record, epoch, { guessable = false } = {}) {
    const s = subject(record);
    if (guessable) {
      const own = slotNumber(
        await takeFirstFree(locks, missPrefix(s, epoch, true), GUESSABLE_MAX_MISSES),
      );
      if (!own) return 0;
      const shared = slotNumber(await takeFirstFree(locks, missPrefix(s, epoch), MAX_MISSES));
      if (!shared) return 0;
      return shared === MAX_MISSES ? MAX_MISSES : own;
    }
    return slotNumber(await takeFirstFree(locks, missPrefix(s, epoch), MAX_MISSES));
  }

  /**
   * Whether codes are blocked until the access is reset. A guessable link is
   * blocked by its own share or by the usual count; any other only by the usual.
   */
  async function sendsBlocked(locks, record, epoch, { guessable = false } = {}) {
    const s = subject(record);
    if (await locks.has(`${missPrefix(s, epoch)}:${MAX_MISSES}`)) return true;
    return guessable && locks.has(`${missPrefix(s, epoch, true)}:${GUESSABLE_MAX_MISSES}`);
  }

  // Link codes: the one-time "#k=" part of a link the admin emails, which
  // signs the browser in without a typed code. "<nonce>.<minted, base36 ms>.<hmac>",
  // where the HMAC covers the link (linkId), id, revision, access epoch and
  // email tag. A code works only with the link it was emailed with, and a
  // revision bump, a reset or a changed client email void every code minted
  // before. Nothing is stored until it is claimed (<rows>:lk:<nonce>).
  const LINK_CODE_RE = /^([\w-]{22})\.([0-9a-z]{1,12})\.([\w-]{43})$/;

  function linkSig(secret, s, epoch, nonce, minted) {
    return hmac(
      secret,
      `${label}-link:`,
      `${s.linkId}:${s.id}:${s.revision}:${epoch}:${mailTag(secret, s)}:${nonce}:${minted}`,
    ).toString("base64url");
  }

  /**
   * A fresh single-use link code for this record's current link, revision and
   * epoch. Mint after the link is written (linkId is the new one) and, after a
   * reset, with the epoch bumpEpoch returned.
   */
  function mintLinkCode(secret, record, epoch, nowMs) {
    const nonce = crypto.randomBytes(16).toString("base64url");
    const minted = nowMs.toString(36);
    return `${nonce}.${minted}.${linkSig(secret, subject(record), epoch, nonce, minted)}`;
  }

  /**
   * Checks a link code against the record the link found and its current
   * epoch. Returns { ok: true, nonce, epoch } or { ok: false, reason } with
   * reason "invalid" (shape, signature, another record, revision, epoch or
   * email) or "expired". It doesn't mark the code used; claimLinkCode does.
   */
  async function checkLinkCode({ secret, locks, record, linkCode, nowMs }) {
    const m = typeof linkCode === "string" ? LINK_CODE_RE.exec(linkCode) : null;
    if (!m) return { ok: false, reason: "invalid" };
    const [, nonce, minted, sig] = m;
    const s = subject(record);
    const epoch = await epochOf(locks, s);
    const expected = Buffer.from(linkSig(secret, s, epoch, nonce, minted));
    if (!equalBytes(Buffer.from(sig), expected)) return { ok: false, reason: "invalid" };
    const mintedMs = parseInt(minted, 36);
    if (!(mintedMs - CLOCK_SKEW_MS <= nowMs && nowMs < mintedMs + LINK_CODE_TTL_MS))
      return { ok: false, reason: "expired" };
    return { ok: true, nonce, epoch };
  }

  /** Marks a link code used. False if it was claimed before. */
  function claimLinkCode(locks, nonce) {
    return locks.take(`${rows}:lk:${nonce}`);
  }

  const SHORT_LIVED = [`${rows}:send:`, `${rows}:try:`, `${rows}:used:`];

  // For pruneAcrossSchemes: decides, row by row, whether one of this scheme's
  // rows is past its retention. Scope records are loaded once per run.
  function pruneRule({ locks, getScope, nowMs }) {
    if (!prunes)
      throw new Error(
        `${logTag}: this scheme doesn't own the "${rows}:" rows; prune them through the scheme that does`,
      );
    const scopes = new Map();
    const superseded = async ({ scopeId, rev, epoch }) => {
      if (!scopes.has(scopeId)) scopes.set(scopeId, await getScope(scopeId));
      const record = scopes.get(scopeId);
      if (!record) return true;
      const s = subject(record);
      if (s.revision !== rev) return true;
      return (await epochOf(locks, s)) > epoch;
    };
    return async function shouldDrop({ key, createdAt }) {
      const ageMs = nowMs - Date.parse(createdAt);
      if (SHORT_LIVED.some((prefix) => key.startsWith(prefix))) return true;
      if (key.startsWith(`${rows}:lk:`)) return ageMs >= LINK_RETENTION_MS;
      if (key.startsWith(`${rows}:miss:`) || key.startsWith(`${rows}:umiss:`)) {
        const miss = parseMissKey(key);
        return miss !== null && (await superseded(miss));
      }
      return false;
    };
  }

  /**
   * Deletes this scheme's lock rows past their retention: pruneAcrossSchemes
   * with this scheme alone. getScope is as described there.
   */
  function pruneAccessLocks({ locks, getScope, nowMs }) {
    return pruneAcrossSchemes({ locks, nowMs, owners: [{ access, getScope }] });
  }

  /** Per record id, not per link, so a fresh link to the same record keeps the unlock. */
  const sessionCookieName = (id) =>
    `__Secure-oc_${cookie}_${sha256Hex(`${label}-name:${id}`).slice(0, 16)}`;

  /**
   * The Set-Cookie header for a fresh unlock. The __Secure- prefix makes
   * browsers refuse it without Secure, so a plain-http page can't plant one.
   * Path=/api, because a cookie path only matches at a "/" boundary:
   * "/api/quote-" would never reach /api/quote-view. Not sliding: it is never
   * re-issued on later visits.
   */
  function sessionCookie(secret, record, epoch, nowMs) {
    const s = subject(record);
    const value = sign(secret, `${label}-sess:`, {
      q: s.id,
      r: s.revision,
      e: epoch,
      m: mailTag(secret, s),
      x: nowMs + SESSION_TTL_MS,
    });
    const maxAge = SESSION_TTL_MS / 1000;
    return `${sessionCookieName(s.id)}=${value}; Max-Age=${maxAge}; Path=/api; HttpOnly; Secure; SameSite=Strict`;
  }

  /** Whether the request carries a live unlock for this record's revision, epoch and client email. */
  async function hasAccess({ secret, locks, req, record, nowMs }) {
    const s = subject(record);
    const p = unsign(secret, `${label}-sess:`, readCookie(req, sessionCookieName(s.id)));
    if (!p || !isCount(p.e) || typeof p.x !== "number" || p.x <= nowMs) return false;
    if (p.q !== s.id || p.r !== s.revision) return false;
    if (p.m !== mailTag(secret, s)) return false;
    return isEpochCurrent(locks, s, p.e);
  }

  /**
   * The gate on the client endpoints that show or change a record. Returns
   * how the request got in: "off" (kill switch), "session" or "admin".
   * Otherwise throws 401 { locked: true }, which carries nothing from the
   * record. isAdmin, when given, runs only without a session, so a client's
   * request never waits on the admin check.
   */
  async function requireAccess({ env, logError, locks, req, record, nowMs, isAdmin }) {
    if (!gateEnabled(env, logError)) return "off";
    const secret = accessSecret(env, logError);
    if (await hasAccess({ secret, locks, req, record, nowMs })) return "session";
    if (isAdmin && (await isAdmin())) return "admin";
    throw new HttpError(401, locked, { locked: true });
  }

  const access = {
    scheme: Object.freeze({ ...scheme, prunes }),
    subject,
    gateEnabled,
    accessSecret,
    currentEpoch,
    bumpEpoch,
    codeFor,
    issueChallenge,
    checkChallenge,
    codeMatches,
    takeTry,
    takeUse,
    takeSendSlots,
    recordMiss,
    sendsBlocked,
    sessionCookieName,
    sessionCookie,
    hasAccess,
    mintLinkCode,
    checkLinkCode,
    claimLinkCode,
    pruneAccessLocks,
    requireAccess,
  };
  pruneRules.set(access, pruneRule);
  return access;
}

/**
 * Deletes lock rows past their retention for several schemes in one listing
 * pass, handing each row to the scheme whose rows prefix it carries. Run once
 * a day from the maintenance cron. owners is [{ access, getScope }], one per
 * scheme that owns its rows (prunes); a scheme that only shares another's
 * rows throws before any row is listed.
 *
 * getScope(scopeId) loads the record a miss row counts against, or null when
 * it is gone, and must return a record of that scheme's own shape: subject()
 * is applied to it to read the revision and the epoch. A record of another
 * shape reads as a different revision, so live wrong-code counters would be
 * deleted and the 15-miss block reset.
 *
 * Returns { deleted, kept, skipped } over all owners: skipped counts rows no
 * owner has, which are never touched but still fill the listing, so a run
 * with a large skipped and no deleted means the listing cap is spent on rows
 * this never deletes.
 */
async function pruneAcrossSchemes({ locks, nowMs, owners }) {
  const byPrefix = new Map();
  for (const { access, getScope } of owners) {
    const rule = pruneRules.get(access);
    if (!rule)
      throw new Error("pruneAcrossSchemes: an owner's access was not made by createAccess");
    const prefix = `${access.scheme.rows}:`;
    if (byPrefix.has(prefix))
      throw new Error(`pruneAcrossSchemes: the "${prefix}" rows are listed twice`);
    byPrefix.set(prefix, rule({ locks, getScope, nowMs }));
  }
  // listBefore is strict, so +1 ms takes rows exactly one day old too.
  const listed = await locks.listBefore(new Date(nowMs - SHORT_RETENTION_MS + 1).toISOString());
  let deleted = 0;
  let kept = 0;
  let skipped = 0;
  for (const row of listed) {
    const { key } = row;
    const colon = typeof key === "string" ? key.indexOf(":") : -1;
    const shouldDrop = colon > 0 ? byPrefix.get(key.slice(0, colon + 1)) : undefined;
    if (!shouldDrop) skipped += 1;
    else if (!(await shouldDrop(row))) kept += 1;
    else if (await locks.release(key)) deleted += 1;
  }
  return { deleted, kept, skipped };
}

/**
 * The admin check for requireAccess, or null unless the page asked for it
 * (admin=1, sent only from a ?preview=admin page). requireAdmin is
 * api/shared/adminAuth.js, passed in so tests can replace it.
 */
function adminCheck(requireAdmin, context, req, flag) {
  if (flag !== "1") return null;
  return async () => {
    const auth = await requireAdmin(context, req);
    return Boolean(auth && auth.user);
  };
}

module.exports = {
  createAccess,
  pruneAcrossSchemes,
  adminCheck,
  maskEmail,
  normalEmail,
  CODE_TTL_MS,
  MAX_TRIES,
  MAX_MISSES,
  GUESSABLE_MAX_MISSES,
  LINK_CODE_TTL_MS,
};
