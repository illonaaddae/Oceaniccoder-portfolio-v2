// Pure quote rules: money, payment stages, status moves and numbering.
//
// No I/O, so the functions, the tests and the dashboard editor (through the
// parity test in src/utils/quoteMath.test.ts) all agree on the same numbers.
// Money is always an integer in minor units (pesewas or cents).

const crypto = require("crypto");

const CURRENCIES = ["GHS", "USD"];
const STATUSES = ["draft", "sent", "accepted", "declined", "expired", "cancelled"];

// Which status a quote may move to from each status. "sent → draft" is revise.
const TRANSITIONS = {
  draft: ["sent", "cancelled"],
  sent: ["accepted", "declined", "expired", "cancelled", "draft"],
  accepted: ["cancelled"],
  declined: ["draft"],
  expired: ["draft"],
  cancelled: [],
};

const INVOICE_DUE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_SCHEDULE = [
  { id: "deposit", label: "Deposit", percent: 60 },
  { id: "balance", label: "Balance", percent: 40 },
];

const DEFAULT_TERMS = [
  "- Work starts once the deposit is received.",
  "- The balance is due on delivery, before final files, source code and credentials are handed over.",
  "- This quote covers the scope above. New features or changes are quoted separately.",
  "- Third-party costs (domains, hosting, app store fees, paid APIs) are paid by the client unless listed above.",
  "- Each payment stage is invoiced separately and is due within 7 days of its invoice.",
].join("\n");

const ID_RE = /^[a-z0-9-]{1,24}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEXT_MAX = 5000;
const TERMS_MAX = 8000;
const LIMITS = {
  highlights: 4,
  highlight: 80,
  discountLabel: 60,
  runningCosts: 12,
  rcService: 60,
  rcPurpose: 120,
  rcCost: 60,
  exclusions: 3000,
  assumptions: 3000,
  nextSteps: 1500,
  optionalTitle: 80,
  optionalItems: 30,
  itemDetail: 600,
  stageNote: 80,
  // extras.needs: the "What I'll need from you" tables.
  needsIntro: 600,
  needsGroups: 8,
  needsGroupTitle: 80,
  needsGroupIntro: 600,
  needsRows: 30,
  needsItem: 240,
  needsDetail: 240,
  needsWhen: 40,
  needsFootnote: 600,
  // The Appwrite `extras` column holds at most this many characters of JSON.
  extras: 100000,
};
const NEEDS_DETAIL_LABELS = ["Used for", "Notes"];
const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function str(v) {
  return typeof v === "string" ? v.trim() : "";
}

function parseItem(i) {
  return {
    id: str(i && i.id),
    description: str(i && i.description),
    qty: Number(i && i.qty),
    unitMinor: Number(i && i.unitMinor),
    detail: str(i && i.detail),
  };
}

// Checks one line item; error keys are `${key}.<field>`.
function itemErrors(it, key, errors) {
  if (!ID_RE.test(it.id)) errors[`${key}.id`] = "Invalid item id.";
  if (!it.description || it.description.length > 300)
    errors[`${key}.description`] = "Describe the item (up to 300 characters).";
  if (!(it.qty > 0 && it.qty <= 10000)) errors[`${key}.qty`] = "Quantity must be more than 0.";
  if (!Number.isInteger(it.unitMinor) || it.unitMinor < 0 || it.unitMinor > 1e11)
    errors[`${key}.unitMinor`] = "Enter a valid price.";
  if (it.detail.length > LIMITS.itemDetail)
    errors[`${key}.detail`] = `Keep this under ${LIMITS.itemDetail} characters.`;
}

function optionalTotals(optionalItems) {
  return { optionalTotalMinor: (optionalItems || []).reduce((t, i) => t + lineMinor(i), 0) };
}

