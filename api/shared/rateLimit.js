// In-memory, per-instance rate limiting. Used by /api/visit (page views),
// /api/chat and /api/quote-access (code sends, code entries and link claims).

const { isIP } = require("net");

const MINUTE_MS = 60 * 1000;
const DEFAULT_MAX_KEYS = 5000;

/**
 * Fixed-window event counter per key, in memory (so per instance). When full,
 * it evicts the key whose window started first: a window that restarts is
 * moved to the end of the Map, so insertion order is window order. One noisy
 * client can push out stale keys but never reset everyone's count.
 */
function createRateLimiter({ limit, windowMs = MINUTE_MS, maxKeys = DEFAULT_MAX_KEYS }) {
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
 * The rate-limit key for a client IP. An IPv4 address is its own key. An
 * IPv6 address is reduced to its /64 prefix: one subscriber line or cloud VM
 * usually gets a whole /64, so keying on the full address would hand out a
 * fresh allowance for every one of its 2^64 addresses.
 */
function rateLimitKey(ip) {
  if (!ip) return "unknown";
  if (isIP(ip) !== 6) return ip;
  const groupsOf = (part) => (part ? part.split(":") : []);
  // An embedded IPv4 tail ("64:ff9b::192.0.2.1") fills two 16-bit groups.
  const width = (groups) => groups.reduce((n, g) => n + (g.includes(".") ? 2 : 1), 0);
  const [head, tail] = ip.toLowerCase().split("::");
  const left = groupsOf(head);
  const right = groupsOf(tail);
  const groups =
    tail === undefined
      ? left
      : [...left, ...Array(8 - width(left) - width(right)).fill("0"), ...right];
  const prefix = groups.slice(0, 4).map((g) => (g.includes(".") ? g : g.replace(/^0+(?=.)/, "")));
  return `${prefix.join(":")}::/64`;
}

module.exports = { createRateLimiter, rateLimitKey };
