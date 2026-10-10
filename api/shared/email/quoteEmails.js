// Quote and payment emails. Each takes a pre-formatted view model from
// api/shared/quotes/views.js and returns { subject, html, text }.

const { shell, heading, card, button, buttons, steps, notice, small, lines } = require("./ui");

const CLIENT_REASON = "OceanicCoder · Web and app development";
const ADMIN_REASON = "Sent to you as the OceanicCoder admin.";

function invoiceBlock(inv) {
  return card({
    title: `Invoice ${inv.invoiceNumber}`,
    highlightLabel: inv.label,
    highlight: inv.amount,
    rows: [["Due", inv.dueDate]],
  });
}

function quoteSent(v) {
  const updated = v.revision > 1;
  const subject = `${updated ? "Updated quote" : "Your quote"} from OceanicCoder: ${v.title}`;
  const html = shell({
    preview: `Quote ${v.quoteNumber} for ${v.title}, ${v.total}`,
    reason: CLIENT_REASON,
    body:
      heading({
        eyebrow: updated ? "Updated quote" : "Your quote",
        title: v.title,
        intro: `Hi ${v.clientFirstName}, here is ${updated ? "the updated" : "your"} quote. It covers the scope, timeline and payment plan.`,
      }) +
      card({
        title: `Quote ${v.quoteNumber}`,
        highlightLabel: "Total",
        highlight: v.total,
        rows: [
          ["Payment plan", v.planSummary],
          ["Valid until", v.validUntil],
        ],
      }) +
      buttons(button({ href: v.link, label: "View your quote" })) +
      steps([
        "Open the quote and read the scope and terms",
        "Accept it by typing your name",
        "Pay the deposit to book your slot",
      ]) +
      small("Questions? Reply to this email."),
  });
  const text = lines(
    `Hi ${v.clientFirstName},`,
    `Here is ${updated ? "the updated" : "your"} quote for ${v.title} (${v.quoteNumber}).`,
    `Total: ${v.total}`,
    `Payment plan: ${v.planSummary}`,
    `Valid until: ${v.validUntil}`,
    `View and accept it here: ${v.link}`,
    "Questions? Reply to this email.",
  );
  return { subject, html, text };
}

function quoteAccepted(v) {
  // v.invoice is null when the quote has no payment stages; the invoice card,
  // pay button and invoice lines are then left out.
  const inv = v.invoice;
  const subject = inv
    ? `Quote accepted: your deposit invoice for ${v.title}`
    : `Quote accepted: ${v.title}`;
  const html = shell({
    preview: inv
      ? `Thanks ${v.clientFirstName}. Your deposit invoice is ready.`
      : `Thanks ${v.clientFirstName}. We have your acceptance.`,
    reason: CLIENT_REASON,
    body:
      heading({
        eyebrow: "Quote accepted",
        tone: "ok",
        title: "Thank you, we're on",
        intro: `Hi ${v.clientFirstName}, you accepted quote ${v.quoteNumber} as ${v.acceptedName}. ${
          inv ? "The next step is the deposit." : "We'll be in touch with the next steps."
        }`,
      }) +
      (inv
        ? invoiceBlock(inv) +
          buttons(
            button({ href: inv.payLink, label: "Pay the deposit" }),
            button({ href: inv.invoiceLink, label: "View invoice", variant: "secondary" }),
          )
        : "") +
      steps([
        "Pay the deposit",
        "We schedule the work and keep you updated",
        "Later stages are invoiced as the project reaches them",
      ]) +
      small(`Your quote stays available at ${v.link}`),
  });
  const text = lines(
    `Hi ${v.clientFirstName},`,
    `You accepted quote ${v.quoteNumber} as ${v.acceptedName}. Thank you.`,
    inv ? `Deposit invoice ${inv.invoiceNumber}: ${inv.amount}, due ${inv.dueDate}.` : "",
    inv ? `Pay here: ${inv.payLink}` : "",
    inv ? `Invoice: ${inv.invoiceLink}` : "",
    `Your quote: ${v.link}`,
  );
  return { subject, html, text };
}

function quoteDecisionAlert(v) {
  const accepted = v.decision === "accepted";
  const subject = `${accepted ? "Accepted" : "Declined"}: ${v.quoteNumber} from ${v.clientName}`;
  const html = shell({
    preview: `${v.clientName} ${v.decision} ${v.quoteNumber} (${v.total})`,
    reason: ADMIN_REASON,
    body:
      heading({
        eyebrow: accepted ? "Quote accepted" : "Quote declined",
        tone: accepted ? "ok" : "warn",
        title: `${v.clientName} ${v.decision} ${v.title}`,
      }) +
      card({
        title: v.quoteNumber,
        highlightLabel: "Total",
        highlight: v.total,
        rows: [
          ["Client", v.clientName],
          ["Email", v.clientEmail],
          ["Signed as", accepted ? v.acceptedName : ""],
        ],
      }) +
      (!accepted && v.reason ? notice({ tone: "warn", text: `Reason given: ${v.reason}` }) : "") +
      buttons(button({ href: v.adminLink, label: "Open the dashboard" })),
  });
  const text = lines(
    `${v.clientName} ${v.decision} ${v.quoteNumber} (${v.title}), total ${v.total}.`,
    accepted ? `Signed as: ${v.acceptedName}` : v.reason ? `Reason: ${v.reason}` : "",
    v.adminLink,
  );
  return { subject, html, text };
}

