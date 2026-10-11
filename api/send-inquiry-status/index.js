const https = require("https");
const { requireAdmin } = require("../shared/adminAuth");
const { shell, heading, p, notice, small, lines } = require("../shared/email/ui");

const CORS = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://oceaniccoder.dev",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-appwrite-jwt",
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

// One entry per inquiry status that emails the client. Statuses not listed
// here are skipped by the handler.
const TEMPLATES = {
  reviewed: {
    subject: (pt) => `Your ${pt} Inquiry – I've Reviewed Your Project`,
    eyebrow: "Under review",
    tone: "info",
    title: (name) => `Thanks, ${name}!`,
    body: (pt) =>
      `I've had a good look at your ${pt} project brief and it looks really interesting. I'm reviewing the details carefully and will be in touch very soon with next steps and a tailored proposal.`,
    note: "Expect to hear from me within 24 hours.",
  },
  quoted: {
    subject: (pt) => `Your ${pt} Project – Proposal Ready`,
    eyebrow: "Proposal ready",
    tone: "ok",
    title: (name) => `Great news, ${name}!`,
    body: (pt) =>
      `I've carefully reviewed your ${pt} project and prepared a detailed proposal and pricing just for you. Check your inbox for the invoice. It includes a full breakdown of deliverables, timeline, and payment options.`,
    note: "Questions about the proposal? Just reply to this email.",
  },
  declined: {
    subject: (pt) => `Re: Your ${pt} Inquiry`,
    eyebrow: "Update",
    tone: "info",
    title: (name) => `Hi ${name},`,
    body: (pt) =>
      `Thank you so much for considering me for your ${pt} project. I really appreciate you taking the time to reach out. Unfortunately, I'm not able to take on new projects at this time due to existing commitments.`,
    note: "I hope we get the chance to work together in the future. Feel free to reach out again!",
  },
};

const CONTACT_LINE = "You can also write to me at hello@oceaniccoder.dev.";

// Returns { subject, html, text } for a status, or null when the status sends
// no email. Inputs are raw; the email kit escapes them.
function buildStatusEmail({ status, clientName, projectType }) {
  const tpl = Object.prototype.hasOwnProperty.call(TEMPLATES, status) ? TEMPLATES[status] : null;
  if (!tpl) return null;
  const pt = projectType || "your project";
  const subject = tpl.subject(pt);
  const html = shell({
    preview: tpl.note,
    reason: REASON,
    body:
      heading({ eyebrow: tpl.eyebrow, tone: tpl.tone, title: tpl.title(clientName) }) +
      p(tpl.body(pt)) +
      notice({ tone: tpl.tone, text: tpl.note }) +
      small(CONTACT_LINE),
  });
  const text = lines(tpl.title(clientName), tpl.body(pt), tpl.note, CONTACT_LINE);
  return { subject, html, text };
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

  const { status, clientName, clientEmail, projectType } = req.body || {};

  if (!clientEmail || !status || !clientName) {
    context.res = {
      status: 400,
      headers: CORS,
      body: JSON.stringify({ error: "clientEmail, status, clientName required" }),
    };
    return;
  }

  const email = buildStatusEmail({ status, clientName, projectType });
  if (!email) {
    context.res = { status: 200, headers: CORS, body: JSON.stringify({ skipped: true }) };
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "invoices@send.oceaniccoder.dev";

  if (!apiKey) {
    context.res = { status: 503, headers: CORS, body: JSON.stringify({ error: "Not configured" }) };
    return;
  }

  try {
    const result = await httpsPost(
      "api.resend.com",
      "/emails",
      { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      {
        from: `Illona @ OceanicCoder <${fromEmail}>`,
        to: [clientEmail],
        subject: email.subject,
        html: email.html,
        text: email.text,
      },
    );

    if (result.status === 200 || result.status === 201) {
      context.res = { status: 200, headers: CORS, body: JSON.stringify({ success: true }) };
    } else {
      context.log.error("Resend status email error:", result.status, result.body);
      context.res = {
        status: 502,
        headers: CORS,
        body: JSON.stringify({ error: "Failed to send email" }),
      };
    }
  } catch (err) {
    context.log.error("send-inquiry-status error:", err.message);
    context.res = { status: 500, headers: CORS, body: JSON.stringify({ error: "Internal error" }) };
  }
}

module.exports = handler;
module.exports.buildStatusEmail = buildStatusEmail;
