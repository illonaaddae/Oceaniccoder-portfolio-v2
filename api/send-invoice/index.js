/* global require, module, Buffer */
const https = require("https");
const { requireAdmin } = require("../shared/adminAuth");
const {
  C,
  esc,
  multiline,
  shell,
  heading,
  card,
  button,
  buttons,
  small,
} = require("../shared/email/ui");

const CORS = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://oceaniccoder.dev",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-appwrite-jwt",
  Vary: "Origin",
  "Content-Type": "application/json",
};

const CLIENT_REASON = "OceanicCoder · Web and app development";
const CONTACT = "hello@oceaniccoder.dev";
const LABEL = "font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase";
const NUM = "font-variant-numeric:tabular-nums;white-space:nowrap";

function formatDate(d) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

// The kit's button() only allows https links, so the mailto reply button is
// built here with the same secondary styling.
function mailtoButton(label) {
  return `<a href="mailto:${CONTACT}" style="display:inline-block;background:#ffffff;color:${C.tealDark};border:1px solid ${C.line};border-radius:10px;padding:12px 22px;font-size:15px;font-weight:600;text-decoration:none;margin:0 8px 8px 0">${esc(label)}</a>`;
}

function party(title, name, details) {
  return `<div style="${LABEL};color:${C.ink3};margin:0 0 8px">${esc(title)}</div><div style="font-size:15px;font-weight:700;color:${C.ink}">${esc(name)}</div>${details
    .filter(Boolean)
    .map((d) => `<div style="font-size:14px;color:${C.ink3}">${esc(d)}</div>`)
    .join("")}`;
}

function parties({ clientName, clientEmail, clientPhone }) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px"><tr>
<td width="50%" style="vertical-align:top;padding:0 12px 0 0">${party("From", "Illona Addae", ["OceanicCoder", "oceaniccoder.dev"])}</td>
<td width="50%" style="vertical-align:top;padding:0 0 0 12px;border-left:1px solid ${C.line}">${party("Billed to", clientName, [clientEmail, clientPhone])}</td>
</tr></table>`;
}

function itemsTable({ items, money, subtotal, tax, taxRate, total }) {
  const th = (label, align) =>
    `<th align="${align}" style="padding:0 0 10px;${LABEL};color:${C.ink3};text-align:${align}">${label}</th>`;
  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:12px 8px 12px 0;border-top:1px solid ${C.line};font-size:14px;color:${C.ink}">${esc(i.description)}</td><td align="center" style="padding:12px 8px;border-top:1px solid ${C.line};font-size:14px;color:${C.ink2};${NUM}">${esc(i.quantity)}</td><td align="right" style="padding:12px 8px;border-top:1px solid ${C.line};font-size:14px;color:${C.ink2};${NUM}">${esc(money(i.unitPrice))}</td><td align="right" style="padding:12px 0 12px 8px;border-top:1px solid ${C.line};font-size:14px;font-weight:600;color:${C.ink};${NUM}">${esc(money(i.quantity * i.unitPrice))}</td></tr>`,
    )
    .join("");
  const sum = (label, value, strong) =>
    `<tr><td colspan="3" align="right" style="padding:${strong ? "12px" : "8px"} 8px ${strong ? "4px" : "0"} 0;${strong ? `border-top:1px solid ${C.line};font-size:16px;font-weight:700;color:${C.ink}` : `font-size:14px;color:${C.ink3}`}">${esc(label)}</td><td align="right" style="padding:${strong ? "12px" : "8px"} 0 ${strong ? "4px" : "0"} 8px;${strong ? `border-top:1px solid ${C.line};font-size:16px;font-weight:700;color:${C.tealDark}` : `font-size:14px;color:${C.ink2}`};${NUM}">${esc(value)}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 24px">
<tr>${th("Description", "left")}${th("Qty", "center")}${th("Unit price", "right")}${th("Total", "right")}</tr>
${rows}
${sum("Subtotal", money(subtotal))}
${taxRate > 0 ? sum(`Tax (${taxRate}%)`, money(tax)) : ""}
${sum("Total", money(total), true)}
</table>`;
}

function notesBlock(notes) {
  return `<div style="background:${C.footer};border:1px solid ${C.line};border-radius:12px;padding:16px 20px;margin:0 0 24px"><div style="${LABEL};color:${C.ink3};margin:0 0 8px">Notes</div><div style="font-size:14px;color:${C.ink2}">${multiline(notes)}</div></div>`;
}

// Pure: builds the invoice email HTML from the request body fields.
function renderInvoiceEmail(d, now = new Date()) {
  const sym = d.currencySymbol || d.currency;
  const money = (n) => `${sym}${Number(n).toFixed(2)}`;
  const items = d.items || [];
  // Older callers sent items only; work the sums out rather than print NaN.
  const num = (v, fallback) =>
    Number.isFinite(Number(v)) && v !== "" && v !== null && v !== undefined ? Number(v) : fallback;
  const subtotal = num(
    d.subtotal,
    items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
  );
  const tax = num(d.tax, 0);
  d = { ...d, subtotal, tax, total: num(d.total, subtotal + tax) };
  const issuedDate = formatDate(now);
  const dueDate = d.dueDate ? formatDate(new Date(d.dueDate)) : null;
  const delivery = d.estimatedDelivery ? formatDate(new Date(d.estimatedDelivery)) : null;
  const amountDue = `${money(d.total)} ${d.currency}`;
  const payLink = `https://oceaniccoder.dev/pay/${encodeURIComponent(d.invoiceNumber)}`;

  return shell({
    preview: `Invoice ${d.invoiceNumber}: ${amountDue}${dueDate ? `, due ${dueDate}` : ""}`,
    meta: { label: "Invoice", number: d.invoiceNumber },
    reason: CLIENT_REASON,
    body:
      heading({
        eyebrow: "Invoice",
        title: "Your invoice from OceanicCoder",
        intro: `Hi ${d.clientName}, here is invoice ${d.invoiceNumber}, issued ${issuedDate}.`,
      }) +
      card({
        title: "Amount due",
        highlight: amountDue,
        rows: [
          ["Issued", issuedDate],
          ["Payment due", dueDate],
          ["Estimated delivery", delivery],
        ],
      }) +
      parties(d) +
      itemsTable({ ...d, items, money }) +
      (d.notes ? notesBlock(d.notes) : "") +
      buttons(button({ href: payLink, label: "Pay now" }), mailtoButton("Reply to this invoice")) +
      small("Have questions about this invoice? Get in touch."),
  });
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

  const html = renderInvoiceEmail({
    invoiceNumber,
    clientName,
    clientEmail,
    clientPhone,
    items,
    currency,
    currencySymbol,
    subtotal,
    tax,
    taxRate,
    total,
    dueDate,
    estimatedDelivery,
    notes,
  });

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

module.exports.renderInvoiceEmail = renderInvoiceEmail;
