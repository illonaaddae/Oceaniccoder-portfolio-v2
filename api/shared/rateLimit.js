// In-memory, per-instance rate limiting. Used by /api/visit (page views) and
// /api/quote-access (code sends, code entries and link claims).

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

module.exports = { createRateLimiter };
