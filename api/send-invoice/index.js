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

  const {
    invoiceNumber,
    clientName,
    clientEmail,
    clientPhone,
    items = [],
    currency,
    currencySymbol,
    subtotal,
    tax,
    taxRate,
    total,
    dueDate,
    notes,
  } = req.body || {};

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

  if (!apiKey) {
    context.res = {
      status: 503,
      headers: CORS,
      body: JSON.stringify({ error: "Not configured" }),
    };
    return;
  }

  const itemRows = items
    .map(
      (i) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #334155;color:#94a3b8;font-size:14px;">${i.description}</td>
      <td style="padding:10px 0;border-bottom:1px solid #334155;color:#94a3b8;font-size:14px;text-align:center;">${i.quantity}</td>
      <td style="padding:10px 0;border-bottom:1px solid #334155;color:#94a3b8;font-size:14px;text-align:right;">${sym}${Number(i.unitPrice).toFixed(2)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #334155;color:#f1f5f9;font-size:14px;text-align:right;font-weight:600;">${sym}${(i.quantity * i.unitPrice).toFixed(2)}</td>
    </tr>`,
    )
    .join("");

  const dueDateLine = dueDate
    ? `<p style="margin:0 0 8px;font-size:13px;color:#64748b;">Due: <strong style="color:#f1f5f9;">${new Date(dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</strong></p>`
    : "";

  const taxRow =
    taxRate > 0
      ? `<tr><td style="padding:4px 0;color:#94a3b8;font-size:13px;">Tax (${taxRate}%)</td><td style="padding:4px 0;color:#94a3b8;font-size:13px;text-align:right;">${sym}${Number(tax).toFixed(2)}</td></tr>`
      : "";

  const notesBlock = notes
    ? `<tr><td colspan="2" style="padding-top:24px;">
        <p style="margin:0 0 6px;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600;letter-spacing:0.05em;">Notes</p>
        <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">${notes}</p>
      </td></tr>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0d9488 0%,#0d7a6e 100%);padding:32px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <img src="https://oceaniccoder.dev/images/logo/Oceaniccoder-croped.png" alt="OceanicCoder" width="140" style="display:block;margin-bottom:12px;" />
                  <h1 style="margin:0;font-size:26px;color:#ffffff;font-weight:700;">Invoice</h1>
                </td>
                <td style="text-align:right;vertical-align:bottom;">
                  <p style="margin:0;font-size:13px;color:#99f6e4;">${invoiceNumber}</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#b2f5ea;">Issued: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Client Info -->
        <tr>
          <td style="padding:28px 40px 0;">
            <p style="margin:0 0 4px;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600;letter-spacing:0.05em;">Billed To</p>
            <p style="margin:0;font-size:16px;color:#f1f5f9;font-weight:600;">${clientName}</p>
            <p style="margin:2px 0 0;font-size:13px;color:#94a3b8;">${clientEmail}</p>
            ${dueDateLine}
          </td>
        </tr>
        <!-- Items Table -->
        <tr>
          <td style="padding:24px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <th style="padding:8px 0;border-bottom:1px solid #475569;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600;">Description</th>
                <th style="padding:8px 0;border-bottom:1px solid #475569;text-align:center;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600;">Qty</th>
                <th style="padding:8px 0;border-bottom:1px solid #475569;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600;">Unit Price</th>
                <th style="padding:8px 0;border-bottom:1px solid #475569;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600;">Amount</th>
              </tr>
              ${itemRows}
            </table>
            <!-- Totals -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
              <tr>
                <td style="width:60%"></td>
                <td style="width:40%">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td style="padding:4px 0;color:#94a3b8;font-size:13px;">Subtotal</td><td style="padding:4px 0;color:#94a3b8;font-size:13px;text-align:right;">${sym}${Number(subtotal).toFixed(2)}</td></tr>
                    ${taxRow}
                    <tr>
                      <td style="padding:10px 0 4px;border-top:1px solid #475569;font-size:16px;font-weight:700;color:#f1f5f9;">Total</td>
                      <td style="padding:10px 0 4px;border-top:1px solid #475569;font-size:16px;font-weight:700;color:#0d9488;text-align:right;">${sym}${Number(total).toFixed(2)} ${currency}</td>
                    </tr>
                    ${notesBlock}
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #334155;">
            <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;">
              Questions? Reply to this email or visit <a href="https://oceaniccoder.dev" style="color:#0d9488;text-decoration:none;">oceaniccoder.dev</a>
            </p>
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
        subject: `Invoice ${invoiceNumber} from OceanicCoder`,
        html,
      },
    );

    if (result.status === 200 || result.status === 201) {
      // SMS to client (fire-and-forget)
      if (clientPhone) {
        sendSMS(
          clientPhone,
          `Hi ${clientName}, your invoice ${invoiceNumber} for ${sym}${Number(total).toFixed(2)} ${currency} from OceanicCoder has been sent to ${clientEmail}.`,
          context.log,
        );
      }

      context.res = {
        status: 200,
        headers: CORS,
        body: JSON.stringify({ success: true }),
      };
    } else {
      context.log.error("Resend invoice error:", result.status, result.body);
      context.res = {
        status: 502,
        headers: CORS,
        body: JSON.stringify({ error: "Failed to send invoice" }),
      };
    }
  } catch (err) {
    context.log.error("send-invoice error:", err.message);
    context.res = {
      status: 500,
      headers: CORS,
      body: JSON.stringify({ error: "Internal error" }),
    };
  }
};
