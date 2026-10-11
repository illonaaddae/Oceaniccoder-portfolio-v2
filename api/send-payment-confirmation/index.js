/* global require, module, Buffer */
const https = require("https");
const { requireAdmin } = require("../shared/adminAuth");
const { shell, heading, card, small } = require("../shared/email/ui");

const CORS = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://oceaniccoder.dev",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-appwrite-jwt",
  Vary: "Origin",
  "Content-Type": "application/json",
};

const CLIENT_REASON = "OceanicCoder · Web and app development";

// Pure: builds the receipt email HTML. paidDate is pre-formatted so the HTML
// and the plain-text part show the same date.
function renderPaymentConfirmation({
  invoiceNumber,
  clientName,
  total,
  currency,
  currencySymbol,
  paidDate,
}) {
  const sym = currencySymbol || currency;
  const amount = `${sym}${Number(total).toFixed(2)} ${currency}`;
  return shell({
    preview: `Payment of ${amount} received for ${invoiceNumber}. Thank you.`,
    meta: { label: "Receipt", number: invoiceNumber },
    reason: CLIENT_REASON,
    body:
      heading({
        eyebrow: "Payment confirmed",
        tone: "ok",
        title: `Thank you, ${clientName}`,
        intro: `Your receipt for ${invoiceNumber} is below. We appreciate your trust in OceanicCoder.`,
      }) +
      card({
        title: "Receipt",
        highlightLabel: "Amount paid",
        highlight: amount,
        rows: [
          ["Invoice", invoiceNumber],
          ["Date", paidDate],
          ["Status", "Paid"],
        ],
      }) +
      small(
        "Keep this email as your receipt. If you have any questions, just reply or write to hello@oceaniccoder.dev.",
      ),
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

  if (!apiKey) {
    context.res = { status: 503, headers: CORS, body: JSON.stringify({ error: "Not configured" }) };
    return;
  }

  const paidDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const html = renderPaymentConfirmation({
    invoiceNumber,
    clientName,
    total,
    currency,
    currencySymbol,
    paidDate,
  });

  try {
    const result = await httpsPost(
      "api.resend.com",
      "/emails",
      { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      {
        from: `Illona @ OceanicCoder <${fromEmail}>`,
        reply_to: "hello@oceaniccoder.dev",
        to: [clientEmail],
        subject: `Your receipt from OceanicCoder – ${invoiceNumber}`,
        html,
        text: `Hi ${clientName},\n\nThank you for your payment. This is your receipt for invoice ${invoiceNumber}.\n\nAmount: ${sym}${Number(total).toFixed(2)} ${currency}\nDate: ${paidDate}\nStatus: PAID\n\nQuestions? Reply to this email or contact hello@oceaniccoder.dev\n\nOceanicCoder\nhttps://oceaniccoder.dev`,
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

module.exports.renderPaymentConfirmation = renderPaymentConfirmation;
