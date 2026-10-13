// Cloudflare Turnstile check for visitor submissions (comments, messages,
// bookings, inquiries, testimonials). The browser gets a token from the widget;
// this confirms it with Cloudflare once. Tokens are single-use and expire after
// five minutes.
//
// Fails closed: without TURNSTILE_SECRET_KEY every submission is refused.
// Cloudflare's test secret 1x0000000000000000000000000000000AA always passes,
// for local and preview testing.

const { isIP } = require("net");

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 10000;

/** Returns { ok: true } or { ok: false, status, error }. */
async function verifyTurnstile(token, remoteip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: false, status: 500, error: "Spam protection isn't configured." };
  if (typeof token !== "string" || !token || token.length > 2048) {
    return { ok: false, status: 400, error: "Please complete the spam check and try again." };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token, ...(remoteip && { remoteip }) }),
      signal: controller.signal,
    });
    const result = await res.json();
    if (result.success) return { ok: true };
    const expired = (result["error-codes"] || []).includes("timeout-or-duplicate");
    return {
      ok: false,
      status: 403,
      error: expired
        ? "The spam check expired. Please try again."
        : "The spam check failed. Please try again.",
    };
  } catch {
    return { ok: false, status: 503, error: "Couldn't reach the spam check. Please try again." };
  } finally {
    clearTimeout(timer);
  }
}

// One X-Forwarded-For entry → a bare address: strips a port from IPv4
// ("1.2.3.4:5678") and bracketed IPv6 ("[2001:db8::1]:443"), and unwraps an
// IPv4-mapped IPv6 address ("::ffff:1.2.3.4" → "1.2.3.4") so one client has
// one rate-limit key. A bare IPv6 address contains colons, so it's kept whole.
function normaliseIp(entry) {
  return entry
    .trim()
    .replace(/^(\d+\.\d+\.\d+\.\d+):\d+$/, "$1")
    .replace(/^\[([0-9a-fA-F:.]+)\](?::\d+)?$/, "$1")
    .replace(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i, "$1");
}

// Addresses that can't be a visitor on the public internet: unspecified,
// private, CGNAT (100.64.0.0/10), loopback and link-local IPv4; loopback,
// unspecified, unique-local (fc00::/7) and link-local (fe80::/10) IPv6.
const PRIVATE_IP =
  /^(?:0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|::1?$|f[cd][0-9a-f]{2}:|fe[89ab][0-9a-f]:)/i;

/**
 * The visitor's IP as Static Web Apps saw it: the right-most public
 * X-Forwarded-For entry. Observed on a real SWA preview, a Function receives
 *
 *   x-forwarded-for: <whatever the client sent...>, 203.0.113.7:51234, [fd00::78df:1]:443
 *
 * SWA appends the real client (IPv4 with a port) and then its own internal
 * unique-local hop. Everything to the left is client-supplied and can be
 * forged on every request, so the left-most entry is never trusted. Of the
 * other headers, `client-ip` holds the internal hop and `x-real-ip` is passed
 * through from the client, so neither is used. Private hops and entries that
 * aren't IP addresses ("unknown") are skipped. Used by /api/visit (rate
 * limit, visitor hash), /api/submit (Turnstile's `remoteip`) and
 * /api/quote-respond (hashed acceptance record).
 */
function clientIp(req) {
  const header = (req.headers && req.headers["x-forwarded-for"]) || "";
  const entries = header
    .split(",")
    .map(normaliseIp)
    .filter((entry) => isIP(entry) !== 0);
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    if (!PRIVATE_IP.test(entries[i])) return entries[i];
  }
  return entries[entries.length - 1];
}

module.exports = { verifyTurnstile, clientIp };
