// The admin's quote actions. Each takes the services, the request input and
// the signed-in admin, and returns the response body or throws HttpError.

const { HttpError, str } = require("../shared/http");
const M = require("../shared/quotes/model");
const V = require("../shared/quotes/views");
const { newToken, hashToken } = require("../shared/tokens");
const { invoicePayPath } = require("../shared/invoiceLinks");
const { sendMaintenanceOffer } = require("../shared/quotes/maintenance");
const {
  bumpEpoch,
  currentEpoch,
  gateEnabled,
  accessSecret,
  mintLinkCode,
  normalEmail,
} = require("../shared/quotes/access");

const MANUAL_METHODS = ["bank", "momo", "cash"];

// One-time link codes for the client's emails (the "#k=" fragment that signs
// the browser in). Checks the gate and secret before the caller writes
// anything, so a missing secret refuses the action instead of sending an
// email nobody can open. The returned mint(updated) takes the quote as
// written, with its new tokenHash, because a code only works with the link it
// came with; call it once per email so every email has its own code. The
// epoch is read here: send, Email again and payment requests don't change it
// (rotate does, and returns a bare link). While the gate is
// off (gated: false), mint returns null and the links go out bare.
async function linkCodes(svc, quote) {
  if (!gateEnabled()) return { gated: false, mint: () => null };
  const secret = accessSecret();
  const epoch = await currentEpoch(svc.locks, quote);
  return {
    gated: true,
    mint: (updated) => mintLinkCode(secret, updated, epoch, svc.now().getTime()),
  };
}

async function load(svc, id) {
  const quote = typeof id === "string" && id ? await svc.repo.get(id) : null;
  if (!quote) throw new HttpError(404, "Quote not found.");
  return quote;
}

// Appwrite document ids. node-appwrite puts the id into the URL path without
// encoding it, so anything else ("../", "?", "/") is refused before the call.
const ROW_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/;

function rowId(id) {
  if (typeof id !== "string" || !ROW_ID.test(id)) throw new HttpError(400, "Invalid id.");
  return id;
}

async function loadPayment(svc, id) {
  const payment = await svc.repo.getPayment(rowId(id));
  if (!payment) throw new HttpError(404, "Payment not found.");
  return payment;
}

async function loadInvoice(svc, id) {
  const invoice = await svc.repo.getInvoice(rowId(id));
  if (!invoice) throw new HttpError(404, "Invoice not found.");
  return invoice;
}

const PAYMENT_KEEP =
  "This payment can't be archived: money was taken (paid, duplicate or a mismatched charge), so it stays on record.";
const INVOICE_KEEP = "Paid invoices can't be archived. They're your record of money received.";
const INVOICE_PART_PAID =
  "This invoice has a payment recorded against it, so it can't be archived. Money received stays on record.";

// Archive is a soft delete: the row stays, the admin lists hide it.
const archiveView = (row) => ({ id: row.id, archivedAt: row.archivedAt || null });

async function detail(svc, quote, extra = {}) {
  const payments = await svc.repo.listPayments(quote.quoteNumber);
  const stages = M.stageStates(quote, payments, svc.now().getTime());
  return {
    quote: V.adminQuoteView(quote),
    stages,
    payments: payments.map(V.paymentView),
    maintenance: V.maintenanceOfferState(quote, stages),
    ...extra,
  };
}

function validated(draft) {
  const r = M.validateDraft(draft);
  if (!r.ok) throw new HttpError(400, "Fix the highlighted fields.", { fields: r.errors });
  return { ...r.value, ...M.computeTotals(r.value.items, r.value.discountMinor) };
}

async function stageFor(svc, quote, stageId) {
  const payments = await svc.repo.listPayments(quote.quoteNumber);
  const stages = M.stageStates(quote, payments, svc.now().getTime());
  const stage = stages.find((s) => s.id === stageId);
  if (!stage) throw new HttpError(404, "That payment stage doesn't exist on this quote.");
  return { stage, stages, payments };
}

