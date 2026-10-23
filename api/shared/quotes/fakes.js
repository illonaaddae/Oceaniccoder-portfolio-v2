// In-memory stand-ins for the quote repo and locks, used by function tests.
// They mirror repo.js and locks.js: same method names and return shapes, the
// same defaults for missing JSON fields, the same 404 on a missing id, the
// same amountMinor fill, and the same numbering and ordering.

const { quoteNumber } = require("./model");
const { createCosmosLocks } = require("../locks");
const { createFakeCosmos } = require("../fakeCosmos");

const JSON_DEFAULTS = {
  items: [],
  schedule: [],
  payState: { due: {} },
  highlights: [],
  runningCosts: [],
  optionalItems: [],
  extras: {},
};
const SKIP_ON_WRITE = new Set(["id", "createdAt", "updatedAt"]);

const clone = (v) => (v == null ? v : structuredClone(v));
const now = () => new Date().toISOString();

function notFound() {
  return Object.assign(new Error("Document not found"), { code: 404 });
}

// Same rules as repo.js toDoc: drop id fields and $-prefixed keys.
function cleanPatch(patch) {
  const out = {};
  for (const [key, value] of Object.entries(patch || {})) {
    if (key.startsWith("$") || SKIP_ON_WRITE.has(key)) continue;
    out[key] = clone(value);
  }
  return out;
}

// Same defaults as repo.js toQuote, applied on every read.
function toQuote(doc) {
  if (!doc) return null;
  const q = clone(doc);
  for (const [key, fallback] of Object.entries(JSON_DEFAULTS)) {
    if (q[key] == null) q[key] = clone(fallback);
  }
  return q;
}

// Same rule as repo.js toPayment.
function toPayment(doc) {
  if (!doc) return null;
  const p = clone(doc);
  p.amountMinor = Number.isInteger(doc.amountMinor)
    ? doc.amountMinor
    : Math.round(Number(doc.amount || 0) * 100);
  return p;
}

function freshId(map, prefix) {
  let n = map.size;
  let id;
  do {
    n += 1;
    id = `${prefix}${n}`;
  } while (map.has(id));
  return id;
}

function createFakeRepo({ quotes = [], payments = [], invoices = [] } = {}) {
  const q = new Map(quotes.map((x) => [x.id, clone(x)]));
  const p = new Map(payments.map((x) => [x.id, clone(x)]));
  const inv = new Map(invoices.map((x) => [x.id, clone(x)]));
  const inquiryStatus = {};

  // Next sequence for a year: highest existing NNNN for that year, plus one.
  function nextSeq(year) {
    const prefix = `Q-${year}-`;
    let max = 0;
    for (const x of q.values()) {
      if (typeof x.quoteNumber === "string" && x.quoteNumber.startsWith(prefix)) {
        max = Math.max(max, Number(x.quoteNumber.slice(prefix.length)) || 0);
      }
    }
    return max + 1;
  }

  // Insertion order stands in for Appwrite's $createdAt desc order.
  const newestFirst = (map) => [...map.values()].reverse();

  return {
    quotes: q,
    payments: p,
    invoices: inv,
    inquiryStatus,
    async get(id) {
      return toQuote(q.get(id));
    },
    async findByTokenHash(hash) {
      return toQuote([...q.values()].find((x) => x.tokenHash === hash));
    },
    async list() {
      return newestFirst(q).map(toQuote);
    },
    async create(fields, year = 2026) {
      const id = freshId(q, "q");
      const doc = {
        ...cleanPatch(fields),
        id,
        quoteNumber: quoteNumber(year, nextSeq(year)),
        createdAt: now(),
      };
      q.set(id, doc);
      return toQuote(doc);
    },
    // Same filter as repo.js: accepted, offer not sent yet.
    async listMaintenanceCandidates() {
      return newestFirst(q)
        .filter((x) => x.status === "accepted" && !x.maintenanceOfferSentAt)
        .map(toQuote);
    },
    async update(id, patch) {
      const current = q.get(id);
      if (!current) throw notFound();
      const doc = { ...current, ...cleanPatch(patch), updatedAt: now() };
      q.set(id, doc);
      return toQuote(doc);
    },
    async listPayments(qn) {
      return newestFirst(p)
        .filter((x) => x.quoteNumber === qn)
        .map(toPayment);
    },
    async listQuotePayments() {
      return newestFirst(p)
        .filter((x) => x.kind === "quote")
        .map(toPayment);
    },
    // Like Appwrite, Query.equal with an undefined value is rejected.
    async listInvoicePayments(invoiceNumber) {
      if (invoiceNumber === undefined || invoiceNumber === null)
        throw Object.assign(new Error("Invalid query: Value must not be empty"), { code: 400 });
      return newestFirst(p)
        .filter((x) => x.invoiceNumber === invoiceNumber)
        .map(toPayment);
    },
    async findPaymentByReference(ref) {
      return toPayment([...p.values()].find((x) => x.paystackReference === ref));
    },
    async getPayment(id) {
      return toPayment(p.get(id));
    },
    async createPayment(fields) {
      const id = freshId(p, "p");
      const doc = { ...cleanPatch(fields), id, createdAt: fields.createdAt || now() };
      p.set(id, doc);
      return toPayment(doc);
    },
    async updatePayment(id, patch) {
      const current = p.get(id);
      if (!current) throw notFound();
      const doc = { ...current, ...cleanPatch(patch) };
      p.set(id, doc);
      return toPayment(doc);
    },
    async getInvoice(id) {
      return inv.has(id) ? clone(inv.get(id)) : null;
    },
    async updateInvoice(id, patch) {
      const current = inv.get(id);
      if (!current) throw notFound();
      const doc = { ...current, ...cleanPatch(patch) };
      inv.set(id, doc);
      return clone(doc);
    },
    async setInquiryStatus(id, status) {
      if (id) inquiryStatus[id] = status;
    },
  };
}

// `now` stamps each lock's creation time, like Appwrite's $createdAt.
function createFakeLocks({ now = () => Date.now() } = {}) {
  const held = new Set();
  const createdAt = new Map();
  return {
    held,
    async take(key) {
      if (held.has(key)) return false;
      held.add(key);
      createdAt.set(key, new Date(now()).toISOString());
      return true;
    },
    async release(key) {
      createdAt.delete(key);
      return held.delete(key);
    },
    async listBefore(beforeIso, cap = 5000) {
      return [...held]
        .map((key) => ({ key, createdAt: createdAt.get(key) }))
        .filter((row) => row.createdAt < beforeIso)
        .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
        .slice(0, cap);
    },
    async has(key) {
      return held.has(key);
    },
  };
}

// The real Cosmos locks over the in-memory Cosmos fake, with the same `held`
// view as createFakeLocks, so a test written against one runs on the other.
function createFakeCosmosLocks({ now = () => Date.now() } = {}) {
  const db = createFakeCosmos();
  return Object.defineProperty(createCosmosLocks(db, { now }), "held", {
    get: () => new Set([...db.container("locks").docs.values()].map((doc) => doc.key)),
  });
}

module.exports = { createFakeRepo, createFakeLocks, createFakeCosmosLocks };
