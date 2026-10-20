// Every email the site sends, rendered with sample data. Drives the admin
// Emails tab and its "send me a test" button. Each entry calls the sender's
// real template builder, so a preview is exactly what the client gets.

const { SAMPLES, SAMPLE_VIEWS } = require("./samples");
const quoteEmails = require("./quoteEmails");
const booking = require("../../create-booking/index.js");
const { welcomeEmailHtml } = require("../../newsletter-signup/index.js");
const { inquiryEmail } = require("../../notify-inquiry/index.js");
const webhook = require("../../paystack-webhook/emails.js");
const { buildStatusEmail } = require("../../send-inquiry-status/index.js");
const { renderInvoiceEmail } = require("../../send-invoice/index.js");
const { buildReplyEmail } = require("../../send-message-reply/index.js");
const { newsletterEmailHtml } = require("../../send-newsletter/index.js");
const { renderPaymentConfirmation } = require("../../send-payment-confirmation/index.js");

/** Plain-text fallback for templates that only build HTML. Preview use only. */
function htmlToText(html) {
  return String(html)
    .replace(/<(style|head|script)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h[1-6]|li|table)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

const htmlOnly = (subject, html) => ({ subject, html, text: htmlToText(html) });

const bookingSample = {
  name: "Kofi Mensah",
  email: "kofi@example.com",
  phone: "+233 24 123 4567",
  label: "Discovery call",
  duration: 30,
  preferredDate: "Thursday, 15 October 2026",
  preferredTime: "10:00 AM",
  timezone: "Africa/Accra",
  message: "I'd like to talk about an online store for my crafts business.",
  platform: "Google Meet",
  joinLink: "https://meet.google.com/abc-defg-hij",
  calendarEventLink: "https://calendar.google.com/calendar/event?eid=sample",
};

// Sample failure for the webhook alert previews.
const WEBHOOK_REASON = "Cosmos rejected the update (status 503)";
const WEBHOOK_DETAIL =
  "Service Unavailable (invoice INV-2026-0042, reference PAY-INV-2026-0042-1760184000)";
const WEBHOOK_WINDOW = { mode: "live", chargedAt: Date.parse("2026-10-11T10:00:00Z") };

const invoiceSample = {
  invoiceNumber: "INV-2026-0042",
  clientName: "Kofi Mensah",
  clientEmail: "kofi@example.com",
  clientPhone: "+233241234567",
  items: [
    { description: "Website design and build", quantity: 1, unitPrice: 4500 },
    { description: "Hosting setup, 12 months", quantity: 1, unitPrice: 600 },
  ],
  currency: "GHS",
  currencySymbol: "GH₵",
  subtotal: 5100,
  tax: 0,
  taxRate: 0,
  total: 5100,
  dueDate: "2026-10-25T12:00:00.000Z",
  estimatedDelivery: "2026-11-20T12:00:00.000Z",
  notes: "Pay by card or Mobile Money from the link above.",
};

const inquiry = { status: "", clientName: "Kofi", projectType: "E-commerce Website" };
const status = (s) => () => buildStatusEmail({ ...inquiry, status: s });

const quote = (id) => () => SAMPLES[id]();

const CATALOG = [
  // To clients
  {
    id: "bookingConfirmation",
    group: "clients",
    name: "Call confirmed",
    when: "Someone books a call",
    render: () =>
      htmlOnly(
        `Your Google Meet is Confirmed for ${bookingSample.preferredDate} at ${bookingSample.preferredTime}`,
        booking.bookerConfirmationHtml(bookingSample),
      ),
  },
  {
    id: "quoteSent",
    group: "clients",
    name: "Quote ready",
    when: "You send a quote",
    render: quote("quoteSent"),
  },
  {
    id: "quoteAccepted",
    group: "clients",
    name: "Quote accepted",
    when: "The client accepts a quote",
    render: quote("quoteAccepted"),
  },
  {
    id: "paymentRequest",
    group: "clients",
    name: "Stage invoice",
    when: "You request the next payment",
    render: quote("paymentRequest"),
  },
  {
    id: "paymentReceipt",
    group: "clients",
    name: "Stage receipt",
    when: "A quote payment is confirmed",
    render: quote("paymentReceipt"),
  },
  {
    id: "maintenanceOffer",
    group: "clients",
    name: "Maintenance offer",
    when: "A week before a launched project's free support ends",
    render: quote("maintenanceOffer"),
  },
  {
    id: "accessCode",
    group: "clients",
    name: "Quote code",
    when: "A quote link is opened in a browser that is not signed in",
    render: quote("accessCode"),
  },
  {
    id: "invoiceSent",
    group: "clients",
    name: "Invoice",
    when: "You send a standalone invoice",
    render: () =>
      htmlOnly(
        `Invoice ${invoiceSample.invoiceNumber} from OceanicCoder`,
        // A throwaway secret: a preview must never carry a pay link that works.
        renderInvoiceEmail(invoiceSample, new Date("2026-10-11T12:00:00.000Z"), "email-preview"),
      ),
  },
  {
    id: "invoicePaidReceipt",
    group: "clients",
    name: "Invoice paid",
    when: "Paystack confirms an invoice payment",
    render: () =>
      htmlOnly(
        `Payment received for invoice ${invoiceSample.invoiceNumber}`,
        webhook.clientReceiptEmail({
          clientName: invoiceSample.clientName,
          invoiceNumber: invoiceSample.invoiceNumber,
          amount: "GH₵5100.00 GHS",
        }),
      ),
  },
  {
    id: "invoicePaidConfirmation",
    group: "clients",
    name: "Payment confirmation",
    when: "You mark an invoice paid by hand",
    render: () =>
      htmlOnly(
        `Your receipt from OceanicCoder – ${invoiceSample.invoiceNumber}`,
        renderPaymentConfirmation({
          invoiceNumber: invoiceSample.invoiceNumber,
          clientName: invoiceSample.clientName,
          total: invoiceSample.total,
          currency: invoiceSample.currency,
          currencySymbol: invoiceSample.currencySymbol,
          paidDate: "11 Oct 2026",
        }),
      ),
  },
  {
    id: "inquiryReviewed",
    group: "clients",
    name: "Inquiry reviewed",
    when: "You mark an inquiry Reviewed",
    render: status("reviewed"),
  },
  {
    id: "inquiryQuoted",
    group: "clients",
    name: "Inquiry quoted",
    when: "You mark an inquiry Quoted",
    render: status("quoted"),
  },
  {
    id: "inquiryWon",
    group: "clients",
    name: "Going ahead",
    when: "You mark an inquiry Won",
    render: status("won"),
  },
  {
    id: "inquiryDeclined",
    group: "clients",
    name: "Inquiry declined",
    when: "You mark an inquiry Declined",
    render: status("declined"),
  },
  {
    id: "messageReply",
    group: "clients",
    name: "Message reply",
    when: "You reply to a contact message",
    render: () => {
      const subject = "Re: Your online store";
      return {
        subject,
        ...buildReplyEmail({
          subject,
          recipientName: "Kofi",
          message:
            "Thanks for getting in touch. I'd be glad to build your store.\n\nCould we have a short call this week to go through the products and payments you need?",
        }),
      };
    },
  },
  {
    id: "newsletterWelcome",
    group: "clients",
    name: "Newsletter welcome",
    when: "Someone subscribes to the newsletter",
    render: () => htmlOnly("You're subscribed to OceanicCoder 🎉", welcomeEmailHtml()),
  },
  {
    id: "newsletterIssue",
    group: "clients",
    name: "New blog post",
    when: "You send a post to subscribers",
    render: () =>
      htmlOnly(
        "New Post: Taking payments in Ghana with Paystack",
        newsletterEmailHtml({
          title: "Taking payments in Ghana with Paystack",
          excerpt:
            "Card, Mobile Money and Apple Pay in one checkout: what I set up, and the webhook detail that saves you from double charges.",
          slug: "paystack-payments-ghana",
          category: "Engineering",
          image: "https://oceaniccoder.dev/og-image.png",
          isTest: false,
        }),
      ),
  },

  // To you
  {
    id: "inquiryReceivedAlert",
    group: "admin",
    name: "New inquiry",
    when: "Someone sends the project form",
    render: () =>
      htmlOnly(
        "New project inquiry from Kofi Mensah",
        inquiryEmail({
          name: "Kofi Mensah",
          email: "kofi@example.com",
          projectType: "E-commerce Website",
        }),
      ),
  },
  {
    id: "bookingHostNotice",
    group: "admin",
    name: "New booking",
    when: "Someone books a call",
    render: () =>
      htmlOnly(
        `New Booking: ${bookingSample.label} with ${bookingSample.name} on ${bookingSample.preferredDate} at ${bookingSample.preferredTime}`,
        booking.hostNotificationHtml(bookingSample),
      ),
  },
  {
    id: "bookingHostNoLink",
    group: "admin",
    name: "Booking without a link",
    when: "A booking saves but the calendar fails",
    render: () =>
      htmlOnly(
        `Action needed: booking with ${bookingSample.name} on ${bookingSample.preferredDate} has no meeting link`,
        booking.hostNotificationHtml({
          ...bookingSample,
          joinLink: "",
          calendarEventLink: "",
          failureReason: "Google Calendar refused the request (invalid_grant)",
        }),
      ),
  },
  {
    id: "quoteDecisionAlert",
    group: "admin",
    name: "Quote accepted",
    when: "A client accepts a quote",
    render: quote("quoteDecisionAlert"),
  },
  {
    id: "quoteDeclinedAlert",
    group: "admin",
    name: "Quote declined",
    when: "A client declines a quote",
    render: () =>
      quoteEmails.quoteDecisionAlert({
        ...SAMPLE_VIEWS.quoteDecisionAlert.view,
        decision: "declined",
        acceptedName: "",
        reason: "Over our budget for now. Could we do the store in two phases?",
      }),
  },
  {
    id: "paymentAlert",
    group: "admin",
    name: "Quote payment received",
    when: "A client pays a quote stage",
    render: quote("paymentAlert"),
  },
  {
    id: "paymentAlertProblem",
    group: "admin",
    name: "Quote payment to check",
    when: "A duplicate or mismatched quote payment",
    render: quote("paymentAlertProblem"),
  },
  {
    id: "accessLockedAlert",
    group: "admin",
    name: "Quote code locked",
    when: "Five wrong codes on one code, or fifteen on a quote link",
    render: quote("accessLockedAlert"),
  },
  {
    id: "invoicePaidAlert",
    group: "admin",
    name: "Invoice payment received",
    when: "Paystack confirms an invoice payment",
    render: () =>
      htmlOnly(
        `Payment received for invoice ${invoiceSample.invoiceNumber}`,
        webhook.adminPaymentEmail({
          invoiceNumber: invoiceSample.invoiceNumber,
          clientName: invoiceSample.clientName,
          amount: "GH₵5100.00 GHS",
          reference: "PAY-INV-2026-0042-1760184000",
          settles: true,
          problem: null,
        }),
      ),
  },
  {
    id: "invoiceRecordFailed",
    group: "admin",
    name: "Payment record failed",
    when: "An invoice is paid but the record fails to save",
    render: () =>
      htmlOnly(
        `Action needed: payment record failed for invoice ${invoiceSample.invoiceNumber}`,
        webhook.recordFailedEmail({
          invoiceNumber: invoiceSample.invoiceNumber,
          error: "Appwrite returned 503 Service Unavailable",
          amount: "GH₵5100.00 GHS",
          reference: "PAY-INV-2026-0042-1760184000",
        }),
      ),
  },
  {
    id: "webhookFailed",
    group: "admin",
    name: "Webhook not processed",
    when: "A Paystack webhook can't be processed",
    render: () =>
      htmlOnly(
        "Action needed: a Paystack webhook was not processed",
        webhook.webhookFailedEmail(
          "Signature did not match",
          "x-paystack-signature header differs from the expected HMAC",
        ),
      ),
  },
  {
    id: "webhookRetry",
    group: "admin",
    name: "Payment waiting to be recorded",
    when: "A Paystack webhook fails in a way a retry can finish",
    render: () =>
      htmlOnly(
        `Action needed: Paystack will retry a payment for invoice ${invoiceSample.invoiceNumber}`,
        webhook.webhookRetryEmail(WEBHOOK_REASON, WEBHOOK_DETAIL),
      ),
  },
  {
    id: "webhookUntracked",
    group: "admin",
    name: "Payment may need recording by hand",
    when: "A webhook fails and Cosmos can't keep track of the alert",
    render: () =>
      htmlOnly(
        `Action needed: a payment for invoice ${invoiceSample.invoiceNumber} may need recording by hand`,
        webhook.webhookUntrackedEmail(WEBHOOK_REASON, WEBHOOK_DETAIL, WEBHOOK_WINDOW),
      ),
  },
  {
    id: "webhookEscalation",
    group: "admin",
    name: "Payment still unrecorded after 24 hours",
    when: "The same payment's webhook still fails a day after its alert",
    render: () =>
      htmlOnly(
        `Action needed: a payment for invoice ${invoiceSample.invoiceNumber} is still unrecorded after 24 hours`,
        webhook.webhookEscalationEmail(WEBHOOK_REASON, WEBHOOK_DETAIL, WEBHOOK_WINDOW),
      ),
  },
  {
    id: "webhookRecordedRetry",
    group: "admin",
    name: "Recorded payment, emails unfinished",
    when: "A payment is recorded but its confirmation emails fail",
    render: () =>
      htmlOnly(
        `Paystack will retry the confirmation emails for a recorded payment on invoice ${invoiceSample.invoiceNumber}`,
        webhook.recordedRetryEmail(WEBHOOK_REASON, WEBHOOK_DETAIL),
      ),
  },
  {
    id: "webhookRecordedConflict",
    group: "admin",
    name: "Recorded payment, receipt not sent",
    when: "A recorded payment's invoice is renumbered or deleted before its receipt",
    render: () =>
      htmlOnly(
        `Action needed: receipt not sent for a recorded payment on invoice ${invoiceSample.invoiceNumber}`,
        webhook.recordedConflictEmail(
          "the invoice this payment was applied to was renumbered or deleted",
          WEBHOOK_DETAIL,
        ),
      ),
  },
  {
    id: "webhookInvalidSetting",
    group: "admin",
    name: "Webhooks failing on a setting",
    when: "DATA_BACKEND or WRITE_HOLD has an invalid value",
    render: () =>
      htmlOnly(
        "Action needed: WRITE_HOLD has an invalid value; payments are not being recorded",
        webhook.invalidSettingEmail(
          "WRITE_HOLD",
          'WRITE_HOLD must be "1" or "0", not "true"',
          "live",
        ),
      ),
  },
];

const BY_ID = new Map(CATALOG.map((e) => [e.id, e]));

function findEmail(id) {
  return (typeof id === "string" && BY_ID.get(id)) || null;
}

module.exports = { CATALOG, findEmail, htmlToText };