const actions = {
  async list(svc) {
    const [quotes, payments] = await Promise.all([svc.repo.list(), svc.repo.listQuotePayments()]);
    const byNumber = {};
    for (const p of payments) (byNumber[p.quoteNumber] ||= []).push(p);
    const now = svc.now().getTime();
    return {
      quotes: quotes.map((q) =>
        V.summarize(q, M.stageStates(q, byNumber[q.quoteNumber] || [], now)),
      ),
    };
  },

  async get(svc, input) {
    return detail(svc, await load(svc, input.id));
  },

  // The client page exactly as the client would see it, for any status
  // (drafts included). Read-only: nothing is sent and no link is issued.
  async clientView(svc, input) {
    const quote = await load(svc, input.id);
    const payments = await svc.repo.listPayments(quote.quoteNumber);
    const stages = M.stageStates(quote, payments, svc.now().getTime());
    const receiptSecret = svc.receiptSecret ?? process.env.RECEIPT_SIGNING_SECRET;
    return { quote: V.clientQuoteView(quote, stages, { receiptSecret }) };
  },

  async create(svc, input) {
    const fields = validated(input.draft);
    const quote = await svc.repo.create({
      ...fields,
      status: "draft",
      revision: 1,
      payState: { due: {} },
    });
    return detail(svc, quote);
  },

  async save(svc, input) {
    const quote = await load(svc, input.id);
    if (quote.status !== "draft")
      throw new HttpError(409, "Only drafts can be edited. Revise the quote first.");
    return detail(svc, await svc.repo.update(quote.id, validated(input.draft)));
  },

  async send(svc, input) {
    const quote = await load(svc, input.id);
    if (quote.status !== "draft") throw new HttpError(409, "Only drafts can be sent.");
    const problem = M.sendError(quote);
    if (problem) throw new HttpError(400, problem);
    const { mint } = await linkCodes(svc, quote);
    const token = newToken();
    const now = svc.now();
    const updated = await svc.repo.update(quote.id, {
      status: "sent",
      tokenHash: hashToken(token),
      sentAt: now.toISOString(),
      validUntil: new Date(now.getTime() + quote.validDays * M.DAY_MS).toISOString(),
      viewedAt: null,
    });
    await svc.repo.setInquiryStatus(updated.inquiryId, "quoted");
    const mail = await svc.notify.quoteSent(updated, token, mint(updated));
    return detail(svc, updated, { link: V.quoteLink(token), emailed: mail.ok });
  },

  async revise(svc, input) {
    const quote = await load(svc, input.id);
    if (!M.canMove(quote.status, "draft")) throw new HttpError(409, "This quote can't be revised.");
    const updated = await svc.repo.update(quote.id, {
      status: "draft",
      revision: quote.revision + 1,
      tokenHash: null,
      viewedAt: null,
      sentAt: null,
      validUntil: null,
    });
    return detail(svc, updated);
  },

  async cancel(svc, input) {
    const quote = await load(svc, input.id);
    if (!M.canMove(quote.status, "cancelled"))
      throw new HttpError(409, "This quote can't be cancelled.");
    const payments = await svc.repo.listPayments(quote.quoteNumber);
    if (payments.some((p) => p.status === "success")) {
      throw new HttpError(
        409,
        "A payment has been made on this quote, so it can't be cancelled. Refund first.",
      );
    }
    return detail(svc, await svc.repo.update(quote.id, { status: "cancelled", tokenHash: null }));
  },

  async rotate(svc, input) {
    const quote = await load(svc, input.id);
    if (!["sent", "accepted"].includes(quote.status))
      throw new HttpError(409, "Only sent or accepted quotes have a link.");
    // New link is the leak response, so it also locks out every browser that
    // entered a code. The epoch goes first, so either failure fails closed:
    // - the epoch write fails: nothing changed; the old link and sessions
    //   stay as they were, never a new link with old sessions still open;
    // - the link write fails after it: every session is already locked out
    //   and the old link still works, behind a new code. Pressing New link
    //   again finishes the job.
    // The link goes back bare, like every link the admin sees: whoever opens
    // it is emailed a code at the client's address.
    await bumpEpoch(svc.locks, quote);
    const token = newToken();
    const updated = await svc.repo.update(quote.id, { tokenHash: hashToken(token) });
    return detail(svc, updated, { link: V.quoteLink(token), emailed: false });
  },

  // Emails a sent or accepted quote again, e.g. when the client asks for it at
  // another address. The raw link isn't stored, so this issues a fresh one and
  // the old link stops working, as with rotate. It goes to the client's address
  // and to `to` if given, one email each; with saveAddress, `to` becomes the
  // client's email for later emails (payment requests, maintenance offers).
  // Accepted quotes get whatever is due now, so there must be something due.
  async emailAgain(svc, input) {
    const quote = await load(svc, input.id);
    if (!["sent", "accepted"].includes(quote.status))
      throw new HttpError(409, "Only sent or accepted quotes can be emailed again.");
    const now = svc.now().getTime();
    if (M.isExpired(quote, now))
      throw new HttpError(409, "This quote has expired. Revise it to send a new one.");
    const raw = typeof input.to === "string" ? input.to.trim() : "";
    if (raw.length > 254) throw new HttpError(400, "Enter a valid email address.");
    const extra = raw.toLowerCase();
    if (extra && !M.EMAIL_RE.test(extra)) throw new HttpError(400, "Enter a valid email address.");
    const save = input.saveAddress === true;
    if (save && !extra) throw new HttpError(400, "Enter the address to use from now on.");
    const addresses = [...new Set([quote.clientEmail, extra].filter(Boolean))];
    if (!addresses.length) throw new HttpError(400, "Add the client's email address first.");
    const payments = await svc.repo.listPayments(quote.quoteNumber);
    if (
      quote.status === "accepted" &&
      !M.paymentSummary(M.stageStates(quote, payments, now)).nextDue
    )
      throw new HttpError(
        409,
        "Nothing is due on this quote, so there's no email to send. Use New link to share the quote page.",
      );

    const codes = await linkCodes(svc, quote);
    const token = newToken();
    const updated = await svc.repo.update(quote.id, {
      tokenHash: hashToken(token),
      ...(save ? { clientEmail: extra } : {}),
    });
    const stages = M.stageStates(updated, payments, now);
    // Only the client's own copy signs a browser in. Anyone else it goes to
    // gets the code screen, and the code goes to the client.
    const results = await Promise.all(
      addresses.map((address) => {
        const own = normalEmail(address) === normalEmail(updated.clientEmail);
        return svc.notify.quoteEmailAgain(
          updated,
          token,
          stages,
          address,
          own ? codes.mint(updated) : null,
          !own && codes.gated,
        );
      }),
    );
    const emailedTo = addresses.filter((_, i) => results[i].ok);
    const failedTo = addresses.filter((_, i) => !results[i].ok);
    return detail(svc, updated, {
      link: V.quoteLink(token),
      emailed: failedTo.length === 0,
      emailedTo,
      failedTo,
    });
  },

  async requestStage(svc, input) {
    const quote = await load(svc, input.id);
    if (quote.status !== "accepted")
      throw new HttpError(409, "The client hasn't accepted this quote yet.");
    const { stage } = await stageFor(svc, quote, input.stageId);
    if (stage.index === 0) throw new HttpError(409, "The deposit is already due from acceptance.");
    if (stage.state === "paid") throw new HttpError(409, "This stage is already paid.");
    const due = { ...((quote.payState && quote.payState.due) || {}) };
    due[stage.id] = due[stage.id] || svc.now().toISOString();
    const { mint } = await linkCodes(svc, quote);
    const token = newToken();
    const updated = await svc.repo.update(quote.id, {
      payState: { due },
      tokenHash: hashToken(token),
    });
    const after = M.stageStates(
      updated,
      await svc.repo.listPayments(updated.quoteNumber),
      svc.now().getTime(),
    );
    const mail = await svc.notify.paymentRequest(
      updated,
      after[stage.index],
      token,
      after,
      mint(updated),
    );
    return detail(svc, updated, { link: V.quoteLink(token), emailed: mail.ok });
  },

  // Emails the maintenance plans now. Only for fully paid quotes with plans;
  // once sent, it goes again only with { resend: true }.
  async sendMaintenanceOffer(svc, input) {
    const quote = await load(svc, input.id);
    const payments = await svc.repo.listPayments(quote.quoteNumber);
    const stages = M.stageStates(quote, payments, svc.now().getTime());
    const offer = M.maintenanceOffer(quote, stages);
    if (!offer)
      throw new HttpError(
        409,
        "The maintenance offer is for fully paid quotes with at least one maintenance plan.",
      );
    if (offer.sentAt && input.resend !== true)
      throw new HttpError(
        409,
        `The maintenance offer was already sent on ${V.formatDate(offer.sentAt)}.`,
      );
    if (!quote.clientEmail) throw new HttpError(400, "Add the client's email address first.");
    const result = await sendMaintenanceOffer(svc, quote, stages);
    if (!result.ok)
      throw new HttpError(502, "The maintenance offer email didn't send. Try again later.");
    return detail(svc, result.quote, { emailed: true });
  },

  async recordManual(svc, input, { admin }) {
    const quote = await load(svc, input.id);
    if (quote.status !== "accepted")
      throw new HttpError(409, "The client hasn't accepted this quote yet.");
    if (!MANUAL_METHODS.includes(input.method))
      throw new HttpError(400, "Method must be bank, momo or cash.");
    const { stage, payments } = await stageFor(svc, quote, input.stageId);
    if (stage.state === "paid") throw new HttpError(409, "This stage is already paid.");
    const stageKey = `stage:${quote.id}:${stage.id}`;
    if (!(await svc.locks.take(stageKey))) throw new HttpError(409, "This stage is already paid.");
    let mail;
    try {
      const payment = await svc.repo.createPayment(
        M.paymentRow(quote, stage, {
          status: "success",
          method: input.method,
          paystackReference: M.paymentReference(quote.quoteNumber, stage.index),
          paidAt: svc.now().toISOString(),
          note: str(input.note, 300),
          recordedBy: (admin && (admin.email || admin.userDetails || admin.name)) || "admin",
        }),
      );
      const after = M.stageStates(quote, [...payments, payment], svc.now().getTime());
      mail = await svc.notify.paymentReceived(quote, payment, after);
    } catch (err) {
      // Release the lock only when no success row exists for this stage, so a
      // retry can't double-pay. If the re-read itself fails, keep the lock.
      try {
        const rows = await svc.repo.listPayments(quote.quoteNumber);
        if (!rows.some((p) => p.stageId === stage.id && p.status === "success"))
          await svc.locks.release(stageKey);
      } catch {
        // Keep the lock: we cannot tell whether the payment was recorded.
      }
      throw err;
    }
    return { ...(await detail(svc, quote)), emailed: mail.ok };
  },

  // Hides an attempt where no money was taken (see M.canArchivePayment).
  async archivePayment(svc, input) {
    const payment = await loadPayment(svc, input.id);
    if (!M.canArchivePayment(payment)) throw new HttpError(409, PAYMENT_KEEP);
    const updated = await svc.repo.updatePayment(payment.id, {
      archivedAt: svc.now().toISOString(),
    });
    // The webhook may have settled the row between our read and our write.
    // The write returns the row as stored, so undo the archive if it is now
    // money received.
    if (!M.canArchivePayment(updated)) {
      await svc.repo.updatePayment(payment.id, { archivedAt: null });
      throw new HttpError(409, PAYMENT_KEEP);
    }
    return { payment: archiveView(updated) };
  },

  async restorePayment(svc, input) {
    const payment = await loadPayment(svc, input.id);
    const updated = await svc.repo.updatePayment(payment.id, { archivedAt: null });
    return { payment: archiveView(updated) };
  },

  // Unpaid one-off invoices only. Quote stage invoices are derived from the
  // quote and have no row to archive; paid invoices are money received.
  async archiveInvoice(svc, input) {
    const invoice = await loadInvoice(svc, input.id);
    if (invoice.status === "paid") throw new HttpError(409, INVOICE_KEEP);
    // A part-payment leaves the invoice open, but it is still money received
    // (the webhook un-archives on any payment for the same reason). Rows with
    // no status predate the field and were all successful. With no number
    // there is nothing to match (and Appwrite rejects equal on undefined).
    const payments = invoice.invoiceNumber
      ? await svc.repo.listInvoicePayments(invoice.invoiceNumber)
      : [];
    if (payments.some((p) => !p.status || p.status === "success"))
      throw new HttpError(409, INVOICE_PART_PAID);
    const updated = await svc.repo.updateInvoice(invoice.id, {
      archivedAt: svc.now().toISOString(),
    });
    // Same race as archivePayment: the webhook may have marked it paid.
    if (updated.status === "paid") {
      await svc.repo.updateInvoice(invoice.id, { archivedAt: null });
      throw new HttpError(409, INVOICE_KEEP);
    }
    return { invoice: archiveView(updated) };
  },

  async restoreInvoice(svc, input) {
    const invoice = await loadInvoice(svc, input.id);
    const updated = await svc.repo.updateInvoice(invoice.id, { archivedAt: null });
    return { invoice: archiveView(updated) };
  },

  // The signed /pay/ link for a one-off invoice. The browser has no secret to
  // sign with, so the dashboard asks for it here.
  async invoicePayLink(svc, input) {
    const invoice = await loadInvoice(svc, input.id);
    if (!invoice.invoiceNumber) throw new HttpError(409, "This invoice has no number to pay.");
    const secret = svc.receiptSecret ?? process.env.RECEIPT_SIGNING_SECRET;
    if (!secret) throw new HttpError(503, "Pay links need RECEIPT_SIGNING_SECRET to be set.");
    return { link: invoicePayPath(invoice.invoiceNumber, secret) };
  },
};

module.exports = actions;
