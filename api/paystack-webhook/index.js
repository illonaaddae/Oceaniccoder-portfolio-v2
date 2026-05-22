// POST /api/paystack-webhook
// Handles Paystack payment webhook events.
// Verifies signature using PAYSTACK_SECRET_KEY, updates invoice status in Appwrite,
// and sends confirmation emails via Resend.
// Always returns 200 — Paystack expects 200 even when processing fails.

const crypto = require("crypto");
const https = require("https");
const sdk = require("node-appwrite");

const ENDPOINT = "https://fra.cloud.appwrite.io/v1";
const PROJECT_ID = "6943431e00253c8f9883";
const DATABASE_ID = "6943493400018e7c314c";
const COLLECTION_ID = "invoices";
const PAYMENTS_COLLECTION_ID = "payments";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-paystack-signature",
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

async function sendEmail(apiKey, fromEmail, to, subject, html, log) {
  try {
    await httpsPost(
      "api.resend.com",
      "/emails",
      { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      { from: `OceanicCoder <${fromEmail}>`, to: [to], subject, html },
    );
  } catch (err) {
    if (log) log.warn("Email send failed:", err.message);
  }
}

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: CORS, body: "" };
    return;
  }

  // Paystack always expects a 200 response — return early with 200 in all error cases
  const ok = () => {
    context.res = { status: 200, headers: CORS, body: JSON.stringify({ received: true }) };
  };

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    context.log.warn("paystack-webhook: PAYSTACK_SECRET_KEY not set");
    ok();
    return;
  }

  // Azure Functions v3 provides rawBody as a string for signature verification
  const rawBody = req.rawBody || JSON.stringify(req.body);
  const signature = req.headers && req.headers["x-paystack-signature"];

  if (!signature) {
    context.log.warn("paystack-webhook: missing x-paystack-signature header");
    ok();
    return;
  }

  // Verify HMAC-SHA512 signature
  const expectedHash = crypto.createHmac("sha512", secretKey).update(rawBody).digest("hex");

  const sigBuf = Buffer.from(signature, "hex");
  const expBuf = Buffer.from(expectedHash, "hex");
  const sigMatch = sigBuf.length === expBuf.length && crypto.timingSafeEqual(expBuf, sigBuf);

  if (!sigMatch) {
    context.log.warn("paystack-webhook: signature mismatch — possible spoofed request");
    ok();
    return;
  }

  const event = req.body;

  if (!event || event.event !== "charge.success") {
    // Acknowledge non-charge events without processing
    ok();
    return;
  }

  const data = event.data || {};
  const metadata = data.metadata || {};

  // Extracts invoice number from metadata or parses it from reference (PAY-INV-XXXXXX-timestamp)
  let invoiceNumber =
    metadata.invoiceNumber ||
    (data.reference && data.reference.replace(/^(?:PAY|OC)-/, "").replace(/-\d+$/, ""));

  if (!invoiceNumber) {
    context.log.warn("paystack-webhook: could not determine invoiceNumber from event");
    ok();
    return;
  }

  const amountPaid = (data.amount || 0) / 100; // convert from pesewas back to base unit
  const currency = data.currency || "GHS";
  const sym = currency === "GHS" ? "₵" : currency;

  const apiKey = process.env.APPWRITE_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "invoices@send.oceaniccoder.dev";
  const adminEmail = process.env.RESEND_TO_EMAIL;

  // Update invoice status in Appwrite
  if (apiKey) {
    try {
      const client = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(apiKey);

      const db = new sdk.Databases(client);

      const result = await db.listDocuments(DATABASE_ID, COLLECTION_ID, [
        sdk.Query.equal("invoiceNumber", [invoiceNumber]),
      ]);

      if (result.documents && result.documents.length > 0) {
        const doc = result.documents[0];

        await db.updateDocument(DATABASE_ID, COLLECTION_ID, doc.$id, {
          status: "paid",
        });

        context.log.info(`paystack-webhook: invoice ${invoiceNumber} marked as paid`);

        const clientName = doc.clientName || "Client";
        const clientEmail = doc.clientEmail;

        // Create payment record (audit log)
        try {
          // Paystack channel: "card", "mobile_money", "bank", "bank_transfer", etc.
          const channel = (data.channel || "").toLowerCase();
          let method = "card";
          if (channel.includes("mobile")) method = "momo";
          else if (channel.includes("bank")) method = "bank";

          await db.createDocument(DATABASE_ID, PAYMENTS_COLLECTION_ID, sdk.ID.unique(), {
            invoiceNumber,
            clientName,
            clientEmail: clientEmail || "",
            amount: amountPaid,
            currency,
            method,
            paystackReference: data.reference || "",
            paidAt: new Date().toISOString(),
            status: "success",
          });
          context.log.info(`paystack-webhook: payment record created for ${invoiceNumber}`);
        } catch (pErr) {
          context.log.error("paystack-webhook: failed to create payment record:", pErr.message);
        }

        // Send confirmation to client
        if (resendKey && clientEmail) {
          await sendEmail(
            resendKey,
            fromEmail,
            clientEmail,
            `Payment received for invoice ${invoiceNumber}`,
            `<p>Hi ${clientName},</p><p>Payment received for invoice <strong>${invoiceNumber}</strong>. Amount: <strong>${sym}${amountPaid.toFixed(2)} ${currency}</strong>. Thank you!</p><p>Best,<br>Illona @ OceanicCoder</p>`,
            context.log,
          );
        }

        // Send notification to admin
        if (resendKey && adminEmail) {
          await sendEmail(
            resendKey,
            fromEmail,
            adminEmail,
            `Payment received for invoice ${invoiceNumber}`,
            `<p>Payment received for invoice <strong>${invoiceNumber}</strong> from <strong>${clientName}</strong>. Amount: <strong>${sym}${amountPaid.toFixed(2)} ${currency}</strong>.</p>`,
            context.log,
          );
        }
      } else {
        context.log.warn(`paystack-webhook: invoice ${invoiceNumber} not found in Appwrite`);
      }
    } catch (err) {
      context.log.error("paystack-webhook Appwrite error:", err.message);
    }
  } else {
    context.log.warn("paystack-webhook: APPWRITE_API_KEY not set — skipping DB update");
  }

  ok();
};
