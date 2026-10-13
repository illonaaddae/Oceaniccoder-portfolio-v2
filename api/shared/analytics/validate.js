// Checks for POST /api/visit: where the request came from, and the shape of
// the page-view payload. Everything is a whitelist. A payload that breaks any
// rule is dropped whole (validatePayload returns null); the endpoint still
// answers 204, so a bad sender learns nothing.
//
// The browser already normalises paths and skips excluded routes
// (src/utils/analytics/routes.ts). They are checked again here so a client
// document token (/q/<token>, /pay/<invoice>, /receipt/<ref>) can never be
// stored, whoever sends it, and a path must fit one of the site's public route
// templates, so arbitrary strings can't be planted in the stats.

const MAX_BODY_BYTES = 4 * 1024;
// The tracker sends one event per request; a little headroom, no more.
const MAX_EVENTS = 5;
const MAX_MS = 30 * 60 * 1000;

const DEFAULT_HOSTS = ["oceaniccoder.dev", "www.oceaniccoder.dev"];
const LOCAL_HOSTS = ["localhost", "127.0.0.1"];

const SID = /^s_[A-Za-z0-9_-]{16,32}$/;
const LANG = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/;
const PATH = /^\/[a-z0-9/_-]*$/;
const NOT_FOUND_PATH = "/(404)";
const HOST = /^(?=.{1,100}$)[a-z0-9-]+(\.[a-z0-9-]+)+$/;
const SLUG = /^[a-z0-9_-]{1,40}$/;
// UTM tags are campaign labels, not free text. The narrow alphabet and the
// digit-run ban keep emails, phone numbers and ids out of the stats.
const UTM_VALUE = /^[a-z0-9._+-]{1,100}$/;
const LONG_DIGIT_RUN = /\d{6,}/;

const CHANNELS = new Set(["direct", "search", "social", "email", "paid", "referral"]);
const UTM_KEYS = ["source", "medium", "campaign"];
const FORM_TYPES = new Set([
  "contact",
  "booking",
  "inquiry",
  "newsletter",
  "testimonial",
  "comment",
]);

// The public pages in src/routes/publicRoutes.tsx, minus client documents and
// the catch-all. Must equal TRACKED_ROUTES in src/utils/analytics/routes.ts;
// src/utils/analytics/analytics.test.ts fails if they drift apart.
const TRACKED_ROUTES = [
  "/",
  "/about",
  "/skills",
  "/projects",
  "/projects/:slug",
  "/services",
  "/blog",
  "/blog/:slug",
  "/contact",
  "/booking",
  "/inquiry",
];
const SPLIT_ROUTES = TRACKED_ROUTES.map((route) => route.split("/"));

// Event name → check for its prop. `null` means the event takes no prop.
const EVENTS = {
  form_submit: (prop) => FORM_TYPES.has(prop),
  cta_click: (prop) => typeof prop === "string" && SLUG.test(prop),
  outbound: (prop) => typeof prop === "string" && HOST.test(prop),
  resume_download: null,
  chat_open: null,
};

// ── request ───────────────────────────────────────────────────────────────

