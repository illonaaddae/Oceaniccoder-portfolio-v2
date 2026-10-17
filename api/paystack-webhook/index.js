/* global require, module, Buffer */
// POST /api/paystack-webhook
// Handles Paystack payment webhook events.
// Verifies signature using PAYSTACK_SECRET_KEY, updates invoice status in Appwrite,
// and sends confirmation emails via Resend.
// Always returns 200 — Paystack expects 200 even when processing fails.

const crypto = require("crypto");
const https = require("https");
const sdk = require("node-appwrite");
const { evaluateSettlement } = require("./settlement");
const quoteService = require("../shared/quotes/service");
const { shell, heading, p, card, notice, small } = require("../shared/email/ui");

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

// Unverified requests email the admin at most this often (see refuse()).
const UNVERIFIED_ALERT_INTERVAL_MS = 60 * 60 * 1000;
let lastUnverifiedAlertAt = -Infinity;

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

// Email bodies, built on the shared kit so every value is escaped. Invoice
// numbers and references come from the Paystack payload and error messages
// from Appwrite, so none of them is trusted as HTML.
const CLIENT_REASON = "OceanicCoder · Web and app development";
const ADMIN_REASON = "Sent to you as the OceanicCoder admin.";

function webhookFailedEmail(reason, detail) {
  return shell({
    preview: `Paystack webhook not processed: ${reason}`,
    reason: ADMIN_REASON,
    body:
      heading({
        eyebrow: "Webhook not processed",
        tone: "danger",
        title: "A Paystack payment may be unrecorded",
        intro:
          "A Paystack webhook arrived but could not be processed, so an invoice may have been paid without being recorded.",
      }) +
      notice({ tone: "danger", text: `Reason: ${reason}` }) +
      (detail ? p(`Detail: ${detail}`) : "") +
      small(
        "Check the Payments tab against the Paystack dashboard, and mark the invoice paid by hand if the money did arrive.",
      ),
  });
}

function recordFailedEmail({ invoiceNumber, error, amount, reference }) {
  return shell({
    preview: `Payment record failed for invoice ${invoiceNumber}`,
    meta: { label: "Invoice", number: invoiceNumber },
    reason: ADMIN_REASON,
    body:
      heading({
        eyebrow: "Payment record failed",
        tone: "danger",
        title: "A paid invoice is missing from Payments",
        intro: `Paystack payment for invoice ${invoiceNumber} succeeded and the invoice was marked paid, but the audit-log record failed to save.`,
      }) +
      notice({ tone: "danger", text: `Error: ${error}` }) +
      card({
        title: "Payment details",
        rows: [
          ["Amount", amount],
          ["Reference", reference],
        ],
      }) +
      small(
        "This payment is missing from the Payments tab. Run scripts/backfill-payments.mjs to repair.",
      ),
  });
}

function clientReceiptEmail({ clientName, invoiceNumber, amount }) {
  return shell({
    preview: `Payment received for invoice ${invoiceNumber}. Thank you.`,
    meta: { label: "Invoice", number: invoiceNumber },
    reason: CLIENT_REASON,
    body:
      heading({
        eyebrow: "Payment received",
        tone: "ok",
        title: "Thank you, payment received",
        intro: `Hi ${clientName}, payment received for invoice ${invoiceNumber}. Thank you!`,
      }) +
      card({
        title: "Payment summary",
        highlightLabel: "Amount",
        highlight: amount,
        rows: [["Invoice", invoiceNumber]],
      }) +
      p("Best,\nIllona @ OceanicCoder"),
  });
}

