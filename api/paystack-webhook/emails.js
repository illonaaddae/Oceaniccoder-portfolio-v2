// Email bodies for the Paystack webhook, built on the shared kit so every
// value is escaped. Invoice numbers and references come from the Paystack
// payload and error messages from the database, so none of them is trusted
// as HTML.

const { shell, heading, p, card, notice, small } = require("../shared/email/ui");

const currencySymbol = (currency) => (currency === "GHS" ? "₵" : currency);

// How long Paystack retries a webhook that fails
// (paystack.com/docs/payments/webhooks): in live mode every 3 minutes for the
// first 4 tries, then hourly for the next 72 hours; in test mode hourly for
// 10 hours. The deadlines below count from the charge time, which is a
// little before the first delivery, so they come out slightly early: the
// safe side for "record it by hand by then".
const RETRY_WINDOWS = {
  live: {
    ms: 72 * 60 * 60 * 1000,
    charge:
      "In live mode Paystack keeps retrying for about 72 hours after the first failed delivery",
    each: "In live mode Paystack keeps retrying each charge for about 72 hours after its first failed delivery.",
  },
  test: {
    ms: 10 * 60 * 60 * 1000,
    charge: "In test mode Paystack retries hourly for about 10 hours",
    each: "In test mode Paystack retries each charge hourly for about 10 hours.",
  },
};

const formatUtc = (ms) => `${new Date(ms).toISOString().slice(0, 16).replace("T", " ")} UTC`;

/**
 * How long Paystack keeps retrying one charge, as a sentence for an email.
 * `mode` is the charge's data.domain ("live" or "test"); `chargedAt` is
 * when it was made, in ms. Without a known mode there is no time to give.
 */
function retryWindowText({ mode, chargedAt } = {}) {
  const window = RETRY_WINDOWS[mode];
  if (!window) {
    return "The webhook did not say whether the charge was in live or test mode, so check in the Paystack dashboard how long Paystack keeps retrying it (about 72 hours in live mode, about 10 hours in test mode).";
  }
  if (!Number.isFinite(chargedAt)) {
    return `${window.charge}. The webhook did not give a usable charge time, so check when the charge was made in the Paystack dashboard.`;
  }
  return `${window.charge}, so until about ${formatUtc(chargedAt + window.ms)}.`;
}

/** The same for every charge at once, by the mode of the secret key. */
function retryLengthText(mode) {
  return (
    RETRY_WINDOWS[mode]?.each ??
    "Paystack keeps retrying each charge for about 72 hours in live mode and about 10 hours in test mode."
  );
}

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

// For a failure Paystack's retry will finish. Unlike webhookFailedEmail it
// must not suggest marking the invoice paid by hand while Paystack retries:
// the retry records the payment anyway, and a hand-marked invoice would get
// a second receipt. Only live mode retries long enough for the 24-hour
// follow-up (webhookEscalationEmail), so only live mode promises it; test
// and unknown modes give the deadline here instead. `window` is
// { mode, chargedAt }, see retryWindowText.
function webhookRetryEmail(reason, detail, window) {
  const live = window?.mode === "live";
  return shell({
    preview: `Paystack webhook will be retried: ${reason}`,
    reason: ADMIN_REASON,
    body:
      heading({
        eyebrow: "Webhook will be retried",
        tone: "warn",
        title: "A Paystack payment is waiting to be recorded",
        intro:
          "A Paystack webhook arrived but could not be processed yet. Paystack will retry it, and the payment will be recorded automatically when a retry succeeds.",
      }) +
      notice({
        tone: "danger",
        text: live
          ? "Do not mark the invoice paid by hand. The retry records the payment and emails the client; marking it by hand as well sends a second receipt."
          : "Do not mark the invoice paid by hand while Paystack is still retrying. A retry that succeeds records the payment and emails the client; marking it by hand as well sends a second receipt.",
      }) +
      notice({
        tone: "warn",
        text: live
          ? retryWindowText(window)
          : `${retryWindowText(window)} No follow-up email will come, so before then check the Payments tab or the Paystack dashboard; if the payment is still not recorded, record the payment by hand.`,
      }) +
      notice({ tone: "warn", text: `Reason: ${reason}` }) +
      (detail ? p(`Detail: ${detail}`) : "") +
      small(
        live
          ? "This email is sent once per payment. Later attempts are only logged, and one more email follows if the payment is still failing 24 hours from now."
          : "This email is sent once per payment. Later attempts are only logged.",
      ),
  });
}

// webhookRetryEmail for when Cosmos could not record the alert claim, so it
// was claimed in this process only. Nothing can send the 24-hour follow-up,
// so this one email has to give the deadline itself. `window` is
// { mode, chargedAt }, see retryWindowText.
function webhookUntrackedEmail(reason, detail, window) {
  return shell({
    preview: `Paystack payment may need recording by hand: ${reason}`,
    reason: ADMIN_REASON,
    body:
      heading({
        eyebrow: "Webhook will be retried",
        tone: "danger",
        title: "A Paystack payment is waiting to be recorded",
        intro:
          "A Paystack webhook arrived but could not be processed yet. Paystack will retry it, and a retry that succeeds records the payment automatically.",
      }) +
      notice({
        tone: "danger",
        text: `Cosmos could not keep track of this alert, so no follow-up email will come. ${retryWindowText(window)} Before then, check the Payments tab or the Paystack dashboard; if the payment is still not recorded, record the payment by hand.`,
      }) +
      notice({ tone: "warn", text: `Reason: ${reason}` }) +
      (detail ? p(`Detail: ${detail}`) : "") +
      small(
        "Recording it by hand before then risks a second receipt if a retry succeeds. This email is sent once per payment (per running function instance).",
      ),
  });
}

