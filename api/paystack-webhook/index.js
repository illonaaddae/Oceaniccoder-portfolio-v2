/* global require, module, Buffer */
// POST /api/paystack-webhook
// Handles Paystack payment webhook events.
// Verifies signature using PAYSTACK_SECRET_KEY, updates invoice status in Appwrite
// (or Cosmos when DATA_BACKEND=cosmos, see invoiceCharge.js), and sends
// confirmation emails via Resend.
// Answers 200 for anything a retry would not fix. Answers 500 for a failure a
// retry can finish (quote payments, the Cosmos invoice branch) or one that
// fixing a setting will (an invalid DATA_BACKEND or WRITE_HOLD), and 503
// while WRITE_HOLD is on, because Paystack retries any non-2xx.

const crypto = require("crypto");
const https = require("https");
const sdk = require("node-appwrite");
const { evaluateSettlement } = require("./settlement");
const quoteService = require("../shared/quotes/service");
const cosmos = require("../shared/cosmos");
const { dataBackend, writeHold } = require("../shared/backend");
const { createCosmosInvoiceStore } = require("../shared/invoices/store.cosmos");
const { createCosmosLocks } = require("../shared/locks");
const {
  recordInvoiceCharge,
  claimRetryAlert,
  releaseRetryAlert,
  claimEscalation,
  releaseEscalation,
  noteAlertRecorded,
} = require("./invoiceCharge");
const {
  currencySymbol,
  webhookFailedEmail,
  webhookRetryEmail,
  webhookUntrackedEmail,
  recordedRetryEmail,
  recordedConflictEmail,
  webhookEscalationEmail,
  invalidSettingEmail,
  recordFailedEmail,
  clientReceiptEmail,
  adminPaymentEmail,
} = require("./emails");

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

// A hung Resend request must not hold a run open: the Cosmos branch claims
// the emails for NOTIFY_CLAIM_MS (2 minutes), and a run must finish well
// inside that.
const EMAIL_TIMEOUT_MS = 10 * 1000;

// Paystack retries a failed webhook for this long after the charge.
const RETRY_WINDOW_MS = 72 * 60 * 60 * 1000;

/** When Paystack says the charge was made, in ms, or NaN if it does not. */
function chargeTime(data) {
  const raw = [data.paid_at, data.paidAt, data.created_at, data.createdAt].find(
    (value) => typeof value === "string" && value,
  );
  return raw ? Date.parse(raw) : NaN;
}

// Paystack signs with HMAC-SHA512 and sends the digest as hex.
const SIGNATURE_FORMAT = /^[0-9a-f]{128}$/i;

// Alerts this process has mailed, or is mailing, where Cosmos cannot keep
// track: an invalid DATA_BACKEND (it fails every delivery the same way until
// someone fixes the setting) and a reference whose claim could not be
// recorded. Added before the send so concurrent invocations mail once;
// removed if the send fails, so a later attempt mails.
const processAlerts = new Set();
const claimInProcess = (key) => {
  if (processAlerts.has(key)) return false;
  processAlerts.add(key);
  return true;
};

/**
 * Sends an alert only when `claim` wins, and gives the claim back if the send
 * fails so a later attempt can mail instead. Without that, a Resend outage or
 * timeout would use up the one alert and nobody would hear.
 *
 * At most one claim is held at a time, but delivery is at-least-once: a send
 * that times out after Resend accepted it counts as failed, so the next retry
 * can mail the same alert again. A duplicate alert beats a silent one.
 * Resolves true when the alert was sent.
 */
async function alertOnce({ claim, release, send, log }) {
  if (!(await claim())) return false;
  if (await send()) return true;
  try {
    await release();
  } catch (err) {
    log.error(
      `paystack-webhook: could not give back the alert claim, so later attempts will not email: ${err.message}`,
    );
  }
  return false;
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
    req.setTimeout(EMAIL_TIMEOUT_MS, () => {
      req.destroy(new Error(`no response from ${hostname} in ${EMAIL_TIMEOUT_MS / 1000}s`));
    });
    req.write(data);
    req.end();
  });
}

