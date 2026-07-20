const https = require("https");

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

async function sendWelcomeEmail(context, { email, apiKey, fromEmail }) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
        <tr>
          <td style="background:linear-gradient(135deg,#0C8599 0%,#0a6e7d 100%);padding:32px 40px;">
            <p style="margin:0;font-size:13px;color:#8dd7e7;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">OceanicCoder</p>
            <h1 style="margin:8px 0 0;font-size:24px;color:#ffffff;font-weight:700;">Welcome aboard! 🎉</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 16px;font-size:16px;color:#f1f5f9;font-weight:600;">Hey there,</p>
            <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.7;">
              You're now subscribed to the OceanicCoder newsletter. You'll be the first to know when I publish new blog posts, from tutorials and project breakdowns to tips from my journey as a full-stack developer.
            </p>
            <a href="https://oceaniccoder.dev/blog" style="display:inline-block;background:linear-gradient(135deg,#0C8599 0%,#0a6e7d 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:15px;">Browse the Blog →</a>
            <p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.6;">
              If this landed in your spam folder, please move it to your inbox so future emails reach you.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #334155;">
            <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;">
              You're receiving this because you subscribed at <a href="https://oceaniccoder.dev" style="color:#0C8599;text-decoration:none;">oceaniccoder.dev</a>.<br>
              No spam. Unsubscribe anytime.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

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
