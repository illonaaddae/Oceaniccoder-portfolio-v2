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

/** The visitor's IP from Static Web Apps' forwarding header, if present. */
function clientIp(req) {
  const forwarded = (req.headers && req.headers["x-forwarded-for"]) || "";
  // Strip a port only from IPv4 ("1.2.3.4:5678"); IPv6 addresses contain colons.
  return (
    forwarded
      .split(",")[0]
      .trim()
      .replace(/^(\d+\.\d+\.\d+\.\d+):\d+$/, "$1") || undefined
  );
}

module.exports = { verifyTurnstile, clientIp };