/** True when Resend accepted the email (2xx). A failure is logged, never thrown. */
async function sendEmail(apiKey, fromEmail, to, subject, html, log) {
  try {
    const { status } = await httpsPost(
      "api.resend.com",
      "/emails",
      { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      { from: `OceanicCoder <${fromEmail}>`, to: [to], subject, html },
    );
    if (status >= 200 && status < 300) return true;
    if (log) log.warn("Email send failed:", `Resend answered ${status}`);
    return false;
  } catch (err) {
    if (log) log.warn("Email send failed:", err.message);
    return false;
  }
}

// Paystack channel: "card", "mobile_money", "bank", "bank_transfer",
// "apple_pay", etc. Apple Pay is checked first — it is a card wallet, so if
// Paystack ever reports it as a card variant the substring match on "apple"
// still wins and we keep the distinction in reporting.
function paymentMethod(rawChannel) {
  const channel = (rawChannel || "").toLowerCase();
  if (channel.includes("apple")) return "apple_pay";
  if (channel.includes("mobile")) return "momo";
  if (channel.includes("bank")) return "bank";
  return "card";
}

/**
 * The client receipt (only when the invoice settles) and the admin notice for
 * a recorded payment. Sending is best effort, as sendEmail logs and swallows a
 * failure, so this never throws for a Resend problem.
 */
async function sendPaymentEmails(
  { invoiceNumber, clientName, clientEmail, amountPaid, currency, reference, settlement },
  { resendKey, fromEmail, adminEmail, log },
) {
  const {
    settles,
    underpaid,
    overpaid,
    currencyMismatch,
    shortfall,
    surplus,
    expected,
    invoiceCurrency,
    paidCurrency,
  } = settlement;
  const sym = currencySymbol(currency);

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
      log,
    );
  }

  // Send notification to admin
  if (resendKey && adminEmail) {
    const problem = currencyMismatch
      ? {
          tone: "danger",
          text: `Currency mismatch. Paid in ${paidCurrency}, invoiced in ${invoiceCurrency}. The invoice has been left open.`,
        }
      : settlement.unverifiedTotal
        ? {
            tone: "danger",
            text: "The invoice has no usable total, so this payment could not be checked against it. The invoice has been left open and the client has not been sent a confirmation.",
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
        : currencyMismatch
          ? `Action needed: currency mismatch on invoice ${invoiceNumber}`
          : settlement.unverifiedTotal
            ? `Action needed: payment on invoice ${invoiceNumber} could not be checked`
            : `Action needed: underpayment on invoice ${invoiceNumber}`,
      adminPaymentEmail({
        invoiceNumber,
        clientName,
        amount: `${sym}${amountPaid.toFixed(2)} ${currency}`,
        reference: reference || "n/a",
        settles,
        problem,
      }),
      log,
    );
  }
}

/**
 * Tells the admin about a retryable failure on the Cosmos invoice branch:
 * one email per reference, claimed through the alert lock, and one
 * escalation if the same payment still fails a day after that. When Cosmos
 * cannot record the claim, the alert is claimed in this process instead, so
 * it still goes (once per process), but nothing can send the follow-up: that
 * email says so and gives Paystack's deadline. Resolves which email went:
 * "retry", "untracked", "recorded", "escalation" or null.
 */
