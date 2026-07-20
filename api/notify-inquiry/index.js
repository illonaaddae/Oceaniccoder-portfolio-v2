const https = require("https");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

function escHtml(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

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

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
        <tr>
          <td style="background:linear-gradient(135deg,#0C8599 0%,#0a6e7d 100%);padding:28px 40px;">
            <p style="margin:0;font-size:13px;color:#8dd7e7;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">New Project Inquiry</p>
            <h1 style="margin:8px 0 0;font-size:22px;color:#ffffff;font-weight:700;">Someone wants to work with you</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:8px 0;border-bottom:1px solid #334155;">
                <span style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600;">Name</span><br>
                <span style="font-size:15px;color:#f1f5f9;font-weight:500;">${escHtml(name) || "N/A"}</span>
              </td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #334155;">
                <span style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600;">Email</span><br>
                <span style="font-size:15px;color:#f1f5f9;font-weight:500;">${escHtml(email) || "N/A"}</span>
              </td></tr>
              <tr><td style="padding:8px 0;">
                <span style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600;">Project Type</span><br>
                <span style="font-size:15px;color:#f1f5f9;font-weight:500;">${escHtml(projectType) || "N/A"}</span>
              </td></tr>
            </table>
            <a href="https://oceaniccoder.dev/dashboard" style="display:inline-block;margin-top:24px;background:linear-gradient(135deg,#0C8599 0%,#0a6e7d 100%);color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;">View in Dashboard</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

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
