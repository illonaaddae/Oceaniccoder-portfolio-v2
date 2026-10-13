// POST /api/visit — first-party page views and a few interaction events, sent
// by the site's tracker (src/utils/analytics/tracker.ts) with sendBeacon.
// Named neutrally so generic ad-block rules (/track, /analytics, /collect)
// don't catch it; DNT and GPC are the consent signal and are honoured.
//
// Write-only and anonymous. It answers 204 whatever happens (413 for an
// oversized body, 405 for other methods), so it never tells a sender why a
// request was dropped. Drops: DNT/GPC headers, cross-site fetches, an Origin
// not on ANALYTICS_ALLOWED_HOSTS, bot UAs and payloads that break the contract.
//
// Every container shares the database's 1,000 RU/s, so a flood here must not
// be able to starve the rest of the site. Writes are capped three ways, in
// this order:
//   1. 60 events a minute per client IP, per instance. The IP is the one the
//      platform appended to X-Forwarded-For (platformClientIp), not the
//      left-most entry a client can forge per request;
//   2. 300 events a minute in total, per instance;
//   3. 50,000 events stored per UTC day across all instances (a counter doc,
//      see createDailyCeiling), counting only events actually written.
// The container handle never retries a 429, so throttling drops events
// instead of queueing them (getAnalyticsContainer in shared/cosmos.js).
//
// Trade-off, accepted on purpose: many sources together can still use up the
// per-instance and daily budgets and blank out real visitors' page views for
// the rest of the minute or day. Protecting the shared RU (bookings, payments,
// content) matters more than complete analytics. The per-IP cap runs first so
// one source alone can't drain the shared budgets, and each budget trip is
// logged once per window so the owner can see an attack in the logs.
//
// Stored per event, in the `analytics` container (partition /day): a daily
// visitor hash, coarse device/browser/OS labels, and a country guessed from
// the time zone. Never the IP, the UA string or a cookie. Raw events expire
// after ANALYTICS_RAW_TTL_DAYS (default 90) through the item's `ttl`.

const { getAnalyticsContainer, newId } = require("../shared/cosmos");
const { platformClientIp } = require("../shared/turnstile");
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
const MINUTE_MS = 60 * 1000;
const PER_IP_LIMIT = 60;
const INSTANCE_LIMIT = 300;
const RATE_MAX_KEYS = 5000;
const DAILY_LIMIT = 50000;
const DROP_LOG_SAMPLE = 0.01;
const MAX_ALERT_KEYS = 100;

/** Seconds a raw event lives. ANALYTICS_RAW_TTL_DAYS when it's a sane integer. */
function rawTtlSeconds(env) {
  const days = Number(env.ANALYTICS_RAW_TTL_DAYS);
  const valid = Number.isInteger(days) && days >= 1 && days <= 3650;
  return (valid ? days : DEFAULT_RAW_TTL_DAYS) * DAY_SECONDS;
}

/**
 * Fixed-window event counter per key, in memory (so per instance). When full,
 * it evicts the key whose window started first: a window that restarts is
 * moved to the end of the Map, so insertion order is window order. One noisy
 * client can push out stale keys but never reset everyone's count.
 */
function createRateLimiter({ limit, windowMs = MINUTE_MS, maxKeys = RATE_MAX_KEYS }) {
  const windows = new Map();
  return function allow(key, count, nowMs) {
    let w = windows.get(key);
    if (!w || nowMs - w.start >= windowMs) {
      windows.delete(key);
      while (windows.size >= maxKeys) windows.delete(windows.keys().next().value);
      w = { start: nowMs, count: 0 };
      windows.set(key, w);
    }
    if (w.count + count > limit) return false;
    w.count += count;
    return true;
  };
}

/**
 * Stops raw writes once `limit` events have been stored in a UTC day, across
 * all instances. The shared total lives in a `count:<day>` doc (2-day ttl).
 * Patching it on every request would double the RU cost of a page view, so
 * each instance counts what it actually wrote (`record`) and adds that with
 * one `incr` patch every `flushEvery` events or `flushMs`, learning the global
 * total from the reply. The first `check` of a day on an instance syncs before
 * answering, so a new instance starts from the real total. Overshoot is
 * bounded by the unflushed counts of the live instances.
 *
 * Both methods reject when the counter can't be reached; the caller then
 * writes anyway (the per-minute caps still hold) and the count is retried on
 * the next flush.
 */
