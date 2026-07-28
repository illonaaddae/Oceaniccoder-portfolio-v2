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

  // Read email config up front so a bail-out can still report itself. Previously
  // these were read below the signature checks, so an early return told nobody.
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "invoices@send.oceaniccoder.dev";
  const adminEmail = process.env.RESEND_TO_EMAIL;

  /**
   * Abandon processing, but tell someone first.
   *
   * Every failure path here answers Paystack with 200 (it requires that) and used
   * to leave only a log line. The result was a real charge where the invoice
   * stayed "sent", no payment record was written and no email went out, with
   * nothing anywhere to say why. Money moves through this function; it must not
   * fail quietly.
   */
  const bail = async (reason, detail) => {
    context.log.error(`paystack-webhook: ${reason}${detail ? ` — ${detail}` : ""}`);
    if (resendKey && adminEmail) {
      await sendEmail(
        resendKey,
        fromEmail,
        adminEmail,
        "Action needed: a Paystack webhook was not processed",
        `<p>A Paystack webhook arrived but could not be processed, so an invoice may have been paid without being recorded.</p>` +
          `<p>Reason: <strong>${reason}</strong></p>` +
          (detail ? `<p>Detail: <code>${detail}</code></p>` : "") +
          `<p>Check the Payments tab against the Paystack dashboard, and mark the invoice paid by hand if the money did arrive.</p>`,
        context.log,
      );
    }
    ok();
  };

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    await bail("PAYSTACK_SECRET_KEY is not set in Azure configuration");
    return;
  }

  // Paystack signs with the secret of the mode the transaction was in, so a live
  // key cannot verify a test-mode event and vice versa. Reporting only the
  // prefix identifies a mode mix-up without exposing any secret material.
  const keyMode = secretKey.startsWith("sk_live_")
    ? "live"
    : secretKey.startsWith("sk_test_")
      ? "test"
      : "unrecognised prefix";

  // The signature must be computed over the exact bytes Paystack sent. Azure
  // Functions v3 supplies rawBody for HTTP triggers; if it is ever absent,
  // re-serialising req.body will almost never reproduce those bytes (key order
  // and whitespace differ), so the HMAC silently will not match. Track which
  // source was used so a mismatch says whether this was the reason.
  const usedRawBody = typeof req.rawBody === "string" && req.rawBody.length > 0;
  const rawBody = usedRawBody ? req.rawBody : JSON.stringify(req.body);
  const signature = req.headers && req.headers["x-paystack-signature"];

  if (!signature) {
    await bail("request had no x-paystack-signature header");
    return;
  }

  // Verify HMAC-SHA512 signature
  const expectedHash = crypto.createHmac("sha512", secretKey).update(rawBody).digest("hex");

  const sigBuf = Buffer.from(signature, "hex");
  const expBuf = Buffer.from(expectedHash, "hex");
  const sigMatch = sigBuf.length === expBuf.length && crypto.timingSafeEqual(expBuf, sigBuf);

  if (!sigMatch) {
    await bail(
      "signature verification failed",
      `PAYSTACK_SECRET_KEY is a ${keyMode} key; ` +
        `signature was computed over ${usedRawBody ? "the raw request body" : "a re-serialised body because req.rawBody was empty, which alone can cause this"}. ` +
        `If the transaction was in the other mode, that is the cause — check the mode of this charge in Paystack. ` +
        `Otherwise treat it as an unverified request and ignore it.`,
    );
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

  // Paystack reports which mode the charge was in. A test charge reaching a live
  // key (or the reverse) usually fails the signature check above, but if it ever
  // gets this far, recording a test payment as real revenue would be worse than
  // skipping it.
  if (data.domain && data.domain !== keyMode) {
    await bail(
      "charge mode does not match the configured key",
      `charge was in ${data.domain} mode but PAYSTACK_SECRET_KEY is a ${keyMode} key — not recording it as revenue`,
    );
    return;
  }

  // Extract invoice number from metadata or parse from reference (PAY-INV-XXXXXX-timestamp)
  let invoiceNumber =
    metadata.invoiceNumber ||
    (data.reference && data.reference.replace(/^(?:PAY|OC)-/, "").replace(/-\d+$/, ""));

  if (!invoiceNumber) {
    await bail(
      "could not determine which invoice this payment belongs to",
      `reference: ${data.reference || "none"}`,
    );
    return;
  }

  const amountPaid = (data.amount || 0) / 100; // convert from pesewas back to base unit
  const currency = data.currency || "GHS";
  const sym = currency === "GHS" ? "₵" : currency;

  const apiKey = process.env.APPWRITE_API_KEY;

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
          // Paystack channel: "card", "mobile_money", "bank", "bank_transfer",
          // "apple_pay", etc. Apple Pay is checked first — it is a card wallet,
          // so if Paystack ever reports it as a card variant the substring match
          // on "apple" still wins and we keep the distinction in reporting.
          const channel = (data.channel || "").toLowerCase();
          let method = "card";
          if (channel.includes("apple")) method = "apple_pay";
          else if (channel.includes("mobile")) method = "momo";
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
          // A swallowed failure here leaves the invoice paid with no audit-log row, so the
          // Payments tab under-reports revenue with no visible sign. Alert the admin.
          if (resendKey && adminEmail) {
            await sendEmail(
              resendKey,
              fromEmail,
              adminEmail,
              `Action needed: payment record failed for invoice ${invoiceNumber}`,
              `<p>Paystack payment for invoice <strong>${invoiceNumber}</strong> succeeded and the invoice was marked paid, but the audit-log record failed to save.</p>` +
                `<p>Error: <code>${pErr.message}</code></p>` +
                `<p>Amount: <strong>${sym}${amountPaid.toFixed(2)} ${currency}</strong>. Reference: <code>${data.reference || "n/a"}</code>.</p>` +
                `<p>This payment is missing from the Payments tab. Run <code>scripts/backfill-payments.mjs</code> to repair.</p>`,
              context.log,
            );
          }
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
        await bail(
          "no invoice matches this payment",
          `looked for invoiceNumber "${invoiceNumber}", amount ${sym}${amountPaid.toFixed(2)} ${currency}, reference ${data.reference || "none"}`,
        );
        return;
      }
    } catch (err) {
      await bail("Appwrite rejected the update", `${err.message} (invoice ${invoiceNumber})`);
      return;
    }
  } else {
    await bail(
      "APPWRITE_API_KEY is not set in Azure configuration",
      `invoice ${invoiceNumber} was paid (${sym}${amountPaid.toFixed(2)} ${currency}) but could not be marked paid or recorded`,
    );
    return;
  }

  ok();
};