async function alertRetryableFailure({
  store,
  reference,
  invoiceNumber,
  recorded,
  reason,
  detail,
  chargedAt,
  mail,
  log,
}) {
  const alert = { store, reference, invoiceNumber, recorded, log };
  let tracked = true;
  const processKey = `alert:${reference}`;
  let claimedInCosmos = false;
  // The alert lock was already taken by an earlier failure.
  let alertedBefore = false;
  const sent = await alertOnce({
    claim: async () => {
      try {
        if (!store) throw new Error("the invoice store could not be opened");
        alert.locks = createCosmosLocks(cosmos.getDatabase());
        claimedInCosmos = await claimRetryAlert(alert);
        alertedBefore = !claimedInCosmos;
        return claimedInCosmos;
      } catch (claimErr) {
        log.error(`paystack-webhook: could not record the alert: ${claimErr.message}`);
        tracked = false;
        return claimInProcess(processKey);
      }
    },
    release: async () =>
      claimedInCosmos ? releaseRetryAlert(alert) : processAlerts.delete(processKey),
    send: () => {
      if (recorded) {
        return mail(
          `Paystack will retry the confirmation emails for a recorded payment on invoice ${invoiceNumber}`,
          recordedRetryEmail(reason, detail),
        );
      }
      if (!tracked) {
        return mail(
          `Action needed: a payment for invoice ${invoiceNumber} may need recording by hand`,
          webhookUntrackedEmail(reason, detail, chargedAt + RETRY_WINDOW_MS),
        );
      }
      return mail(
        `Action needed: Paystack will retry a payment for invoice ${invoiceNumber}`,
        webhookRetryEmail(reason, detail),
      );
    },
    log,
  });
  if (sent) return recorded ? "recorded" : tracked ? "retry" : "untracked";

  if (!alertedBefore) return null;
  // A recorded payment is not lost when the retries run out, so it is not
  // escalated, now or by a later delivery that cannot see the payments row.
  if (recorded) {
    try {
      await noteAlertRecorded(alert);
    } catch (noteErr) {
      log.error(
        `paystack-webhook: could not note the recorded payment on the alert: ${noteErr.message}`,
      );
    }
    return null;
  }
  const escalated = await alertOnce({
    claim: async () => {
      try {
        return await claimEscalation(alert);
      } catch (claimErr) {
        log.error(`paystack-webhook: could not record the escalation: ${claimErr.message}`);
        return false;
      }
    },
    release: () => releaseEscalation(alert),
    send: () =>
      mail(
        `Action needed: a payment for invoice ${invoiceNumber} is still unrecorded after 24 hours`,
        webhookEscalationEmail(reason, detail),
      ),
    log,
  });
  return escalated ? "escalation" : null;
}

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: CORS, body: "" };
    return;
  }

  // Acknowledged: Paystack stops retrying. Used for success and for failures a
  // retry would not fix.
  const ok = () => {
    context.res = { status: 200, headers: CORS, body: JSON.stringify({ received: true }) };
  };

  // Read email config up front so a bail-out can still report itself. Previously
  // these were read below the signature checks, so an early return told nobody.
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "invoices@send.oceaniccoder.dev";
  const adminEmail = process.env.RESEND_TO_EMAIL;

  /**
   * Abandon processing, but tell someone first, and answer 200 because a
   * retry would not help. Retryable failures (the Cosmos branch) answer 500
   * and send webhookRetryEmail instead.
   *
   * The failure paths here used to leave only a log line. The result was a
   * real charge where the invoice stayed "sent", no payment record was
   * written and no email went out, with nothing anywhere to say why. Money
   * moves through this function; it must not fail quietly.
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
  const retry = () => {
    context.res = { status: 500, headers: CORS, body: JSON.stringify({ error: "retry" }) };
  };

  /**
   * A server setting with a value the code refuses fails every delivery
   * until it is fixed. Answer 500 so Paystack retries, and mail the admin
   * once per process: one email per refused webhook would flood the inbox.
   */
  const refuseInvalidSetting = async (setting, err) => {
    context.log.error(`paystack-webhook: ${setting} is not valid — ${err.message}`);
    if (resendKey && adminEmail) {
      await alertOnce({
        claim: async () => claimInProcess(setting),
        release: async () => processAlerts.delete(setting),
        send: () =>
          sendEmail(
            resendKey,
            fromEmail,
            adminEmail,
            `Action needed: ${setting} has an invalid value; payments are not being recorded`,
            invalidSettingEmail(setting, err.message),
            context.log,
          ),
        log: context.log,
      });
    }
    retry();
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

  // Anyone can POST here, so check the shape of what is about to be hashed:
  // an absent body made the HMAC throw, and the request crashed the function.
  if (typeof signature !== "string" || !SIGNATURE_FORMAT.test(signature)) {
    await bail(
      "signature verification failed",
      "the x-paystack-signature header is not a SHA-512 hex digest. Treat it as an unverified request and ignore it.",
    );
    return;
  }
  if (typeof rawBody !== "string" || !rawBody) {
    await bail(
      "request had no body to verify the signature against",
      "Treat it as an unverified request and ignore it.",
    );
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

  // The data is being moved between databases. Paystack retries any non-2xx,
  // so nothing is lost: the charge is recorded once the hold is lifted. Checked
  // after the signature so a misconfigured key still raises its alert now.
  // An invalid value throws; it is refused like an invalid DATA_BACKEND, with
  // one alert, before anything is processed.
  let held;
  try {
    held = writeHold();
  } catch (err) {
    await refuseInvalidSetting("WRITE_HOLD", err);
    return;
  }
  if (held) {
    context.log.warn("paystack-webhook: WRITE_HOLD is on — answering 503 so Paystack retries");
    context.res = { status: 503, headers: CORS, body: JSON.stringify({ error: "write hold" }) };
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

  // Checked before the quote branch too: the quote service reads the same
  // setting and would only throw, so a quote charge would fail without an
  // alert.
  let backend;
  try {
    backend = dataBackend();
  } catch (err) {
    await refuseInvalidSetting("DATA_BACKEND", err);
    return;
  }

  // The reference keys the quote settle locks and the Cosmos rows and holds
  // the invoice number, so it is read as a string; anything else counts as
  // no reference.
  if (data.reference != null && typeof data.reference !== "string") {
    context.log.warn(
      `paystack-webhook: charge has a reference that is not a string (${typeof data.reference}) — treating it as none`,
    );
  }
  const reference = typeof data.reference === "string" ? data.reference : "";

  // Quote stage payments carry metadata.kind = "quote". They are settled by
  // the quote service, which re-fetches the transaction from Paystack rather
  // than trusting this payload, and uses lock documents so the webhook, the
  // return page and polling record each payment exactly once. A transient
  // failure answers 500 so Paystack retries, as on the Cosmos invoice path
  // (the Appwrite invoice path answers 200).
  if (metadata.kind === "quote") {
    if (!reference) {
      await bail("quote payment has no Paystack reference");
      return;
    }
    try {
      const result = await quoteService.handleQuoteCharge(reference);
      if (result.state === "unknown") {
        await bail("quote payment reference not found", `reference: ${reference}`);
        return;
      }
      // "pending" is not final: a settle-lock loser can return it while another
      // caller is still working; Paystack or the return page will complete it.
      context.log.info(`paystack-webhook: quote payment ${reference} → ${result.state}`);
      ok();
    } catch (err) {
      context.log.error(`paystack-webhook: quote payment ${reference} failed: ${err.message}`);
      retry();
    }
    return;
  }

  // Extract invoice number from metadata or parse from reference
  // (PAY-INV-XXXXXX-timestamp). Metadata is whatever the browser sent, so
  // anything but a string is ignored: an object or array would reach the
  // invoice query as a value.
  const invoiceNumber =
    (typeof metadata.invoiceNumber === "string" && metadata.invoiceNumber) ||
    (reference && reference.replace(/^(?:PAY|OC)-/, "").replace(/-\d+$/, ""));

  if (!invoiceNumber) {
    await bail(
      "could not determine which invoice this payment belongs to",
      `reference: ${reference || "none"}`,
    );
    return;
  }

  const amountPaid = (data.amount || 0) / 100; // convert from pesewas back to base unit
  const currency = data.currency || "GHS";
  const sym = currencySymbol(currency);

  if (backend === "cosmos") {
    // The Cosmos rows are keyed by reference; Paystack always sends one.
    if (!reference) {
      await bail("payment has no Paystack reference", `invoice ${invoiceNumber}`);
      return;
    }
    let store;
    try {
      store = createCosmosInvoiceStore(cosmos.getDatabase());
      const { outcome, recorded } = await recordInvoiceCharge({
        store,
        charge: {
          reference,
          invoiceNumber,
          amountPaid,
          currency,
          method: paymentMethod(data.channel),
        },
        sendEmails: (payment) =>
          sendPaymentEmails(payment, { resendKey, fromEmail, adminEmail, log: context.log }),
        log: context.log,
      });
      if (outcome === "no-invoice") {
        await bail(
          "no invoice matches this payment",
          `looked for invoiceNumber "${invoiceNumber}", amount ${sym}${amountPaid.toFixed(2)} ${currency}, reference ${reference}`,
        );
        return;
      }
      if (outcome === "ambiguous-invoice") {
        await bail(
          "more than one invoice has this number, so none was marked",
          `invoiceNumber "${invoiceNumber}", amount ${sym}${amountPaid.toFixed(2)} ${currency}, reference ${reference}`,
        );
        return;
      }
      if (outcome === "conflict" && recorded) {
        const reason = "the invoice this payment was applied to was renumbered or deleted";
        const detail = `invoiceNumber "${invoiceNumber}", amount ${sym}${amountPaid.toFixed(2)} ${currency}, reference ${reference}`;
        context.log.error(`paystack-webhook: ${reason} — ${detail}`);
        if (resendKey && adminEmail) {
          await sendEmail(
            resendKey,
            fromEmail,
            adminEmail,
            `Action needed: receipt not sent for a recorded payment on invoice ${invoiceNumber}`,
            recordedConflictEmail(reason, detail),
            context.log,
          );
        }
        ok();
        return;
      }
      if (outcome === "conflict") {
        await bail(
          "the payments row for this reference belongs to another charge or was edited by hand, or its invoice was renumbered or deleted, so nothing was changed",
          `invoiceNumber "${invoiceNumber}", amount ${sym}${amountPaid.toFixed(2)} ${currency}, reference ${reference}`,
        );
        return;
      }
      // Another delivery is mid-way through the emails; the retry finds them
      // sent.
      if (outcome === "busy") {
        retry();
        return;
      }
      ok();
    } catch (err) {
      // Every step is recorded on the payments row, so the retry resumes here.
      const reason =
        typeof err?.code === "number"
          ? `Cosmos rejected the update (status ${err.code})`
          : "the payment could not be recorded";
      const detail = `${err.message} (invoice ${invoiceNumber}, reference ${reference})`;
      context.log.error(`paystack-webhook: ${reason}; Paystack will retry — ${detail}`);
      // Claim only when an email can go: a claim with no email would use up
      // the one alert for this reference.
      if (resendKey && adminEmail) {
        const alerted = await alertRetryableFailure({
          store,
          reference,
          invoiceNumber,
          recorded: Boolean(err?.paymentRecorded),
          reason,
          detail,
          chargedAt: chargeTime(data),
          mail: (subject, html) =>
            sendEmail(resendKey, fromEmail, adminEmail, subject, html, context.log),
          log: context.log,
        });
        if (alerted)
          context.log.info(`paystack-webhook: sent the ${alerted} alert for ${reference}`);
      }
      retry();
    }
    return;
  }

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
        const { settles, currencyMismatch, knownTotal, expected, invoiceCurrency, paidCurrency } =
          settlement;

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
          await db.createDocument(DATABASE_ID, PAYMENTS_COLLECTION_ID, sdk.ID.unique(), {
            invoiceNumber,
            clientName,
            clientEmail: clientEmail || "",
            amount: amountPaid,
            currency,
            method: paymentMethod(data.channel),
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
                reference: reference || "n/a",
              }),
              context.log,
            );
          }
        }

        await sendPaymentEmails(
          { invoiceNumber, clientName, clientEmail, amountPaid, currency, reference, settlement },
          { resendKey, fromEmail, adminEmail, log: context.log },
        );
      } else {
        await bail(
          "no invoice matches this payment",
          `looked for invoiceNumber "${invoiceNumber}", amount ${sym}${amountPaid.toFixed(2)} ${currency}, reference ${reference || "none"}`,
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