function createDailyCeiling(
  container,
  { limit = DAILY_LIMIT, flushEvery = 100, flushMs = MINUTE_MS } = {},
) {
  let day = null;
  let synced = false;
  let known = 0;
  let pending = 0;
  let lastFlush = 0;
  let flushing = null;

  const incr = (id, forDay, delta) =>
    container.item(id, forDay).patch([{ op: "incr", path: "/n", value: delta }]);

  async function addToCounter(forDay, delta) {
    const id = `count:${forDay}`;
    try {
      return (await incr(id, forDay, delta)).resource.n;
    } catch (err) {
      if (err.code !== 404) throw err;
    }
    try {
      await container.items.create({
        id,
        type: "count",
        day: forDay,
        n: delta,
        ttl: 2 * DAY_SECONDS,
      });
      return delta;
    } catch (err) {
      if (err.code !== 409) throw err;
      return (await incr(id, forDay, delta)).resource.n;
    }
  }

  async function flush(nowMs) {
    const forDay = day;
    const delta = pending;
    pending = 0;
    lastFlush = nowMs;
    try {
      const total = await addToCounter(forDay, delta);
      if (day === forDay) known = Math.max(known, total);
    } catch (err) {
      if (day === forDay) pending += delta;
      throw err;
    }
  }

  function startFlush(nowMs) {
    flushing ??= flush(nowMs).finally(() => {
      flushing = null;
    });
    return flushing;
  }

  function startDay(forDay) {
    if (forDay === day) return;
    day = forDay;
    synced = false;
    known = 0;
    pending = 0;
    lastFlush = 0;
  }

  /** True while `count` more events still fit under today's limit. */
  async function check(forDay, count, nowMs) {
    startDay(forDay);
    if (!synced) {
      await startFlush(nowMs);
      synced = day === forDay;
    }
    return known + pending + count <= limit;
  }

  /** Adds events that were actually stored to today's count. */
  async function record(forDay, written, nowMs) {
    startDay(forDay);
    pending += written;
    if (pending >= flushEvery || nowMs - lastFlush >= flushMs) await startFlush(nowMs);
  }

  return { check, record };
}

/** Logs a message once per key (a minute, a day), so a flood can't spam the logs. */
function createAlerter() {
  const seen = new Set();
  return function alertOnce(log, key, message) {
    if (seen.has(key)) return;
    if (seen.size >= MAX_ALERT_KEYS) seen.clear();
    seen.add(key);
    log(message);
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
  const allowIp = createRateLimiter({ limit: PER_IP_LIMIT });
  const allowInstance = createRateLimiter({ limit: INSTANCE_LIMIT, maxKeys: 1 });
  const alertOnce = createAlerter();
  let getSalt;
  let ceiling;

  return async function (context, req) {
    const respond = (status) => {
      context.res = { status, headers: { "Cache-Control": "no-store" }, body: "" };
    };
    const drop = (reason) => {
      if (random() < DROP_LOG_SAMPLE) context.log(`visit dropped: ${reason}`);
      respond(204);
    };
    const warn = (message) => (context.log.warn ? context.log.warn(message) : context.log(message));
    const logError = (message, err) =>
      context.log.error(`visit: ${message}${err && (err.stack || err.message)}`);

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

    const at = now();
    const nowMs = at.getTime();
    const ts = at.toISOString();
    const day = ts.slice(0, 10);
    const count = payload.events.length;
    const ip = platformClientIp(req);

    // Per-IP first: a request over its own cap never touches the shared budgets.
    // Requests without a forwarded IP share one bucket rather than going unlimited.
    if (!allowIp(ip || "unknown", count, nowMs)) return drop("ip-rate");
    if (!allowInstance("all", count, nowMs)) {
      alertOnce(
        warn,
        `instance:${Math.floor(nowMs / MINUTE_MS)}`,
        `visit: per-instance budget of ${INSTANCE_LIMIT} events/min reached; dropping page views`,
      );
      return drop("instance-rate");
    }

    try {
      const container = deps.container();
      getSalt ??= createSaltStore(container);
      ceiling ??= createDailyCeiling(container);
      const underCap = await ceiling.check(day, count, nowMs).catch((err) => {
        logError("daily counter unavailable: ", err);
        return true;
      });
      if (!underCap) {
        alertOnce(
          warn,
          `daily:${day}`,
          `visit: daily ceiling of ${DAILY_LIMIT} events reached for ${day}; dropping page views`,
        );
        return drop("daily-cap");
      }
      const vh = visitorHash(await getSalt(day), { ip, ua, host });

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
      const results = await Promise.allSettled(
        payload.events.map((event) => container.items.create(toDocument(event, base))),
      );
      const written = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.find((r) => r.status === "rejected");
      if (written) {
        await ceiling.record(day, written, nowMs).catch((err) => {
          logError("daily counter not updated: ", err);
        });
      }
      // A lost page view is acceptable; an error page for the visitor is not.
      if (failed) logError("write failed: ", failed.reason);
    } catch (err) {
      logError("", err);
    }
    return respond(204);
  };
}

module.exports = createHandler({ container: getAnalyticsContainer });
module.exports.createHandler = createHandler;
module.exports.createRateLimiter = createRateLimiter;
module.exports.createDailyCeiling = createDailyCeiling;
