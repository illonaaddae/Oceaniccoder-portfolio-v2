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

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: CORS, body: "" };
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

  const safeSubject = escHtml(subject);
  const safeGreeting = recipientName ? `Hi ${escHtml(recipientName)},` : "Hi,";
  // Preserve the admin's line breaks in the HTML body.
  const safeBody = escHtml(message).replace(/\r?\n/g, "<br>");

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeSubject}</title></head>
<body style="margin:0;padding:0;background:#0a0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f1a;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0d9488 0%,#065f57 100%);border-radius:16px 16px 0 0;padding:28px 40px;">
            <img src="https://oceaniccoder.dev/images/logo/Oceaniccoder-croped.png" alt="OceanicCoder" width="130" style="display:block;" />
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#111827;padding:32px 40px;border-top:1px solid #1e293b;">
            <p style="margin:0 0 16px;font-size:15px;color:#f1f5f9;font-weight:600;">${safeGreeting}</p>
            <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.8;">${safeBody}</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0a0f1a;border-radius:0 0 16px 16px;padding:20px 40px;border-top:1px solid #1e293b;text-align:center;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#374151;">Illona @ OceanicCoder</p>
            <p style="margin:0;font-size:12px;color:#374151;"><a href="https://oceaniccoder.dev" style="color:#0d9488;text-decoration:none;">oceaniccoder.dev</a> &nbsp;·&nbsp; hello@oceaniccoder.dev</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

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
        html,
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
};
