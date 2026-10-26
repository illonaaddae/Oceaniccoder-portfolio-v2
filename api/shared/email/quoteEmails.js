// Quote and payment emails. Each takes a pre-formatted view model from
// api/shared/quotes/views.js and returns { subject, html, text }.

const {
  C,
  esc,
  safeUrl,
  multiline,
  shell,
  heading,
  p,
  card,
  codeBlock,
  button,
  buttons,
  steps,
  notice,
  small,
  lines,
} = require("./ui");

const CLIENT_REASON = "OceanicCoder · Web and app development";
const ADMIN_REASON = "Sent to you as the OceanicCoder admin.";

function invoiceBlock(inv) {
  return card({
    title: "Amount due",
    status: { label: "Due", tone: "warn" },
    highlightLabel: inv.label,
    highlight: inv.amount,
    rows: [["Due", inv.dueDate]],
  });
}

// How the quote link opens (api/shared/quotes/access.js). v.linkOpens: this
// copy carries the one-time link code, so it opens straight away here.
// v.codeByEmail: it doesn't (an extra Email again address), so the page asks
// for a code, which goes to the client. Neither: the gate is off; say nothing.
function accessNote(v) {
  if (v.linkOpens)
    return "This link usually opens straight away. If you open it on another device, we'll email you a short code first.";
  if (v.codeByEmail)
    return `This link asks for a short code that we email to ${v.clientFirstName}.`;
  return "";
}

function quoteSent(v) {
  const updated = v.revision > 1;
  const subject = `${updated ? "Updated quote" : "Your quote"} from OceanicCoder: ${v.title}`;
  const html = shell({
    preview: `Quote ${v.quoteNumber} for ${v.title}, ${v.total}`,
    meta: { label: updated ? "Updated quote" : "Quote", number: v.quoteNumber },
    reason: CLIENT_REASON,
    body:
      heading({
        eyebrow: updated ? "Updated quote" : "Your quote",
        title: v.title,
        intro: `Hi ${v.clientFirstName}, here is ${updated ? "the updated" : "your"} quote. It covers the scope, timeline and payment plan.`,
      }) +
      card({
        title: "Quote summary",
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
        v.singleStage ? "Pay in full to book your slot" : "Pay the deposit to book your slot",
      ]) +
      small([accessNote(v), "Questions? Reply to this email."].filter(Boolean).join("\n\n")),
  });
  const text = lines(
    `Hi ${v.clientFirstName},`,
    `Here is ${updated ? "the updated" : "your"} quote for ${v.title} (${v.quoteNumber}).`,
    `Total: ${v.total}`,
    `Payment plan: ${v.planSummary}`,
    `Valid until: ${v.validUntil}`,
    `View and accept it here: ${v.link}`,
    accessNote(v),
    "Questions? Reply to this email.",
  );
  return { subject, html, text };
}

