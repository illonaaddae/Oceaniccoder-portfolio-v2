const https = require("https");
const { requireAdmin } = require("../shared/adminAuth");
const { shell, heading, p, small, lines } = require("../shared/email/ui");

const CORS = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://oceaniccoder.dev",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  Vary: "Origin",
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
        res.on("data", (c) => {
          raw += c;
        });
        res.on("end", () => resolve({ status: res.statusCode, body: raw }));
      },
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

const REASON = "OceanicCoder · Web and app development";
const REPLY_LINE = "Reply to this email to continue the conversation.";

// Returns { html, text } for an admin reply. Inputs are raw; the email kit
// escapes them and keeps the admin's line breaks.
function buildReplyEmail({ subject, message, recipientName }) {
  const greeting = recipientName ? `Hi ${recipientName},` : "Hi,";
  const body = String(message).replace(/\r\n?/g, "\n");
  const html = shell({
    preview: body.slice(0, 120),
    reason: REASON,
    body:
      heading({ eyebrow: "Message from OceanicCoder", title: subject }) +
      p(greeting) +
      p(body) +
      small(REPLY_LINE),
  });
  const text = lines(greeting, body);
  return { html, text };
}

async function handler(context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: CORS, body: "" };
    return;
  }

  // Sends email from our domain to an address in the request, so only the
  // signed-in admin (the dashboard) may call it.
  const auth = await requireAdmin(context, req);
  if (!auth.user) {
    context.res = {
      status: auth.status,
      headers: CORS,
      body: JSON.stringify({ error: auth.error }),
    };
    return;
  }

  const { to, subject, message, recipientName } = req.body || {};

  if (!to || !subject || !message) {
    context.res = {
      status: 400,
      headers: CORS,
      body: JSON.stringify({ error: "to, subject and message are required" }),
    };
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "invoices@send.oceaniccoder.dev";

  if (!apiKey) {
    context.res = { status: 503, headers: CORS, body: JSON.stringify({ error: "Not configured" }) };
    return;
  }

  const email = buildReplyEmail({ subject, message, recipientName });

  try {
    const result = await httpsPost(
      "api.resend.com",
      "/emails",
      { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      {
        from: `Illona @ OceanicCoder <${fromEmail}>`,
        to: [to],
        reply_to: "hello@oceaniccoder.dev",
        subject,
        html: email.html,
        text: email.text,
      },
    );

    if (result.status === 200 || result.status === 201) {
      context.res = { status: 200, headers: CORS, body: JSON.stringify({ success: true }) };
    } else {
      context.log.error("Resend reply email error:", result.status, result.body);
      context.res = {
        status: 502,
        headers: CORS,
        body: JSON.stringify({ error: "Failed to send email" }),
      };
    }
  } catch (err) {
    context.log.error("send-message-reply error:", err.message);
    context.res = { status: 500, headers: CORS, body: JSON.stringify({ error: "Internal error" }) };
  }
}

module.exports = handler;
module.exports.buildReplyEmail = buildReplyEmail;
