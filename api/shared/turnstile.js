// Cloudflare Turnstile check for visitor submissions (comments, messages,
// bookings, inquiries, testimonials). The browser gets a token from the widget;
// this confirms it with Cloudflare once. Tokens are single-use and expire after
// five minutes.
//
// Fails closed: without TURNSTILE_SECRET_KEY every submission is refused.
// Cloudflare's test secret 1x0000000000000000000000000000000AA always passes,
// for local and preview testing.

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

function forwardedFor(req) {
  const header = (req.headers && req.headers["x-forwarded-for"]) || "";
  return header.split(",").map((entry) => entry.trim());
}

// Strip a port from IPv4 ("1.2.3.4:5678") and from bracketed IPv6
// ("[2001:db8::1]:443"); a bare IPv6 address contains colons, so it's kept whole.
function stripPort(entry) {
  return entry
    .replace(/^(\d+\.\d+\.\d+\.\d+):\d+$/, "$1")
    .replace(/^\[([0-9a-fA-F:.]+)\](?::\d+)?$/, "$1");
}

/**
 * The visitor's IP from Static Web Apps' forwarding header, if present: the
 * left-most entry. A client can put anything there, so this is only a hint
 * (Turnstile's optional `remoteip`); never use it to rate-limit.
 */
function clientIp(req) {
  const [first] = forwardedFor(req);
  return (first && stripPort(first)) || undefined;
}

const PRIVATE_IP =
  /^(?:10\.|127\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|::1$|f[cd][0-9a-f]{2}:|fe80:)/i;

/**
 * The IP the platform saw the request come from, for rate limiting: the
 * right-most public X-Forwarded-For entry. Proxies append to the header, so
 * entries to the left of the platform's own are whatever the client sent and
 * can be forged per request. Private and loopback entries are skipped in
 * case an internal hop appends its own address after the client's. Static
 * Web Apps documents no dedicated client-IP header, so this is the best
 * signal available.
 */
function platformClientIp(req) {
  const entries = forwardedFor(req).filter(Boolean).map(stripPort);
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    if (!PRIVATE_IP.test(entries[i])) return entries[i];
  }
  return entries[entries.length - 1];
}

module.exports = { verifyTurnstile, clientIp, platformClientIp };
