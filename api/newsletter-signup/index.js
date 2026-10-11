const https = require("https");
const { shell, heading, button, buttons, small } = require("../shared/email/ui");

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

async function sendWelcomeEmail(context, { email, apiKey, fromEmail }) {
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

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: CORS, body: "" };
    return;
  }

  const { email } = req.body || {};

  if (!email || !isValidEmail(email)) {
    context.res = {
      status: 400,
      headers: CORS,
      body: JSON.stringify({ error: "Valid email required" }),
    };
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "newsletter@send.oceaniccoder.dev";

  if (!apiKey || !audienceId) {
    context.log.warn("RESEND_API_KEY or RESEND_AUDIENCE_ID not set");
    context.res = {
      status: 503,
      headers: CORS,
      body: JSON.stringify({ error: "Newsletter not configured" }),
    };
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
      sendWelcomeEmail(context, { email, apiKey, fromEmail }).catch((err) =>
        context.log.warn("Welcome email failed:", err.message),
      );
      context.res = {
        status: 200,
        headers: CORS,
        body: JSON.stringify({ success: true }),
      };
    } else if (result.status === 409) {
      // Already subscribed — treat as success so UX is clean
      context.res = {
        status: 200,
        headers: CORS,
        body: JSON.stringify({ success: true }),
      };
    } else {
      context.log.error("Resend contacts API error:", result.status, result.body);
      context.res = {
        status: 502,
        headers: CORS,
        body: JSON.stringify({ error: "Failed to subscribe. Please try again." }),
      };
    }
  } catch (err) {
    context.log.error("Newsletter signup error:", err.message);
    context.res = {
      status: 500,
      headers: CORS,
      body: JSON.stringify({ error: "Internal error" }),
    };
  }
};

// Exported for tests; the Azure runtime only uses the default export above.
module.exports.welcomeEmailHtml = welcomeEmailHtml;