function paymentRequest(v) {
  const subject = `Invoice ${v.invoice.invoiceNumber}: ${v.invoice.label} for ${v.title}`;
  const html = shell({
    preview: `${v.invoice.label}: ${v.invoice.amount} due ${v.invoice.dueDate}`,
    reason: CLIENT_REASON,
    body:
      heading({
        eyebrow: "Payment request",
        title: `${v.invoice.label} is ready`,
        intro: `Hi ${v.clientFirstName}, here is the next invoice for ${v.title}.`,
      }) +
      invoiceBlock(v.invoice) +
      card({
        rows: [
          ["Paid so far", v.paidSoFar],
          ["Balance after this payment", v.balanceAfter],
        ],
      }) +
      buttons(
        button({ href: v.invoice.payLink, label: "Pay now" }),
        button({ href: v.invoice.invoiceLink, label: "View invoice", variant: "secondary" }),
      ) +
      small("This email contains a fresh link to your quote. Older links no longer work."),
  });
  const text = lines(
    `Hi ${v.clientFirstName},`,
    `Invoice ${v.invoice.invoiceNumber} (${v.invoice.label}) for ${v.title}: ${v.invoice.amount}, due ${v.invoice.dueDate}.`,
    `Paid so far: ${v.paidSoFar}. Balance after this payment: ${v.balanceAfter}.`,
    `Pay here: ${v.invoice.payLink}`,
  );
  return { subject, html, text };
}

function paymentReceipt(v) {
  const subject = `Receipt: ${v.amount} received for ${v.title}`;
  const html = shell({
    preview: `We received ${v.amount}. Thank you.`,
    reason: CLIENT_REASON,
    body:
      heading({
        eyebrow: "Payment received",
        tone: "ok",
        title: "Thank you, payment received",
        intro: `Hi ${v.clientFirstName}, we've received your ${v.stageLabel.toLowerCase()} payment for ${v.title}.`,
      }) +
      card({
        title: `Receipt · ${v.quoteNumber}`,
        highlightLabel: v.stageLabel,
        highlight: v.amount,
        rows: [
          ["Method", v.method],
          ["Reference", v.reference],
          ["Date", v.paidAt],
          ["Remaining balance", v.complete ? "Fully paid" : v.balance],
        ],
      }) +
      (v.receiptLink
        ? buttons(button({ href: v.receiptLink, label: "View or print receipt" }))
        : "") +
      (v.complete
        ? notice({
            tone: "ok",
            text: "This quote is now fully paid. Thank you for working with OceanicCoder.",
          })
        : ""),
  });
  const text = lines(
    `Hi ${v.clientFirstName},`,
    `We received ${v.amount} (${v.stageLabel}) for ${v.title}.`,
    `Method: ${v.method}. Reference: ${v.reference}. Date: ${v.paidAt}.`,
    v.complete ? "The quote is now fully paid." : `Remaining balance: ${v.balance}.`,
    v.receiptLink ? `Receipt: ${v.receiptLink}` : "",
  );
  return { subject, html, text };
}

function paymentAlert(v) {
  const problem = v.kind === "problem";
  const subject = problem
    ? `Action needed: payment problem on ${v.quoteNumber}`
    : `Paid: ${v.amount} from ${v.clientName} (${v.quoteNumber})`;
  const html = shell({
    preview: problem ? v.problem : `${v.clientName} paid ${v.amount}`,
    reason: ADMIN_REASON,
    body:
      heading({
        eyebrow: problem ? "Payment problem" : "Payment received",
        tone: problem ? "danger" : "ok",
        title: problem ? "A payment needs your attention" : `${v.clientName} paid ${v.amount}`,
      }) +
      (problem ? notice({ tone: "danger", text: v.problem }) : "") +
      card({
        title: v.quoteNumber,
        rows: [
          ["Quote", v.title],
          ["Stage", v.stageLabel],
          ["Amount", v.amount],
          ["Method", v.method],
          ["Reference", v.reference],
          ["Balance", v.balance],
        ],
      }) +
      buttons(button({ href: v.adminLink, label: "Open the dashboard" })),
  });
  const text = lines(
    problem
      ? `Payment problem on ${v.quoteNumber}: ${v.problem}`
      : `${v.clientName} paid ${v.amount} for ${v.stageLabel} on ${v.quoteNumber}.`,
    `Reference: ${v.reference}`,
    v.balance ? `Balance: ${v.balance}` : "",
    v.adminLink,
  );
  return { subject, html, text };
}

module.exports = {
  quoteSent,
  quoteAccepted,
  quoteDecisionAlert,
  paymentRequest,
  paymentReceipt,
  paymentAlert,
};