// problem = { tone, text } | null; set when the payment did not settle cleanly.
function adminPaymentEmail({ invoiceNumber, clientName, amount, reference, settles, problem }) {
  return shell({
    preview: `${clientName} paid ${amount} on invoice ${invoiceNumber}`,
    meta: { label: "Invoice", number: invoiceNumber },
    reason: ADMIN_REASON,
    body:
      heading({
        eyebrow: settles ? "Payment received" : "Payment problem",
        tone: settles ? "ok" : "danger",
        title: `${clientName} paid ${amount}`,
        intro: `Payment received for invoice ${invoiceNumber} from ${clientName}.`,
      }) +
      (problem ? notice(problem) : "") +
      card({
        title: "Payment details",
        rows: [
          ["Invoice", invoiceNumber],
          ["Client", clientName],
          ["Amount", amount],
          ["Reference", reference],
        ],
      }),
  });
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
        webhookFailedEmail(reason, detail),
        context.log,
      );
    }
    ok();
  };

  /**
   * Turn away a request whose signature can't be verified. Anyone can POST
   * here, so emailing on every one would let a loop of junk requests flood the
   * admin inbox and use up the Resend quota that receipts rely on. A real key
   * mode mix-up still needs to reach someone, so the email goes out at most
   * once an hour per instance; every attempt is logged.
   */
  const refuse = async (reason, detail) => {
    const now = Date.now();
    if (now - lastUnverifiedAlertAt < UNVERIFIED_ALERT_INTERVAL_MS) {
      context.log.error(`paystack-webhook: ${reason}${detail ? ` — ${detail}` : ""}`);
      ok();
      return;
    }
    lastUnverifiedAlertAt = now;
    await bail(reason, detail);
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
    await refuse("request had no x-paystack-signature header");
    return;
  }

  // Verify HMAC-SHA512 signature
  const expectedHash = crypto.createHmac("sha512", secretKey).update(rawBody).digest("hex");

  const sigBuf = Buffer.from(signature, "hex");
  const expBuf = Buffer.from(expectedHash, "hex");
  const sigMatch = sigBuf.length === expBuf.length && crypto.timingSafeEqual(expBuf, sigBuf);

  if (!sigMatch) {
    await refuse(
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

  // Quote stage payments carry metadata.kind = "quote". They are settled by
  // the quote service, which re-fetches the transaction from Paystack rather
  // than trusting this payload, and uses lock documents so the webhook, the
  // return page and polling record each payment exactly once. Unlike the
  // invoice path, a transient failure answers 500 so Paystack retries.
  if (metadata.kind === "quote") {
    try {
      const result = await quoteService.handleQuoteCharge(data.reference);
      if (result.state === "unknown") {
        await bail("quote payment reference not found", `reference: ${data.reference || "none"}`);
        return;
      }
      // "pending" is not final: a settle-lock loser can return it while another
      // caller is still working; Paystack or the return page will complete it.
      context.log.info(`paystack-webhook: quote payment ${data.reference} → ${result.state}`);
      ok();
    } catch (err) {
      context.log.error(`paystack-webhook: quote payment ${data.reference} failed: ${err.message}`);
      context.res = { status: 500, headers: CORS, body: JSON.stringify({ error: "retry" }) };
    }
    return;
  }

  // Extract invoice number from metadata or parse from reference (PAY-INV-XXXXXX-timestamp)
  const invoiceNumber =
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

      // Paystack retries a webhook whenever it does not get a 2xx, and can
      // deliver the same event more than once regardless. Without this, a
      // retry wrote a second payments row and mailed the client a second
      // "payment received" confirmation.
      const reference = data.reference || "";
      if (reference) {
        const seen = await db.listDocuments(DATABASE_ID, PAYMENTS_COLLECTION_ID, [
          sdk.Query.equal("paystackReference", [reference]),
        ]);
        if (seen.documents && seen.documents.length > 0) {
          context.log.info(
            `paystack-webhook: reference ${reference} already recorded — ignoring duplicate delivery`,
          );
          ok();
          return;
        }
      }

      const result = await db.listDocuments(DATABASE_ID, COLLECTION_ID, [
        sdk.Query.equal("invoiceNumber", [invoiceNumber]),
      ]);

      if (result.documents && result.documents.length > 0) {
        const doc = result.documents[0];

        const clientName = doc.clientName || "Client";
        const clientEmail = doc.clientEmail;

        /*
         * Verify what was actually paid before closing the invoice.
         *
         * The charge amount is set in the browser — the payment components
         * hand Paystack Inline `invoice.total * 100` — so it is caller-
         * controlled and cannot be trusted here. This function previously set
         * status "paid" on any successful charge for a matching invoice
         * number, which meant a ~1 unit payment closed an invoice of any size
         * and sent the client a confirmation saying so.
         *
         * A shortfall is still recorded (the money did arrive) but leaves the
         * invoice open and raises an alert instead.
         */
        const settlement = evaluateSettlement({ amountPaid, currency, invoice: doc });
        const {
          settles,
          underpaid,
          overpaid,
          currencyMismatch,
          shortfall,
          surplus,
          knownTotal,
          expected,
          invoiceCurrency,
          paidCurrency,
        } = settlement;

        if (!knownTotal) {
          context.log.warn(
            `paystack-webhook: invoice ${invoiceNumber} has no usable total (${doc.total}) — recording the payment without verifying it`,
          );
        }

        // An invoice the admin archived can still be paid from its /pay/ link.
        // Any money received against it (a part-payment too) must not be
        // hidden, so un-archive it. archivedAt is only sent when set, so a
        // database without the column still records the payment. This
        // best-effort write never blocks the payment record below.
        const unarchive = async () => {
          try {
            await db.updateDocument(DATABASE_ID, COLLECTION_ID, doc.$id, { archivedAt: null });
          } catch (err) {
            context.log.error(
              `paystack-webhook: could not un-archive invoice ${invoiceNumber}: ${err.message}`,
            );
          }
        };
        if (settles) {
          const written = await db.updateDocument(DATABASE_ID, COLLECTION_ID, doc.$id, {
            status: "paid",
            ...(doc.archivedAt ? { archivedAt: null } : {}),
          });
          context.log.info(`paystack-webhook: invoice ${invoiceNumber} marked as paid`);
          // Still archived as written: the admin archived it between our read
          // and our write.
          if (written && written.archivedAt) await unarchive();
        } else {
          context.log.error(
            `paystack-webhook: invoice ${invoiceNumber} NOT marked paid — ` +
              (currencyMismatch
                ? `paid in ${paidCurrency} but invoiced in ${invoiceCurrency}`
                : `paid ${sym}${amountPaid.toFixed(2)} against a total of ${sym}${expected.toFixed(2)}`),
          );
          if (doc.archivedAt) await unarchive();
        }

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
            paystackReference: reference,
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
              recordFailedEmail({
                invoiceNumber,
                error: pErr.message,
                amount: `${sym}${amountPaid.toFixed(2)} ${currency}`,
                reference: data.reference || "n/a",
              }),
              context.log,
            );
          }
        }

        // Only tell the client the invoice is settled when it actually is.
        if (settles && resendKey && clientEmail) {
          await sendEmail(
            resendKey,
            fromEmail,
            clientEmail,
            `Payment received for invoice ${invoiceNumber}`,
            clientReceiptEmail({
              clientName,
              invoiceNumber,
              amount: `${sym}${amountPaid.toFixed(2)} ${currency}`,
            }),
            context.log,
          );
        }

        // Send notification to admin
        if (resendKey && adminEmail) {
          const problem = currencyMismatch
            ? {
                tone: "danger",
                text: `Currency mismatch. Paid in ${paidCurrency}, invoiced in ${invoiceCurrency}. The invoice has been left open.`,
              }
            : underpaid
              ? {
                  tone: "danger",
                  text: `Underpaid by ${sym}${shortfall.toFixed(2)}. Expected ${sym}${expected.toFixed(2)}. The invoice has been left open and the client has not been sent a confirmation.`,
                }
              : overpaid
                ? {
                    tone: "warn",
                    text: `Overpaid by ${sym}${surplus.toFixed(2)}. The invoice has been marked paid.`,
                  }
                : null;
          await sendEmail(
            resendKey,
            fromEmail,
            adminEmail,
            settles
              ? `Payment received for invoice ${invoiceNumber}`
              : `Action needed: underpayment on invoice ${invoiceNumber}`,
            adminPaymentEmail({
              invoiceNumber,
              clientName,
              amount: `${sym}${amountPaid.toFixed(2)} ${currency}`,
              reference: reference || "n/a",
              settles,
              problem,
            }),
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

// Exposed for tests only; the Functions host calls the default export.
module.exports.emails = {
  webhookFailedEmail,
  recordFailedEmail,
  clientReceiptEmail,
  adminPaymentEmail,
};
module.exports.resetUnverifiedAlert = () => {
  lastUnverifiedAlertAt = -Infinity;
};
