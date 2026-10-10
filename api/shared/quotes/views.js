// Formatting and view models. Client and admin views are whitelists: a field
// reaches the browser only if it is listed here.

const M = require("./model");
const { signReceipt } = require("../tokens");

const METHOD_LABELS = {
  card: "Card",
  momo: "Mobile Money",
  apple_pay: "Apple Pay",
  bank: "Bank transfer",
  cash: "Cash",
};
const PROBLEMS = {
  duplicate: "A second payment arrived for a stage that was already paid. Refund it in Paystack.",
  underpaid: "The amount paid is less than the stage amount, so the stage was not marked paid.",
  overpaid:
    "The amount paid is more than the stage amount, so the stage was not marked paid. Refund the difference or record it by hand.",
  "currency-mismatch":
    "The payment was made in a different currency from the quote, so the stage was not marked paid.",
  "no-expected-amount":
    "The stage amount could not be worked out, so the stage was not marked paid.",
  "mode-mismatch":
    "A test-mode payment reached the live key (or the reverse). It was not recorded as revenue.",
};

function siteBase() {
  return (process.env.SITE_URL || "https://oceaniccoder.dev").replace(/\/$/, "");
}

function formatMoney(minor, currency) {
  const major = (Number(minor) || 0) / 100;
  return `${currency} ${major.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Accra",
  }).format(new Date(iso));
}

function firstName(name) {
  return (
    String(name || "")
      .trim()
      .split(/\s+/)[0] || "there"
  );
}

function planSummary(schedule) {
  return schedule.map((s) => `${s.percent}% ${s.label.toLowerCase()}`).join(", ");
}

function quoteLink(token, base = siteBase()) {
  return `${base}/q/${token}`;
}

function receiptPath(reference, secret) {
  if (!secret || !reference) return null;
  return `/receipt/${encodeURIComponent(reference)}?s=${signReceipt(reference, secret)}`;
}

function stageDueDate(stage) {
  return stage.dueAt
    ? new Date(Date.parse(stage.dueAt) + M.INVOICE_DUE_DAYS * M.DAY_MS).toISOString()
    : null;
}

function stageView(stage, receiptSecret) {
  return {
    id: stage.id,
    label: stage.label,
    percent: stage.percent,
    amountMinor: stage.amountMinor,
    index: stage.index,
    state: stage.state,
    dueAt: stage.dueAt,
    dueBy: stageDueDate(stage),
    overdue: stage.overdue,
    invoiceNumber: stage.invoiceNumber,
    paidAt: stage.paidAt,
    receiptPath: stage.state === "paid" ? receiptPath(stage.reference, receiptSecret) : null,
  };
}

function clientQuoteView(q, stages, { receiptSecret } = {}) {
  const summary = M.paymentSummary(stages);
  return {
    quoteNumber: q.quoteNumber,
    revision: q.revision,
    status: q.status,
    currency: q.currency,
    title: q.title,
    overview: q.overview || "",
    scope: q.scope || "",
    timeline: q.timeline || "",
    notes: q.notes || "",
    terms: q.terms || "",
    clientName: q.clientName,
    clientCompany: q.clientCompany || "",
    clientEmail: q.clientEmail || "",
    items: q.items.map((i) => ({
      id: i.id,
      description: i.description,
      qty: i.qty,
      unitMinor: i.unitMinor,
      lineMinor: M.lineMinor(i),
    })),
    subtotalMinor: q.subtotalMinor,
    discountMinor: q.discountMinor || 0,
    totalMinor: q.totalMinor,
    issuedAt: q.sentAt || null,
    validUntil: q.validUntil || null,
    acceptedName: q.acceptedName || null,
    respondedAt: q.respondedAt || null,
    stages: stages.map((s) => stageView(s, receiptSecret)),
    summary: {
      paidMinor: summary.paidMinor,
      balanceMinor: summary.balanceMinor,
      complete: summary.complete,
    },
    contact: { email: "hello@oceaniccoder.dev", whatsapp: process.env.CONTACT_WHATSAPP || "" },
  };
}

function adminQuoteView(q) {
  const { tokenHash, acceptedIpHash, $permissions, $collectionId, $databaseId, ...rest } = q;
  return { ...rest, hasLink: Boolean(tokenHash) };
}

function summarize(q, stages) {
  const s = M.paymentSummary(stages);
  return {
    id: q.id,
    quoteNumber: q.quoteNumber,
    title: q.title,
    clientName: q.clientName,
    status: q.status,
    currency: q.currency,
    totalMinor: q.totalMinor,
    paidMinor: s.paidMinor,
    complete: s.complete,
    nextDue: s.nextDue
      ? { id: s.nextDue.id, label: s.nextDue.label, overdue: s.nextDue.overdue }
      : null,
    sentAt: q.sentAt || null,
    viewedAt: q.viewedAt || null,
    updatedAt: q.updatedAt || q.createdAt || null,
  };
}

function paymentView(p) {
  return {
    id: p.id,
    reference: p.paystackReference,
    stageId: p.stageId,
    amountMinor: p.amountMinor,
    currency: p.currency,
    method: p.method,
    status: p.status,
    paidAt: p.paidAt || null,
    note: p.note || "",
    recordedBy: p.recordedBy || "",
    createdAt: p.createdAt || null,
  };
}

function receiptView(q, p, stages) {
  const stage = stages.find((s) => s.id === p.stageId);
  const summary = M.paymentSummary(stages);
  return {
    quoteNumber: q.quoteNumber,
    title: q.title,
    clientName: q.clientName,
    clientCompany: q.clientCompany || "",
    stageLabel: stage ? stage.label : p.stageId,
    invoiceNumber: stage ? stage.invoiceNumber : p.invoiceNumber,
    amountMinor: p.amountMinor,
    currency: p.currency,
    method: METHOD_LABELS[p.method] || p.method,
    reference: p.paystackReference,
    paidAt: p.paidAt,
    balanceMinor: summary.balanceMinor,
  };
}

function invoiceCard(q, stage, token, base) {
  return {
    invoiceNumber: stage.invoiceNumber,
    label: `${stage.label} (${stage.percent}%)`,
    amount: formatMoney(stage.amountMinor, q.currency),
    dueDate: formatDate(stageDueDate(stage)) || "On receipt",
    payLink: `${base}/q/${token}/pay/${stage.id}`,
    invoiceLink: `${base}/q/${token}/invoice/${stage.id}`,
  };
}

function quoteSentView(q, token, base = siteBase()) {
  return {
    clientFirstName: firstName(q.clientName),
    quoteNumber: q.quoteNumber,
    revision: q.revision,
    title: q.title,
    total: formatMoney(q.totalMinor, q.currency),
    validUntil: formatDate(q.validUntil),
    planSummary: planSummary(q.schedule),
    link: quoteLink(token, base),
  };
}

function acceptedView(q, token, stages, base = siteBase()) {
  return {
    clientFirstName: firstName(q.clientName),
    quoteNumber: q.quoteNumber,
    title: q.title,
    acceptedName: q.acceptedName || q.clientName,
    invoice: invoiceCard(q, stages[0], token, base),
    link: quoteLink(token, base),
  };
}

function decisionView(q, decision, base = siteBase()) {
  return {
    decision,
    clientName: q.clientName,
    clientEmail: q.clientEmail || "",
    quoteNumber: q.quoteNumber,
    title: q.title,
    total: formatMoney(q.totalMinor, q.currency),
    acceptedName: q.acceptedName || "",
    reason: q.declineReason || "",
    adminLink: `${base}/admin/dashboard`,
  };
}

function requestView(q, stage, token, stages, base = siteBase()) {
  const s = M.paymentSummary(stages);
  return {
    clientFirstName: firstName(q.clientName),
    quoteNumber: q.quoteNumber,
    title: q.title,
    invoice: invoiceCard(q, stage, token, base),
    paidSoFar: formatMoney(s.paidMinor, q.currency),
    balanceAfter: formatMoney(s.balanceMinor - stage.amountMinor, q.currency),
  };
}

function receiptEmailView(
  q,
  p,
  stages,
  base = siteBase(),
  secret = process.env.RECEIPT_SIGNING_SECRET,
) {
  const s = M.paymentSummary(stages);
  const stage = stages.find((x) => x.id === p.stageId);
  const path = receiptPath(p.paystackReference, secret);
  return {
    clientFirstName: firstName(q.clientName),
    quoteNumber: q.quoteNumber,
    title: q.title,
    stageLabel: stage ? stage.label : p.stageId,
    amount: formatMoney(p.amountMinor, p.currency),
    method: METHOD_LABELS[p.method] || p.method,
    reference: p.paystackReference,
    paidAt: formatDate(p.paidAt),
    receiptLink: path ? `${base}${path}` : "",
    balance: formatMoney(s.balanceMinor, q.currency),
    complete: s.complete,
  };
}

function alertView(q, p, stages, kind, problem, base = siteBase()) {
  const stage = stages ? stages.find((x) => x.id === p.stageId) : null;
  return {
    kind,
    problem: problem ? PROBLEMS[problem] || problem : "",
    clientName: q.clientName,
    quoteNumber: q.quoteNumber,
    title: q.title,
    stageLabel: stage ? stage.label : p.stageId,
    amount: formatMoney(p.amountMinor, p.currency),
    method: METHOD_LABELS[p.method] || p.method || "",
    reference: p.paystackReference,
    balance: stages ? formatMoney(M.paymentSummary(stages).balanceMinor, q.currency) : "",
    adminLink: `${base}/admin/dashboard`,
  };
}

module.exports = {
  METHOD_LABELS,
  PROBLEMS,
  siteBase,
  formatMoney,
  formatDate,
  firstName,
  planSummary,
  quoteLink,
  receiptPath,
  clientQuoteView,
  adminQuoteView,
  summarize,
  paymentView,
  receiptView,
  quoteSentView,
  acceptedView,
  decisionView,
  requestView,
  receiptEmailView,
  alertView,
};
