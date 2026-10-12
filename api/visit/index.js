// POST /api/visit — first-party page views and a few interaction events, sent
// by the site's tracker (src/utils/analytics/tracker.ts) with sendBeacon.
// Named neutrally so generic ad-block rules (/track, /analytics, /collect)
// don't catch it; DNT and GPC are the consent signal and are honoured.
//
// Write-only and anonymous. It answers 204 whatever happens (413 for an
// oversized body, 405 for other methods), so it never tells a sender why a
// request was dropped. Drops: DNT/GPC headers, cross-site fetches, an Origin
// not on ANALYTICS_ALLOWED_HOSTS, bot UAs, payloads that break the contract,
// and more than 60 events a minute from one visitor on one instance.
//
// Stored per event, in the `analytics` container (partition /day): a daily
// visitor hash, coarse device/browser/OS labels, and a country guessed from
// the time zone. Never the IP, the UA string or a cookie. Raw events expire
// after ANALYTICS_RAW_TTL_DAYS (default 90) through the item's `ttl`.

const { getDatabase, newId } = require("../shared/cosmos");
const { clientIp } = require("../shared/turnstile");
const {
  MAX_BODY_BYTES,
  allowedHosts,
  allowedOrigin,
  headerDropReason,
  validatePayload,
} = require("../shared/analytics/validate");
const { isBot, parseUserAgent } = require("../shared/analytics/ua");
const { tzCountry } = require("../shared/analytics/tzCountry");
const { createSaltStore, visitorHash } = require("../shared/analytics/visitor");

const DAY_SECONDS = 24 * 60 * 60;
const DEFAULT_RAW_TTL_DAYS = 90;
const RATE_LIMIT = 60; // events per visitor per minute, per instance
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_KEYS = 5000;
const DROP_LOG_SAMPLE = 0.01;

/** Seconds a raw event lives. ANALYTICS_RAW_TTL_DAYS when it's a sane integer. */
function rawTtlSeconds(env) {
  const days = Number(env.ANALYTICS_RAW_TTL_DAYS);
  const valid = Number.isInteger(days) && days >= 1 && days <= 3650;
  return (valid ? days : DEFAULT_RAW_TTL_DAYS) * DAY_SECONDS;
}

/** Fixed-window counter per visitor hash. In memory, so per instance only. */
function createRateLimiter() {
  const windows = new Map();
  return function allow(key, count, nowMs) {
    let w = windows.get(key);
    if (!w || nowMs - w.start >= RATE_WINDOW_MS) {
      if (windows.size >= RATE_MAX_KEYS) windows.clear();
      w = { start: nowMs, count: 0 };
      windows.set(key, w);
    }
    w.count += count;
    return w.count <= RATE_LIMIT;
  };
}

function rawBodyOf(req) {
  if (typeof req.rawBody === "string") return req.rawBody;
  if (typeof req.body === "string") return req.body;
  return JSON.stringify(req.body ?? "");
}

function parsedBodyOf(req) {
  if (typeof req.body !== "string") return req.body;
  try {
    return JSON.parse(req.body);
  } catch {
    return null;
  }
}

function toDocument(event, base) {
  const { day, ts, sid, vh, ttl, dev, br, os, cc, lang } = base;
  const common = { id: newId(), type: event.type, day, ts, sid };
  if (event.type === "leave") return { ...common, path: event.path, ms: event.ms, ttl };
  if (event.type === "ev") {
    return { ...common, vh, name: event.name, prop: event.prop, path: event.path, ttl };
  }
  const { type: _type, ...view } = event;
  return { ...common, vh, ...view, dev, br, os, cc, lang, ttl };
}

function createHandler(deps) {
  const env = deps.env || process.env;
  const now = deps.now || (() => new Date());
  const random = deps.random || Math.random;
  const allowRate = createRateLimiter();
  let getSalt;

  return async function (context, req) {
    const respond = (status) => {
      context.res = { status, headers: { "Cache-Control": "no-store" }, body: "" };
    };
    const drop = (reason) => {
      if (random() < DROP_LOG_SAMPLE) context.log(`visit dropped: ${reason}`);
      respond(204);
    };

    if (req.method !== "POST") return respond(405);
    if (Buffer.byteLength(rawBodyOf(req), "utf8") > MAX_BODY_BYTES) return respond(413);

    const headers = req.headers || {};
    const headerReason = headerDropReason(headers, env);
    if (headerReason) return drop(headerReason);
    const host = allowedOrigin(headers, allowedHosts(env));
    if (!host) return drop("origin");
    const ua = headers["user-agent"];
    if (isBot(ua)) return drop("bot");
    const payload = validatePayload(parsedBodyOf(req));
    if (!payload) return drop("invalid");

    try {
      const container = deps.container();
      getSalt ??= createSaltStore(container);
      const at = now();
      const ts = at.toISOString();
      const day = ts.slice(0, 10);
      const vh = visitorHash(await getSalt(day), { ip: clientIp(req), ua, host });
      if (!allowRate(vh, payload.events.length, at.getTime())) return drop("rate");

      const base = {
        day,
        ts,
        sid: payload.sid,
        vh,
        ttl: rawTtlSeconds(env),
        ...parseUserAgent(ua),
        cc: tzCountry(payload.tz),
        lang: payload.lang,
      };
      await Promise.all(
        payload.events.map((event) => container.items.create(toDocument(event, base))),
      );
    } catch (err) {
      // A lost page view is acceptable; an error page for the visitor is not.
      context.log.error(`visit: ${err && (err.stack || err.message)}`);
    }
    return respond(204);
  };
}

module.exports = createHandler({ container: () => getDatabase().container("analytics") });
module.exports.createHandler = createHandler;
