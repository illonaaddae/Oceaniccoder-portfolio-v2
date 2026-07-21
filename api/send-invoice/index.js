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
    estimatedDelivery,
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

  const safeClientName = escHtml(clientName);
  const safeClientEmail = escHtml(clientEmail);
  const safeClientPhone = clientPhone ? escHtml(clientPhone) : null;
  const safeInvoiceNumber = escHtml(invoiceNumber);

  const issuedDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const dueDateFormatted = dueDate
    ? new Date(dueDate).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;
  const estimatedDeliveryFormatted = estimatedDelivery
    ? new Date(estimatedDelivery).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const itemRows = items
    .map(
      (i, idx) => `
    <tr style="background:${idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)"};">
      <td style="padding:12px 8px 12px 0;border-bottom:1px solid #1e293b;color:#e2e8f0;font-size:14px;">${escHtml(i.description)}</td>
      <td style="padding:12px 8px;border-bottom:1px solid #1e293b;color:#94a3b8;font-size:14px;text-align:center;">${i.quantity}</td>
      <td style="padding:12px 8px;border-bottom:1px solid #1e293b;color:#94a3b8;font-size:14px;text-align:right;">${sym}${Number(i.unitPrice).toFixed(2)}</td>
      <td style="padding:12px 0 12px 8px;border-bottom:1px solid #1e293b;color:#0C8599;font-size:14px;text-align:right;font-weight:700;">${sym}${(i.quantity * i.unitPrice).toFixed(2)}</td>
    </tr>`,
    )
    .join("");

  const taxRow =
    taxRate > 0
      ? `<tr>
          <td style="padding:6px 0;color:#94a3b8;font-size:13px;">Tax (${taxRate}%)</td>
          <td style="padding:6px 0;color:#94a3b8;font-size:13px;text-align:right;">${sym}${Number(tax).toFixed(2)}</td>
        </tr>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Invoice ${invoiceNumber}</title>
</head>
<body style="margin:0;padding:0;background:#0a0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f1a;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header bar -->
        <tr>
          <td style="background:linear-gradient(135deg,#0C8599 0%,#085866 100%);border-radius:16px 16px 0 0;padding:28px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;padding-right:16px;">
                  <img src="https://oceaniccoder.dev/images/logo/Oceaniccoder-croped.png" alt="OceanicCoder" width="120" style="display:block;" />
                </td>
                <td style="text-align:right;vertical-align:middle;padding-left:16px;">
                  <p style="margin:0;font-size:11px;color:#ffffff;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Invoice</p>
                  <p style="margin:4px 0 0;font-size:20px;color:#ffffff;font-weight:800;letter-spacing:0.01em;">${safeInvoiceNumber}</p>
                  <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.75);">Issued ${issuedDate}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Total hero -->
        <tr>
          <td style="background:#0f2a27;padding:24px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0;font-size:12px;color:#52bfd7;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">Amount Due</p>
                  <p style="margin:6px 0 0;font-size:36px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">${sym}${Number(total).toFixed(2)} <span style="font-size:18px;font-weight:500;color:#52bfd7;">${currency}</span></p>
                </td>
                ${
                  dueDateFormatted || estimatedDeliveryFormatted
                    ? `<td style="text-align:right;vertical-align:middle;">
                  ${
                    dueDateFormatted
                      ? `<div style="display:inline-block;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);border-radius:8px;padding:8px 16px;${estimatedDeliveryFormatted ? "margin-bottom:8px;" : ""}">
                    <p style="margin:0;font-size:11px;color:#fbbf24;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Payment Due</p>
                    <p style="margin:3px 0 0;font-size:14px;color:#fde68a;font-weight:700;">${dueDateFormatted}</p>
                  </div>`
                      : ""
                  }
                  ${
                    estimatedDeliveryFormatted
                      ? `<div style="display:inline-block;background:rgba(13,148,136,0.15);border:1px solid rgba(13,148,136,0.4);border-radius:8px;padding:8px 16px;">
                    <p style="margin:0;font-size:11px;color:#26a9c5;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Est. Delivery</p>
                    <p style="margin:3px 0 0;font-size:14px;color:#8dd7e7;font-weight:700;">${estimatedDeliveryFormatted}</p>
                  </div>`
                      : ""
                  }
                </td>`
                    : ""
                }
              </tr>
            </table>
          </td>
        </tr>

        <!-- From / To -->
        <tr>
          <td style="background:#111827;padding:24px 40px;border-top:1px solid #1e293b;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:50%;vertical-align:top;padding-right:20px;">
                  <p style="margin:0 0 8px;font-size:11px;color:#4b5563;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">From</p>
                  <p style="margin:0;font-size:14px;color:#f1f5f9;font-weight:700;">Illona Addae</p>
                  <p style="margin:2px 0 0;font-size:13px;color:#6b7280;">OceanicCoder</p>
                  <p style="margin:2px 0 0;font-size:13px;color:#6b7280;">oceaniccoder.dev</p>
                </td>
                <td style="width:50%;vertical-align:top;padding-left:20px;border-left:1px solid #1f2937;">
                  <p style="margin:0 0 8px;font-size:11px;color:#4b5563;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">Billed To</p>
                  <p style="margin:0;font-size:14px;color:#f1f5f9;font-weight:700;">${safeClientName}</p>
                  <p style="margin:2px 0 0;font-size:13px;color:#6b7280;">${safeClientEmail}</p>
                  ${safeClientPhone ? `<p style="margin:2px 0 0;font-size:13px;color:#6b7280;">${safeClientPhone}</p>` : ""}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Items -->
        <tr>
          <td style="background:#111827;padding:0 40px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <tr style="border-bottom:2px solid #1e3a5f;">
                <th style="padding:10px 8px 10px 0;text-align:left;font-size:11px;color:#4b5563;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Description</th>
                <th style="padding:10px 8px;text-align:center;font-size:11px;color:#4b5563;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Qty</th>
                <th style="padding:10px 8px;text-align:right;font-size:11px;color:#4b5563;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Unit Price</th>
                <th style="padding:10px 0 10px 8px;text-align:right;font-size:11px;color:#4b5563;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Total</th>
              </tr>
              ${itemRows}
            </table>

            <!-- Totals summary -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
              <tr>
                <td style="width:55%"></td>
                <td style="width:45%;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:10px;padding:4px 0;">
                    <tr>
                      <td style="padding:8px 16px;color:#6b7280;font-size:13px;">Subtotal</td>
                      <td style="padding:8px 16px;color:#9ca3af;font-size:13px;text-align:right;">${sym}${Number(subtotal).toFixed(2)}</td>
                    </tr>
                    ${taxRow}
                    <tr style="border-top:1px solid #1e293b;">
                      <td style="padding:12px 16px;color:#f1f5f9;font-size:15px;font-weight:800;">Total</td>
                      <td style="padding:12px 16px;color:#0C8599;font-size:15px;font-weight:800;text-align:right;">${sym}${Number(total).toFixed(2)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        ${
          notes
            ? `<!-- Notes -->
        <tr>
          <td style="background:#111827;padding:0 40px 24px;">
            <div style="background:#0f172a;border-left:3px solid #0C8599;border-radius:0 8px 8px 0;padding:14px 16px;">
              <p style="margin:0 0 4px;font-size:11px;color:#0C8599;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Notes</p>
              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.7;">${notes}</p>
            </div>
          </td>
        </tr>`
            : ""
        }

        <!-- CTA -->
        <tr>
          <td style="background:#111827;padding:0 40px 28px;text-align:center;">
            <p style="margin:0 0 16px;font-size:13px;color:#6b7280;">Have questions about this invoice? Get in touch.</p>
            <a href="https://oceaniccoder.dev/pay/${invoiceNumber}" style="display:inline-block;background:linear-gradient(135deg,#0C8599 0%,#085866 100%);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.01em;margin-bottom:12px;">Pay Now →</a>
            <br>
            <a href="mailto:hello@oceaniccoder.dev" style="display:inline-block;background:linear-gradient(135deg,#0C8599 0%,#085866 100%);color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:700;font-size:14px;letter-spacing:0.01em;">Reply to this Invoice</a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0a0f1a;border-radius:0 0 16px 16px;padding:20px 40px;border-top:1px solid #1e293b;text-align:center;">
            <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#374151;">OceanicCoder</p>
            <p style="margin:0;font-size:12px;color:#374151;line-height:1.6;">
              <a href="https://oceaniccoder.dev" style="color:#0C8599;text-decoration:none;">oceaniccoder.dev</a>
              &nbsp;·&nbsp; hello@oceaniccoder.dev
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
