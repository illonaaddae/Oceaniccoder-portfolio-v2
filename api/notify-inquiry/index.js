/* global require, module, Buffer */
const https = require("https");
const { shell, heading, card, button, buttons } = require("../shared/email/ui");

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

function httpsPostForm(hostname, path, headers, params) {
  return new Promise((resolve, reject) => {
    const data = new URLSearchParams(params).toString();
    const req = https.request(
      {
        hostname,
        path,
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(data),
        },
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

async function sendSMS(to, message, log) {
  const apiKey = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME;
  if (!apiKey || !username || !to) return;

  const params = { username, to, message };
  const senderId = process.env.AT_SENDER_ID;
  if (senderId) params.from = senderId;

  try {
    await httpsPostForm(
      "api.africastalking.com",
      "/version1/messaging",
      { apiKey, Accept: "application/json" },
      params,
    );
  } catch (err) {
    if (log) log.warn("SMS failed:", err.message);
  }
}

const DASHBOARD_URL = "https://oceaniccoder.dev/dashboard";

function inquiryEmail({ name, email, projectType }) {
  return shell({
    preview: `New project inquiry from ${name || "someone"}`,
    reason: "Sent to you as the OceanicCoder admin.",
    body:
      heading({ eyebrow: "New project inquiry", title: "Someone wants to work with you" }) +
      card({
        title: "Inquiry",
        rows: [
          ["Name", name || "N/A"],
          ["Email", email || "N/A"],
          ["Project type", projectType || "N/A"],
        ],
      }) +
      buttons(button({ href: DASHBOARD_URL, label: "View in Dashboard" })),
  });
}

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: CORS, body: "" };
    return;
  }

  const { name, email, projectType } = req.body || {};

  // SMS to admin (fire-and-forget)
  const adminPhone = process.env.ADMIN_PHONE;
  if (adminPhone) {
    sendSMS(
      adminPhone,
      `New inquiry from ${name || "someone"} (${projectType || "unknown"}). View: oceaniccoder.dev/dashboard`,
      context.log,
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.RESEND_TO_EMAIL;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "notifications@send.oceaniccoder.dev";

  if (!apiKey || !toEmail) {
    context.res = { status: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    return;
  }

  const html = inquiryEmail({ name, email, projectType });

  try {
    await httpsPost(
      "api.resend.com",
      "/emails",
      { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      {
        from: `OceanicCoder <${fromEmail}>`,
        to: [toEmail],
        subject: `New project inquiry from ${name || "someone"}`,
        html,
      },
    );
  } catch (err) {
    context.log.warn("notify-inquiry email failed:", err.message);
  }

  context.res = { status: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
};

// Exposed for tests only; the Functions host calls the default export.
module.exports.inquiryEmail = inquiryEmail;
