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

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: CORS, body: "" };
    return;
  }

  const { invoiceNumber, clientName, clientEmail, total, currency, currencySymbol } =
    req.body || {};

  if (!clientEmail || !invoiceNumber) {
    context.res = {
      status: 400,
      headers: CORS,
      body: JSON.stringify({ error: "clientEmail and invoiceNumber required" }),
    };
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "invoices@send.oceaniccoder.dev";
  const sym = currencySymbol || currency;
  const safeClientName = escHtml(clientName);
  const safeInvoiceNumber = escHtml(invoiceNumber);

  if (!apiKey) {
    context.res = { status: 503, headers: CORS, body: JSON.stringify({ error: "Not configured" }) };
    return;
  }

  const paidDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Payment Confirmed</title></head>
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
                  <p style="margin:0;font-size:11px;color:#99f6e4;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Payment Confirmed</p>
                  <p style="margin:4px 0 0;font-size:18px;color:#ffffff;font-weight:800;">${safeInvoiceNumber}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Success hero -->
        <tr>
          <td style="background:#0a2e1a;padding:28px 40px;text-align:center;">
            <div style="width:64px;height:64px;border-radius:50%;background:rgba(34,197,94,0.15);border:2px solid rgba(34,197,94,0.5);display:inline-block;line-height:64px;text-align:center;margin-bottom:16px;font-size:32px;color:#22c55e;">&#10003;</div>
            <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;">Payment Received!</p>
            <p style="margin:8px 0 0;font-size:15px;color:#86efac;">Thank you, ${safeClientName}. Payment for invoice <strong>${safeInvoiceNumber}</strong> has been confirmed.</p>
          </td>
        </tr>

        <!-- Details -->
        <tr>
          <td style="background:#111827;padding:24px 40px;border-top:1px solid #1e293b;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-size:14px;">Invoice</td>
                <td style="padding:8px 0;color:#f1f5f9;font-size:14px;text-align:right;font-weight:600;">${safeInvoiceNumber}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-size:14px;">Amount Paid</td>
                <td style="padding:8px 0;color:#0d9488;font-size:16px;text-align:right;font-weight:800;">${sym}${Number(total).toFixed(2)} ${currency}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-size:14px;">Date</td>
                <td style="padding:8px 0;color:#f1f5f9;font-size:14px;text-align:right;">${paidDate}</td>
              </tr>
              <tr style="border-top:1px solid #1e293b;">
                <td style="padding:8px 0;color:#6b7280;font-size:14px;">Status</td>
                <td style="padding:8px 0;text-align:right;"><span style="background:rgba(34,197,94,0.15);color:#22c55e;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;border:1px solid rgba(34,197,94,0.4);">PAID</span></td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Message -->
        <tr>
          <td style="background:#111827;padding:0 40px 28px;text-align:center;">
            <p style="margin:0;font-size:13px;color:#6b7280;">This is your payment receipt. Keep it for your records.</p>
            <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">Questions? <a href="mailto:hello@oceaniccoder.dev" style="color:#0d9488;text-decoration:none;">hello@oceaniccoder.dev</a></p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0a0f1a;border-radius:0 0 16px 16px;padding:20px 40px;border-top:1px solid #1e293b;text-align:center;">
            <p style="margin:0;font-size:13px;font-weight:600;color:#374151;">OceanicCoder</p>
            <p style="margin:0;font-size:12px;color:#374151;"><a href="https://oceaniccoder.dev" style="color:#0d9488;text-decoration:none;">oceaniccoder.dev</a></p>
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
        subject: `Payment Confirmed – ${invoiceNumber}`,
        html,
      },
    );

    if (result.status === 200 || result.status === 201) {
      context.res = { status: 200, headers: CORS, body: JSON.stringify({ success: true }) };
    } else {
      context.log.error("Resend confirmation error:", result.status, result.body);
      context.res = {
        status: 502,
        headers: CORS,
        body: JSON.stringify({ error: "Failed to send email" }),
      };
    }
  } catch (err) {
    context.log.error("send-payment-confirmation error:", err.message);
    context.res = { status: 500, headers: CORS, body: JSON.stringify({ error: "Internal error" }) };
  }
};
