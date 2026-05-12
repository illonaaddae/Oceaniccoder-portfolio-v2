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

const TEMPLATES = {
  reviewed: {
    subject: (pt) => `Your ${pt} Inquiry – I've Reviewed Your Project`,
    hero: {
      bg: "#0f2233",
      badge: "#3b82f6",
      badgeText: "UNDER REVIEW",
      icon: "&#128269;",
      iconBg: "rgba(59,130,246,0.15)",
      iconBorder: "rgba(59,130,246,0.5)",
      iconColor: "#60a5fa",
    },
    heading: (name) => `Thanks, ${name}!`,
    body: (name, pt) =>
      `I've had a good look at your <strong style="color:#f1f5f9;">${pt}</strong> project brief and it looks really interesting. I'm reviewing the details carefully and will be in touch very soon with next steps and a tailored proposal.`,
    note: "Expect to hear from me within 24 hours.",
  },
  quoted: {
    subject: (pt) => `Your ${pt} Project – Proposal Ready`,
    hero: {
      bg: "#0f2a1f",
      badge: "#0d9488",
      badgeText: "PROPOSAL READY",
      icon: "&#128196;",
      iconBg: "rgba(13,148,136,0.15)",
      iconBorder: "rgba(13,148,136,0.5)",
      iconColor: "#2dd4bf",
    },
    heading: (name) => `Great news, ${name}!`,
    body: (name, pt) =>
      `I've carefully reviewed your <strong style="color:#f1f5f9;">${pt}</strong> project and prepared a detailed proposal and pricing just for you. Check your inbox for the invoice — it includes a full breakdown of deliverables, timeline, and payment options.`,
    note: "Questions about the proposal? Just reply to this email.",
  },
  declined: {
    subject: (pt) => `Re: Your ${pt} Inquiry`,
    hero: {
      bg: "#1f1010",
      badge: "#6b7280",
      badgeText: "UPDATE",
      icon: "&#128075;",
      iconBg: "rgba(107,114,128,0.15)",
      iconBorder: "rgba(107,114,128,0.4)",
      iconColor: "#9ca3af",
    },
    heading: (name) => `Hi ${name},`,
    body: (name, pt) =>
      `Thank you so much for considering me for your <strong style="color:#f1f5f9;">${pt}</strong> project — I really appreciate you taking the time to reach out. Unfortunately, I'm not able to take on new projects at this time due to existing commitments.`,
    note: "I hope we get the chance to work together in the future. Feel free to reach out again!",
  },
};

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: CORS, body: "" };
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

  const tpl = TEMPLATES[status];
  if (!tpl) {
    context.res = { status: 200, headers: CORS, body: JSON.stringify({ skipped: true }) };
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "invoices@send.oceaniccoder.dev";

  if (!apiKey) {
    context.res = { status: 503, headers: CORS, body: JSON.stringify({ error: "Not configured" }) };
    return;
  }

  const safeName = escHtml(clientName);
  const pt = escHtml(projectType || "your project");
  const h = tpl.hero;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${tpl.subject(pt)}</title></head>
<body style="margin:0;padding:0;background:#0a0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f1a;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0d9488 0%,#065f57 100%);border-radius:16px 16px 0 0;padding:28px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td><img src="https://oceaniccoder.dev/images/logo/Oceaniccoder-croped.png" alt="OceanicCoder" width="130" style="display:block;" /></td>
                <td style="text-align:right;vertical-align:middle;">
                  <span style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:20px;padding:4px 12px;font-size:11px;color:#ffffff;font-weight:700;letter-spacing:0.1em;">${h.badge === "#3b82f6" ? "UNDER REVIEW" : h.badge === "#0d9488" ? "PROPOSAL READY" : "UPDATE"}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Hero -->
        <tr>
          <td style="background:${h.bg};padding:32px 40px;text-align:center;">
            <div style="width:68px;height:68px;border-radius:50%;background:${h.iconBg};border:2px solid ${h.iconBorder};display:inline-block;line-height:68px;font-size:34px;margin-bottom:16px;">${h.icon}</div>
            <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;">${tpl.heading(safeName)}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#111827;padding:28px 40px;border-top:1px solid #1e293b;">
            <p style="margin:0 0 16px;font-size:15px;color:#94a3b8;line-height:1.8;">${tpl.body(safeName, pt)}</p>
            <div style="background:#0f172a;border-left:3px solid #0d9488;border-radius:0 8px 8px 0;padding:14px 16px;">
              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.7;">${tpl.note}</p>
            </div>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="background:#111827;padding:0 40px 28px;text-align:center;">
            <a href="mailto:hello@oceaniccoder.dev" style="display:inline-block;background:linear-gradient(135deg,#0d9488 0%,#065f57 100%);color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:700;font-size:14px;">Reply to Illona</a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0a0f1a;border-radius:0 0 16px 16px;padding:20px 40px;border-top:1px solid #1e293b;text-align:center;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#374151;">OceanicCoder</p>
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
        to: [clientEmail],
        subject: tpl.subject(pt),
        html,
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
};
