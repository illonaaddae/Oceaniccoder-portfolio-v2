// Newsletter sign-up from the blog.
//
//   POST /api/newsletter-signup  { email, turnstileToken }  → 200 { success: true }
//
// Adds the address to the Resend audience and sends a welcome email. Anyone can
// type anyone's address, and the welcome email shares its Resend key and quota
// with the payment emails, so nothing reaches Resend until the request passes,
// in order: SIGNUPS_PER_IP an hour per client IP (per instance), the Turnstile
// check, then SIGNUPS_PER_DAY in total (per instance). The daily cap is counted
// only after Turnstile passes, so token-less requests can't use it up.

const https = require("https");
const { shell, heading, button, buttons, small } = require("../shared/email/ui");
const { verifyTurnstile, clientIp } = require("../shared/turnstile");
const { createRateLimiter } = require("../shared/rateLimit");

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const SIGNUPS_PER_IP = 5;
const SIGNUPS_PER_DAY = 100;
const TOO_MANY = "Too many sign-ups. Please try again later.";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      {
        hostname,
        path,
        method: "POST",
        headers: { ...headers, "Content-Length": Buffer.byteLength(data) },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => resolve({ status: res.statusCode, body: raw }));
      },
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email));
}

const SUBSCRIBER_REASON =
  "You're receiving this because you subscribed at oceaniccoder.dev. No spam. Unsubscribe anytime.";

function welcomeEmailHtml() {
  return shell({
    preview: "You're subscribed. New posts will land here first.",
    reason: SUBSCRIBER_REASON,
    body:
      heading({
        eyebrow: "Newsletter",
        title: "Welcome aboard",
        intro:
          "Hey there, you're now subscribed to the OceanicCoder newsletter. You'll be the first to know when I publish new blog posts, from tutorials and project breakdowns to tips from my journey as a software and AI engineer.",
      }) +
      buttons(button({ href: "https://oceaniccoder.dev/blog", label: "Browse the blog" })) +
      small(
        "If this landed in your spam folder, please move it to your inbox so future emails reach you.",
      ),
  });
}

async function sendWelcomeEmail(httpsPost, { email, apiKey, fromEmail }) {
  const html = welcomeEmailHtml();

  await httpsPost(
    "api.resend.com",
    "/emails",
    { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    {
      from: `Illona @ OceanicCoder <${fromEmail}>`,
      to: [email],
      subject: "You're subscribed to OceanicCoder 🎉",
      html,
    },
  );
}

function reply(context, status, body) {
  context.res = { status, headers: CORS, body: JSON.stringify(body) };
}

function createHandler({ verifyTurnstile, httpsPost, now = Date.now }) {
  const allowIp = createRateLimiter({ limit: SIGNUPS_PER_IP, windowMs: HOUR_MS });
  const allowDay = createRateLimiter({ limit: SIGNUPS_PER_DAY, windowMs: DAY_MS, maxKeys: 1 });

  return async function (context, req) {
    if (req.method === "OPTIONS") {
      context.res = { status: 204, headers: CORS, body: "" };
      return;
    }

    const { email, turnstileToken } = req.body || {};

    if (!email || !isValidEmail(email)) {
      reply(context, 400, { error: "Valid email required" });
      return;
    }

    const apiKey = process.env.RESEND_API_KEY;
    const audienceId = process.env.RESEND_AUDIENCE_ID;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "newsletter@send.oceaniccoder.dev";

    if (!apiKey || !audienceId) {
      context.log.warn("RESEND_API_KEY or RESEND_AUDIENCE_ID not set");
      reply(context, 503, { error: "Newsletter not configured" });
      return;
    }

    // Requests without a forwarded IP share one bucket rather than going unlimited.
    const ip = clientIp(req);
    if (!allowIp(ip || "unknown", 1, now())) {
      reply(context, 429, { error: TOO_MANY });
      return;
    }

    const spam = await verifyTurnstile(turnstileToken, ip);
    if (!spam.ok) {
      reply(context, spam.status, { error: spam.error });
      return;
    }

    if (!allowDay("all", 1, now())) {
      context.log.warn(`newsletter-signup: daily cap of ${SIGNUPS_PER_DAY} reached`);
      reply(context, 429, { error: TOO_MANY });
      return;
    }

    try {
      const result = await httpsPost(
        "api.resend.com",
        `/audiences/${audienceId}/contacts`,
        { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        { email, unsubscribed: false },
      );

      if (result.status === 200 || result.status === 201) {
        sendWelcomeEmail(httpsPost, { email, apiKey, fromEmail }).catch((err) =>
          context.log.warn("Welcome email failed:", err.message),
        );
        reply(context, 200, { success: true });
      } else if (result.status === 409) {
        // Already subscribed — treat as success so UX is clean
        reply(context, 200, { success: true });
      } else {
        context.log.error("Resend contacts API error:", result.status, result.body);
        reply(context, 502, { error: "Failed to subscribe. Please try again." });
      }
    } catch (err) {
      context.log.error("Newsletter signup error:", err.message);
      reply(context, 500, { error: "Internal error" });
    }
  };
}

module.exports = createHandler({ verifyTurnstile, httpsPost });
module.exports.createHandler = createHandler;

// Exported for tests; the Azure runtime only uses the default export above.
module.exports.welcomeEmailHtml = welcomeEmailHtml;
