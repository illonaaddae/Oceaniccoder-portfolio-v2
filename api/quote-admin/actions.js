// The admin's quote actions. Each takes the services, the request input and
// the signed-in admin, and returns the response body or throws HttpError.

const { HttpError, str } = require("../shared/http");
const M = require("../shared/quotes/model");
const V = require("../shared/quotes/views");
const { newToken, hashToken } = require("../shared/tokens");

const MANUAL_METHODS = ["bank", "momo", "cash"];

async function load(svc, id) {
  const quote = typeof id === "string" && id ? await svc.repo.get(id) : null;
  if (!quote) throw new HttpError(404, "Quote not found.");
  return quote;
}

async function detail(svc, quote, extra = {}) {
  const payments = await svc.repo.listPayments(quote.quoteNumber);
  return {
    quote: V.adminQuoteView(quote),
    stages: M.stageStates(quote, payments, svc.now().getTime()),
    payments: payments.map(V.paymentView),
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
    const mail = await svc.notify.quoteSent(updated, token);
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
    const token = newToken();
    const updated = await svc.repo.update(quote.id, { tokenHash: hashToken(token) });
    return detail(svc, updated, { link: V.quoteLink(token), emailed: false });
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
    const mail = await svc.notify.paymentRequest(updated, after[stage.index], token, after);
    return detail(svc, updated, { link: V.quoteLink(token), emailed: mail.ok });
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
};

module.exports = actions;