/** Hosts allowed to send page views. Localhost only off production. */
function allowedHosts(env = process.env) {
  const configured = String(env.ANALYTICS_ALLOWED_HOSTS || "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  const hosts = configured.length ? configured : DEFAULT_HOSTS;
  return new Set(isLocal(env) ? [...hosts, ...LOCAL_HOSTS] : hosts);
}

/** Functions Core Tools sets Development; Azure leaves it unset or Production. */
function isLocal(env = process.env) {
  return env.AZURE_FUNCTIONS_ENVIRONMENT === "Development";
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * The sending site's hostname when it is on the allow-list, else null. Uses
 * Origin, falling back to Referer; a request with neither is refused.
 */
function allowedOrigin(headers, hosts) {
  const host = hostnameOf(headers.origin) || hostnameOf(headers.referer);
  return host && hosts.has(host) ? host : null;
}

/** Reason to drop the request from its headers alone, or null. */
function headerDropReason(headers, env = process.env) {
  if (headers.dnt === "1" || headers["sec-gpc"] === "1") return "dnt";
  const site = headers["sec-fetch-site"];
  // Local dev serves the app and the Functions on different ports: same-site.
  const sites = isLocal(env) ? ["same-origin", "same-site"] : ["same-origin"];
  if (site && !sites.includes(site)) return "cross-site";
  return null;
}

// ── payload ───────────────────────────────────────────────────────────────

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const hasOnly = (obj, keys) => Object.keys(obj).every((k) => keys.includes(k));
const isMs = (v) => Number.isInteger(v) && v >= 0 && v <= MAX_MS;
const isOptional = (v, check) => v === undefined || v === null || check(v);

/** First path segment, used for the route exclusions. */
function firstSegment(path) {
  return path.split("/")[1] || "";
}

/**
 * Admin pages and client documents are never counted. Client document URLs
 * carry bearer tokens, so even their templates are left out.
 */
function isExcludedPath(path) {
  const first = firstSegment(path);
  return (
    first.startsWith("admin") ||
    first.startsWith("dashboard") ||
    first === "q" ||
    first === "pay" ||
    first === "receipt"
  );
}

/** True when the path fits a public route template (":slug" = one segment). */
function matchesTrackedRoute(path) {
  if (path === "/") return true;
  const parts = path.split("/");
  if (parts.slice(1).some((part) => part === "")) return false;
  return SPLIT_ROUTES.some(
    (route) =>
      route.length === parts.length &&
      route.every((seg, i) => seg.startsWith(":") || seg === parts[i]),
  );
}

function checkPath(path) {
  if (path === NOT_FOUND_PATH) return true;
  return (
    typeof path === "string" &&
    path.length <= 150 &&
    PATH.test(path) &&
    !isExcludedPath(path) &&
    matchesTrackedRoute(path)
  );
}

const isUtmValue = (v) => typeof v === "string" && UTM_VALUE.test(v) && !LONG_DIGIT_RUN.test(v);

/** Validated UTM object in the stored short-key shape, or false when invalid. */
function checkUtm(utm) {
  if (utm === undefined || utm === null) return null;
  if (!isPlainObject(utm) || !hasOnly(utm, UTM_KEYS)) return false;
  for (const key of UTM_KEYS) {
    if (!isOptional(utm[key], isUtmValue)) return false;
  }
  const { source, medium, campaign } = utm;
  return { s: source ?? null, m: medium ?? null, c: campaign ?? null };
}

function checkPageView(e) {
  if (!hasOnly(e, ["t", "path", "entry", "ref", "utm", "ch", "prevMs"])) return null;
  if (!checkPath(e.path)) return null;
  if (!isOptional(e.entry, (v) => typeof v === "boolean")) return null;
  if (!isOptional(e.prevMs, isMs)) return null;
  if (!isOptional(e.ref, (v) => typeof v === "string" && HOST.test(v))) return null;
  if (!isOptional(e.ch, (v) => CHANNELS.has(v))) return null;
  const utm = checkUtm(e.utm);
  if (utm === false) return null;

  const entry = e.entry === true;
  const out = { type: "pv", path: e.path, entry };
  // Source fields describe how the session started, so only its first view keeps them.
  if (entry) {
    out.ref = e.ref ?? null;
    out.ch = e.ch ?? "direct";
    out.utm = utm;
  }
  if (e.prevMs !== undefined && e.prevMs !== null) out.prevMs = e.prevMs;
  return out;
}

function checkEvent(e) {
  if (!hasOnly(e, ["t", "name", "prop", "path"])) return null;
  if (!checkPath(e.path)) return null;
  if (!Object.prototype.hasOwnProperty.call(EVENTS, e.name)) return null;
  const propCheck = EVENTS[e.name];
  if (propCheck === null) {
    if (e.prop !== undefined && e.prop !== null) return null;
    return { type: "ev", name: e.name, prop: null, path: e.path };
  }
  if (!propCheck(e.prop)) return null;
  return { type: "ev", name: e.name, prop: e.prop, path: e.path };
}

function checkLeave(e) {
  if (!hasOnly(e, ["t", "path", "ms"])) return null;
  if (!checkPath(e.path) || !isMs(e.ms)) return null;
  return { type: "leave", path: e.path, ms: e.ms };
}

const EVENT_CHECKS = { pv: checkPageView, ev: checkEvent, leave: checkLeave };

/**
 * The cleaned payload `{ sid, tz, lang, events }`, or null when any part of
 * it breaks the contract.
 */
function validatePayload(body) {
  if (!isPlainObject(body) || !hasOnly(body, ["v", "sid", "tz", "lang", "events"])) return null;
  if (body.v !== 1) return null;
  if (typeof body.sid !== "string" || !SID.test(body.sid)) return null;
  if (!isOptional(body.tz, (v) => typeof v === "string" && v.length <= 64)) return null;
  if (!isOptional(body.lang, (v) => typeof v === "string" && LANG.test(v))) return null;
  const { events } = body;
  if (!Array.isArray(events) || events.length === 0 || events.length > MAX_EVENTS) return null;

  const cleaned = [];
  for (const e of events) {
    if (!isPlainObject(e) || !Object.prototype.hasOwnProperty.call(EVENT_CHECKS, e.t)) return null;
    const event = EVENT_CHECKS[e.t](e);
    if (!event) return null;
    cleaned.push(event);
  }
  return {
    sid: body.sid,
    tz: body.tz || null,
    // Only the primary language subtag is kept ("en-GB" → "en").
    lang: body.lang ? body.lang.split("-")[0] : null,
    events: cleaned,
  };
}

module.exports = {
  MAX_BODY_BYTES,
  TRACKED_ROUTES,
  allowedHosts,
  allowedOrigin,
  headerDropReason,
  isExcludedPath,
  validatePayload,
};