function canMove(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

function lineMinor(item) {
  return Math.round(Number(item.qty) * Number(item.unitMinor));
}

function computeTotals(items, discountMinor = 0) {
  const subtotalMinor = items.reduce((sum, i) => sum + lineMinor(i), 0);
  const discount = Math.min(Math.max(0, Math.round(Number(discountMinor) || 0)), subtotalMinor);
  return { subtotalMinor, discountMinor: discount, totalMinor: subtotalMinor - discount };
}

function stageAmounts(totalMinor, schedule) {
  let allocated = 0;
  return schedule.map((stage, i) => {
    const last = i === schedule.length - 1;
    const amountMinor = last
      ? totalMinor - allocated
      : Math.floor((totalMinor * stage.percent) / 100);
    allocated += amountMinor;
    return { ...stage, amountMinor };
  });
}

function scheduleError(schedule) {
  if (!Array.isArray(schedule) || schedule.length < 1 || schedule.length > 8) {
    return "Use between 1 and 8 payment stages.";
  }
  const ids = new Set();
  for (const s of schedule) {
    if (!s || !ID_RE.test(s.id) || ids.has(s.id)) return "Each stage needs a unique id.";
    ids.add(s.id);
    if (!s.label || s.label.length > 40) return "Give every stage a name (up to 40 characters).";
    if (!Number.isInteger(s.percent) || s.percent < 1 || s.percent > 100) {
      return "Each stage must be a whole percentage from 1 to 100.";
    }
  }
  const sum = schedule.reduce((t, s) => t + s.percent, 0);
  if (sum !== 100) return `Stages add up to ${sum}%. They must add up to 100%.`;
  return null;
}

function keptRows(list, parse) {
  return (Array.isArray(list) ? list : []).map((raw, index) => ({ row: parse(raw), index }));
}

// extras.needs: grouped tables of what the client must send. Blank rows and
// groups with no title and no rows are dropped; error keys use the row's
// position in the editor (e.g. `needs.groups.0.rows.2.item`). Returns null
// when nothing is left, so an empty editor stores no needs at all.
function parseNeedsTables(raw, errors) {
  const n = raw && typeof raw === "object" ? raw : {};
  const tooLong = (key, value, max) => {
    if (value.length > max) errors[key] = `Keep this under ${max} characters.`;
  };
  const intro = str(n.intro);
  tooLong("needs.intro", intro, LIMITS.needsIntro);

  const groupRows = keptRows(n.groups, (g) => (g && typeof g === "object" ? g : {}));
  if (groupRows.length > LIMITS.needsGroups)
    errors["needs.groups"] = `Use up to ${LIMITS.needsGroups} groups.`;

  const groups = [];
  for (const { row: g, index: gi } of groupRows) {
    const key = `needs.groups.${gi}`;
    const rows = keptRows(g.rows, (r) => ({
      id: str(r && r.id),
      item: str(r && r.item),
      detail: str(r && r.detail),
      when: str(r && r.when),
    })).filter(({ row: r }) => r.item || r.detail || r.when);
    const title = str(g.title);
    if (!title && !rows.length) continue;

    if (!title) errors[`${key}.title`] = "Give this group a title.";
    tooLong(`${key}.title`, title, LIMITS.needsGroupTitle);
    const groupIntro = str(g.intro);
    tooLong(`${key}.intro`, groupIntro, LIMITS.needsGroupIntro);
    const footnote = str(g.footnote);
    tooLong(`${key}.footnote`, footnote, LIMITS.needsFootnote);
    if (rows.length > LIMITS.needsRows)
      errors[`${key}.rows`] = `Use up to ${LIMITS.needsRows} rows in a group.`;
    rows.forEach(({ row: r, index: ri }) => {
      const rk = `${key}.rows.${ri}`;
      if (!r.item || r.item.length > LIMITS.needsItem)
        errors[`${rk}.item`] = `Name the item (up to ${LIMITS.needsItem} characters).`;
      tooLong(`${rk}.detail`, r.detail, LIMITS.needsDetail);
      tooLong(`${rk}.when`, r.when, LIMITS.needsWhen);
    });

    const id = str(g.id);
    groups.push({
      id: ID_RE.test(id) ? id : `group-${gi + 1}`,
      title,
      intro: groupIntro,
      detailLabel: NEEDS_DETAIL_LABELS.includes(g.detailLabel) ? g.detailLabel : "Used for",
      rows: rows.map(({ row: r, index: ri }) => ({
        ...r,
        id: ID_RE.test(r.id) ? r.id : `row-${ri + 1}`,
      })),
      footnote,
    });
  }
  return intro || groups.length ? { intro, groups } : null;
}

// `extras` is one JSON column with one parser per key; unknown keys are dropped.
function parseExtras(raw, errors) {
  const x = raw && typeof raw === "object" ? raw : {};
  const extras = {};
  const needs = parseNeedsTables(x.needs, errors);
  if (needs) extras.needs = needs;
  if (JSON.stringify(extras).length > LIMITS.extras)
    errors.extras = "These tables are too long to save. Shorten some rows.";
  return extras;
}

function validateDraft(input) {
  const d = input || {};
  const errors = {};
  // Blank rows are dropped, but each kept row remembers its position in the
  // editor so field errors point at the row the admin actually typed in.
  const runningCostRows = keptRows(d.runningCosts, (r) => ({
    service: str(r && r.service),
    purpose: str(r && r.purpose),
    cost: str(r && r.cost),
  })).filter(({ row: r }) => r.service || r.purpose || r.cost);
  const optionalRows = keptRows(d.optionalItems, parseItem).filter(
    ({ row: i }) => i.description || i.unitMinor || i.detail,
  );
  const value = {
    clientName: str(d.clientName),
    clientEmail: str(d.clientEmail).toLowerCase(),
    clientPhone: str(d.clientPhone),
    clientCompany: str(d.clientCompany),
    currency: d.currency,
    title: str(d.title),
    overview: str(d.overview),
    scope: str(d.scope),
    timeline: str(d.timeline),
    notes: str(d.notes),
    terms: str(d.terms),
    items: Array.isArray(d.items) ? d.items.map(parseItem) : [],
    discountMinor: Number(d.discountMinor || 0),
    schedule: Array.isArray(d.schedule)
      ? d.schedule.map((s) => ({
          id: str(s && s.id),
          label: str(s && s.label),
          percent: Number(s && s.percent),
          note: str(s && s.note),
        }))
      : [],
    validDays: Number(d.validDays || 14),
    inquiryId: str(d.inquiryId) || null,
    highlights: (Array.isArray(d.highlights) ? d.highlights : []).map(str).filter(Boolean),
    discountLabel: str(d.discountLabel),
    runningCosts: runningCostRows.map((r) => r.row),
    exclusions: str(d.exclusions),
    assumptions: str(d.assumptions),
    nextSteps: str(d.nextSteps),
    optionalTitle: str(d.optionalTitle),
    optionalItems: optionalRows.map((r) => r.row),
    extras: parseExtras(d.extras, errors),
  };

  if (!value.clientName || value.clientName.length > 120) {
    errors.clientName = "Enter the client's name (up to 120 characters).";
  }
  if (value.clientEmail && !EMAIL_RE.test(value.clientEmail))
    errors.clientEmail = "Enter a valid email address.";
  if (value.clientPhone.length > 40)
    errors.clientPhone = "Keep the phone number under 40 characters.";
  if (value.clientCompany.length > 120)
    errors.clientCompany = "Keep the company name under 120 characters.";
  if (!CURRENCIES.includes(value.currency)) errors.currency = "Currency must be GHS or USD.";
  if (!value.title || value.title.length > 160)
    errors.title = "Give the project a title (up to 160 characters).";
  for (const field of ["overview", "scope", "timeline", "notes"]) {
    if (value[field].length > TEXT_MAX) errors[field] = `Keep this under ${TEXT_MAX} characters.`;
  }
  if (value.terms.length > TERMS_MAX)
    errors.terms = `Keep the terms under ${TERMS_MAX} characters.`;

  let itemsOk = true;
  if (value.items.length < 1 || value.items.length > 100) {
    errors.items = "Add between 1 and 100 line items.";
    itemsOk = false;
  } else {
    value.items.forEach((it, i) => {
      itemErrors(it, `items.${i}`, errors);
      if (Object.keys(errors).some((k) => k.startsWith(`items.${i}.`))) itemsOk = false;
    });
  }

  value.schedule.forEach((s, i) => {
    if (s.note.length > LIMITS.stageNote)
      errors[`schedule.${i}.note`] = `Keep this under ${LIMITS.stageNote} characters.`;
  });
  if (value.highlights.length > LIMITS.highlights)
    errors.highlights = `Use up to ${LIMITS.highlights} short facts.`;
  value.highlights.forEach((h, i) => {
    if (h.length > LIMITS.highlight)
      errors[`highlights.${i}`] = `Keep each fact under ${LIMITS.highlight} characters.`;
  });
  if (value.discountLabel.length > LIMITS.discountLabel)
    errors.discountLabel = `Keep the label under ${LIMITS.discountLabel} characters.`;
  if (value.runningCosts.length > LIMITS.runningCosts)
    errors.runningCosts = `Use up to ${LIMITS.runningCosts} rows.`;
  runningCostRows.forEach(({ row: r, index: i }) => {
    if (!r.service || r.service.length > LIMITS.rcService)
      errors[`runningCosts.${i}.service`] = "Name the service (up to 60 characters).";
    if (r.purpose.length > LIMITS.rcPurpose)
      errors[`runningCosts.${i}.purpose`] = "Keep this under 120 characters.";
    if (!r.cost || r.cost.length > LIMITS.rcCost)
      errors[`runningCosts.${i}.cost`] = "Add an estimated cost (up to 60 characters).";
  });
  for (const f of ["exclusions", "assumptions", "nextSteps", "optionalTitle"]) {
    if (value[f].length > LIMITS[f]) errors[f] = `Keep this under ${LIMITS[f]} characters.`;
  }
  if (value.optionalItems.length > LIMITS.optionalItems)
    errors.optionalItems = `Use up to ${LIMITS.optionalItems} optional items.`;
  optionalRows.forEach(({ row, index }) => itemErrors(row, `optionalItems.${index}`, errors));

  if (!Number.isInteger(value.discountMinor) || value.discountMinor < 0) {
    errors.discountMinor = "Enter a valid discount.";
  } else if (itemsOk && value.discountMinor > computeTotals(value.items).subtotalMinor) {
    errors.discountMinor = "The discount can't be more than the subtotal.";
  }

  const sched = scheduleError(value.schedule);
  if (sched) errors.schedule = sched;
  if (!Number.isInteger(value.validDays) || value.validDays < 1 || value.validDays > 90) {
    errors.validDays = "Validity must be 1 to 90 days.";
  }

  return { ok: Object.keys(errors).length === 0, errors, value };
}

function sendError(quote) {
  if (!quote.clientEmail || !EMAIL_RE.test(quote.clientEmail))
    return "Add the client's email address before sending.";
  if (!(quote.totalMinor > 0)) return "The quote total must be more than zero.";
  return null;
}

function quoteNumber(year, seq) {
  return `Q-${year}-${String(seq).padStart(4, "0")}`;
}

function invoiceNumber(qn, index) {
  return `${qn}-INV-${index + 1}`;
}

function paymentReference(qn, index) {
  let suffix = "";
  for (let i = 0; i < 8; i++) suffix += REF_ALPHABET[crypto.randomInt(REF_ALPHABET.length)];
  return `${qn}-${index + 1}-${suffix}`;
}

function stageStates(quote, payments, nowMs = Date.now()) {
  const paid = new Map();
  for (const p of payments || []) {
    if (p.status === "success" && p.stageId && !paid.has(p.stageId)) paid.set(p.stageId, p);
  }
  const due = (quote.payState && quote.payState.due) || {};
  const accepted = quote.status === "accepted";

  return stageAmounts(quote.totalMinor, quote.schedule).map((stage, index) => {
    const payment = paid.get(stage.id) || null;
    const isDue = accepted && (index === 0 || Boolean(due[stage.id]));
    const dueAt = isDue ? (index === 0 ? quote.respondedAt || null : due[stage.id]) : null;
    const state = payment ? "paid" : isDue ? "due" : "later";
    const overdue =
      state === "due" && Boolean(dueAt) && nowMs - Date.parse(dueAt) > INVOICE_DUE_DAYS * DAY_MS;
    return {
      ...stage,
      index,
      state,
      dueAt,
      overdue,
      invoiceNumber: invoiceNumber(quote.quoteNumber, index),
      paidAt: payment ? payment.paidAt || null : null,
      reference: payment ? payment.paystackReference || null : null,
    };
  });
}

function paymentSummary(stages) {
  const total = stages.reduce((t, s) => t + s.amountMinor, 0);
  const paidMinor = stages.filter((s) => s.state === "paid").reduce((t, s) => t + s.amountMinor, 0);
  return {
    paidMinor,
    balanceMinor: total - paidMinor,
    complete: stages.length > 0 && stages.every((s) => s.state === "paid"),
    nextDue: stages.find((s) => s.state === "due") || null,
  };
}

function isExpired(quote, nowMs = Date.now()) {
  return (
    quote.status === "sent" && Boolean(quote.validUntil) && Date.parse(quote.validUntil) < nowMs
  );
}

// The payments row for a quote stage. `amount` (major units) keeps the
// existing Payments tab working; `amountMinor` is what quote logic reads.
function paymentRow(quote, stage, fields) {
  return {
    kind: "quote",
    quoteId: quote.id,
    quoteNumber: quote.quoteNumber,
    stageId: stage.id,
    invoiceNumber: stage.invoiceNumber,
    clientName: quote.clientName,
    clientEmail: quote.clientEmail || "",
    amountMinor: stage.amountMinor,
    amount: stage.amountMinor / 100,
    currency: quote.currency,
    ...fields,
  };
}

/** Ghana Mobile Money networks a client can pick at checkout. */
const MOMO_NETWORKS = { mtn: "MTN", telecel: "Telecel", airteltigo: "AirtelTigo" };
const NETWORK_NOTE = "network:";

/** The network stored on a payment's note at checkout, if any. */
function networkFromNote(note) {
  if (typeof note !== "string" || !note.startsWith(NETWORK_NOTE)) return null;
  const id = note.slice(NETWORK_NOTE.length);
  return Object.prototype.hasOwnProperty.call(MOMO_NETWORKS, id) ? id : null;
}

module.exports = {
  MOMO_NETWORKS,
  NETWORK_NOTE,
  networkFromNote,
  CURRENCIES,
  STATUSES,
  DEFAULT_SCHEDULE,
  DEFAULT_TERMS,
  INVOICE_DUE_DAYS,
  DAY_MS,
  canMove,
  lineMinor,
  optionalTotals,
  LIMITS,
  NEEDS_DETAIL_LABELS,
  parseNeedsTables,
  computeTotals,
  stageAmounts,
  scheduleError,
  validateDraft,
  sendError,
  quoteNumber,
  invoiceNumber,
  paymentReference,
  stageStates,
  paymentSummary,
  isExpired,
  paymentRow,
};