// The one follow-up to webhookRetryEmail, when the same payment still fails a
// day later. Sent in live mode only (test-mode retries stop after about 10
// hours), so the deadline it gives is still ahead. This is the point to look
// into it and be ready to record the payment by hand.
function webhookEscalationEmail(reason, detail, window) {
  return shell({
    preview: `Paystack payment still unrecorded after 24 hours: ${reason}`,
    reason: ADMIN_REASON,
    body:
      heading({
        eyebrow: "Webhook still failing",
        tone: "danger",
        title: "A Paystack payment is still not recorded",
        intro: `Paystack's retries for this payment are still failing 24 hours after the first alert. ${retryWindowText(window)} After that the payment is not delivered again.`,
      }) +
      notice({ tone: "danger", text: `Reason: ${reason}` }) +
      (detail ? p(`Detail: ${detail}`) : "") +
      p(
        "Check the function logs for the cause and fix it, so a remaining retry can record the payment. If it cannot be fixed before the retries run out, record the payment by hand from the Paystack dashboard.",
      ) +
      small(
        "If you record it by hand and a retry later succeeds, the client gets a second receipt. This is the last email about this payment; later attempts are only logged.",
      ),
  });
}

// For a failure after the payment row and the invoice change were written,
// while finishing the confirmation emails. Nothing is waiting to be
// recorded, so it must not say so. `tracked` is false when the alert could
// only be claimed in this process, so another instance may send it again.
function recordedRetryEmail(reason, detail, { tracked = true } = {}) {
  return shell({
    preview: `Paystack will retry the confirmation emails: ${reason}`,
    reason: ADMIN_REASON,
    body:
      heading({
        eyebrow: "Webhook will be retried",
        tone: "warn",
        title: "A payment is recorded but its emails are unfinished",
        intro:
          "The payment is recorded and the invoice updated. What failed came after, while finishing the confirmation emails: reading the invoice back, sending them, or saving that they were sent.",
      }) +
      notice({
        tone: "warn",
        text: "Paystack will retry the webhook, and the retry sends any confirmation not yet saved as sent, so the client may get the receipt twice. Nothing needs recording by hand.",
      }) +
      notice({ tone: "warn", text: `Reason: ${reason}` }) +
      (detail ? p(`Detail: ${detail}`) : "") +
      small(
        tracked
          ? "This email is sent once per payment. Later attempts are only logged."
          : "This email is sent once per payment per running function instance. Later attempts are only logged.",
      ),
  });
}

// For a payment applied to its invoice whose emails were not sent because the
// invoice has since been renumbered or deleted. The money is recorded, so it
// must not say the payment may be unrecorded.
function recordedConflictEmail(reason, detail) {
  return shell({
    preview: `Receipt not sent for a recorded payment: ${reason}`,
    reason: ADMIN_REASON,
    body:
      heading({
        eyebrow: "Receipt not sent",
        tone: "warn",
        title: "A payment is recorded but its receipt was not sent",
        intro:
          "The payment is recorded and its invoice was updated, but the invoice has since been renumbered or deleted, so the confirmation emails were not sent.",
      }) +
      notice({ tone: "warn", text: `Reason: ${reason}` }) +
      (detail ? p(`Detail: ${detail}`) : "") +
      small(
        "Nothing needs recording by hand. Send the client a receipt yourself if they need one.",
      ),
  });
}

// For an invalid DATA_BACKEND or WRITE_HOLD, which fails every delivery
// until the setting is fixed. Charges whose retries run out before then are
// not delivered again and must be recorded by hand. `mode` is the mode of
// the secret key, as no single charge decides it.
function invalidSettingEmail(setting, detail, mode) {
  return shell({
    preview: `Paystack webhooks are failing: ${setting} is not valid`,
    reason: ADMIN_REASON,
    body:
      heading({
        eyebrow: "Webhooks failing",
        tone: "danger",
        title: "Paystack payments are not being recorded",
        intro: `${setting} is not valid, so every Paystack webhook is refused and Paystack will retry it.`,
      }) +
      notice({
        tone: "danger",
        text: `Fix ${setting} in the Static Web App configuration soon. ${retryLengthText(mode)} Charges whose retries run out before the fix are lost and must be recorded by hand.`,
      }) +
      notice({ tone: "warn", text: `Detail: ${detail}` }) +
      p(
        `Once it is fixed, the next retries record the payments automatically; do not mark those invoices paid by hand. To find the affected charges, look in the Paystack dashboard for webhooks that failed since this email, and in the function logs for "${setting} is not valid".`,
      ) +
      small(
        "This email is sent once while the setting is wrong (per running function instance). Every refused webhook is still logged.",
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

module.exports = {
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
};