function quoteAccepted(v) {
  // v.invoice is null when the quote has no payment stages; the invoice card,
  // pay button and invoice lines are then left out.
  const inv = v.invoice;
  // A one-stage quote is paid in full, so there is no deposit and no later stage.
  const one = Boolean(v.singleStage);
  const invoiceName = one ? "invoice" : "deposit invoice";
  const subject = inv
    ? `Quote accepted: your ${invoiceName} for ${v.title}`
    : `Quote accepted: ${v.title}`;
  const html = shell({
    meta: inv
      ? { label: "Invoice", number: inv.invoiceNumber }
      : { label: "Quote", number: v.quoteNumber },
    preview: inv
      ? `Thanks ${v.clientFirstName}. Your ${invoiceName} is ready.`
      : `Thanks ${v.clientFirstName}. We have your acceptance.`,
    reason: CLIENT_REASON,
    body:
      heading({
        eyebrow: "Quote accepted",
        tone: "ok",
        title: "Thank you, we're on",
        intro: `Hi ${v.clientFirstName}, you accepted quote ${v.quoteNumber} as ${v.acceptedName}. ${
          inv
            ? one
              ? "The next step is payment."
              : "The next step is the deposit."
            : "We'll be in touch with the next steps."
        }`,
      }) +
      (inv
        ? invoiceBlock(inv) +
          buttons(
            button({ href: inv.payLink, label: one ? "Pay now" : "Pay the deposit" }),
            button({ href: inv.invoiceLink, label: "View invoice", variant: "secondary" }),
          )
        : "") +
      steps(
        one
          ? ["Pay the invoice", "We schedule the work and keep you updated"]
          : [
              "Pay the deposit",
              "We schedule the work and keep you updated",
              "Later stages are invoiced as the project reaches them",
            ],
      ) +
      small("You can open your quote again at any time:", {
        href: v.link,
        label: `View quote ${v.quoteNumber}`,
      }),
  });
  const text = lines(
    `Hi ${v.clientFirstName},`,
    `You accepted quote ${v.quoteNumber} as ${v.acceptedName}. Thank you.`,
    inv
      ? `${one ? "Invoice" : "Deposit invoice"} ${inv.invoiceNumber}: ${inv.amount}, due ${inv.dueDate}.`
      : "",
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
    meta: { label: "Quote", number: v.quoteNumber },
    reason: ADMIN_REASON,
    body:
      heading({
        eyebrow: accepted ? "Quote accepted" : "Quote declined",
        tone: accepted ? "ok" : "warn",
        title: `${v.clientName} ${v.decision} ${v.title}`,
      }) +
      card({
        title: "Summary",
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
    meta: { label: "Invoice", number: v.invoice.invoiceNumber },
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
    meta: { label: "Receipt", number: v.quoteNumber },
    reason: CLIENT_REASON,
    body:
      heading({
        eyebrow: "Payment received",
        tone: "ok",
        title: "Thank you, payment received",
        intro: `Hi ${v.clientFirstName}, we've received your ${v.stageLabel.toLowerCase()} payment for ${v.title}.`,
      }) +
      card({
        title: "Payment summary",
        status: { label: "Paid", tone: "ok" },
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
    meta: { label: "Quote", number: v.quoteNumber },
    reason: ADMIN_REASON,
    body:
      heading({
        eyebrow: problem ? "Payment problem" : "Payment received",
        tone: problem ? "danger" : "ok",
        title: problem ? "A payment needs your attention" : `${v.clientName} paid ${v.amount}`,
      }) +
      (problem ? notice({ tone: "danger", text: v.problem }) : "") +
      card({
        title: "Payment details",
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

const PER = { month: "per month", year: "per year" };

// One maintenance plan: name and price per period on the card header, and
// what it includes as a tight list below.
function planCard(plan) {
  const items = plan.includes
    .map(
      (line) =>
        `<tr><td style="vertical-align:top;padding:0 8px 6px 0;color:${C.tealDark};font-size:14px;line-height:1.5">&bull;</td><td style="padding:0 0 6px;font-size:14px;line-height:1.5;color:${C.ink2}">${esc(line)}</td></tr>`,
    )
    .join("");
  return card({
    title: plan.name,
    highlightLabel: PER[plan.period] || PER.month,
    highlight: plan.price,
    body: items
      ? `<table role="presentation" cellpadding="0" cellspacing="0">${items}</table>`
      : "",
  });
}

function maintenanceOffer(v) {
  const free = v.freeEnds
    ? `Your free support period ${v.freeEnded ? "ended" : "ends"} on ${v.freeEnds}.`
    : "";
  const plan = free
    ? "After that, a plan keeps it safe, up to date and running well."
    : "A plan keeps it safe, up to date and running well.";
  const subject = free
    ? `Keeping ${v.title} running after your free support period`
    : `Keeping ${v.title} running after launch`;
  const start = v.whatsappLink
    ? `<p style="margin:0">Reply to this email or <a href="${esc(safeUrl(v.whatsappLink))}" style="color:${C.tealDark};font-weight:600">message me on WhatsApp</a> to start a plan.</p>`
    : `<p style="margin:0">Reply to this email to start a plan.</p>`;
  const html = shell({
    preview: free || `Keeping ${v.title} running after launch`,
    meta: { label: "Quote", number: v.quoteNumber },
    reason: CLIENT_REASON,
    body:
      heading({
        eyebrow: "Maintenance and support",
        title: "Thank you for launching with me",
        intro: `Hi ${v.clientFirstName}, ${v.title} is live. ${free ? `${free} ` : ""}${plan}`,
      }) +
      v.plans.map(planCard).join("") +
      (v.note
        ? `<p style="margin:0 0 16px;font-size:14px;color:${C.ink3}">${multiline(v.note)}</p>`
        : "") +
      start,
  });
  const text = lines(
    `Hi ${v.clientFirstName},`,
    `Thank you for launching ${v.title} with me.`,
    free,
    plan,
    ...v.plans.map((p) =>
      [
        `${p.name}: ${p.price} ${PER[p.period] || PER.month}`,
        ...p.includes.map((l) => `  - ${l}`),
      ].join("\n"),
    ),
    v.note,
    v.whatsappLink
      ? `Reply to this email or message me on WhatsApp (${v.whatsappLink}) to start a plan.`
      : "Reply to this email to start a plan.",
  );
  return { subject, html, text };
}

// The code sent when the quote is opened in a browser that isn't signed in
// and the link's one-time link code is spent or missing. No link in it, so a
// forwarded or intercepted copy can't open the quote by itself.
function accessCode(v) {
  const subject = `${v.code} is your code for quote ${v.quoteNumber}`;
  // A plain sentence first, so Gmail's "Copy code" and Apple's one-time-code
  // autofill find the code.
  const verification = `Your verification code is ${v.code}.`;
  const opened = "Someone opened your quote in a new browser. Here's your code:";
  const ignore = "If it wasn't you, you can ignore this email.";
  const html = shell({
    preview: `${verification} It works for ${v.minutes} minutes.`,
    meta: { label: "Quote", number: v.quoteNumber },
    reason: CLIENT_REASON,
    body:
      heading({ eyebrow: "Your code", title: "Open your quote", intro: verification }) +
      p(`Hi ${v.clientFirstName}, ${opened.charAt(0).toLowerCase()}${opened.slice(1)}`) +
      codeBlock({ label: "Code", code: v.code }) +
      p(`It works for ${v.minutes} minutes.`) +
      small(ignore),
  });
  const text = [
    verification,
    `Hi ${v.clientFirstName},\n${opened}`,
    v.code,
    `It works for ${v.minutes} minutes.\n${ignore}`,
  ].join("\n\n");
  return { subject, html, text };
}

// Two cases: one code locked after five wrong tries, or (blocked) the quote's
// fifteenth wrong code, after which no code is sent or checked until New link
// or Revise.
function accessLockedAlert(v) {
  const subject = v.blocked
    ? `Codes blocked after 15 wrong tries on ${v.quoteNumber}`
    : `Code locked after 5 wrong tries on ${v.quoteNumber}`;
  const what = v.blocked
    ? `Fifteen wrong codes have been entered for ${v.quoteNumber}.`
    : `Five wrong codes were entered for ${v.quoteNumber}.`;
  const effect = v.blocked
    ? "No more codes will be sent or accepted on this link until you use New link or Revise."
    : "That code no longer works, and a new one goes only to the client's email.";
  const advice =
    "If the client didn't ask for a code, the link may have been shared. Use New link on the quote to lock out every browser, then send the client the new link.";
  const html = shell({
    preview: what,
    meta: { label: "Quote", number: v.quoteNumber },
    reason: ADMIN_REASON,
    body:
      heading({
        eyebrow: "Quote access",
        tone: v.blocked ? "danger" : "warn",
        title: v.blocked ? "Codes are blocked on a quote" : "A quote code was locked",
        intro: `${what} ${effect}`,
      }) +
      card({
        title: "Quote",
        rows: [
          ["Client", v.clientName],
          ["Quote", v.title],
          ["Date", v.lockedOn],
        ],
      }) +
      notice({ tone: "warn", text: advice }) +
      buttons(button({ href: v.adminLink, label: "Open the dashboard" })),
  });
  const text = lines(
    `${what.slice(0, -1)} (${v.title}, ${v.clientName}) on ${v.lockedOn}.`,
    effect,
    advice,
    v.adminLink,
  );
  return { subject, html, text };
}

module.exports = {
  accessCode,
  accessLockedAlert,
  maintenanceOffer,
  quoteSent,
  quoteAccepted,
  quoteDecisionAlert,
  paymentRequest,
  paymentReceipt,
  paymentAlert,
};
