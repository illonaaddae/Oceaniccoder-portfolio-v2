// In-memory stand-ins for the quote repo and locks, used by function tests.
// Same method names and return shapes as repo.js and locks.js.

const { quoteNumber } = require("./model");

function clone(v) {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}

function createFakeRepo({ quotes = [], payments = [] } = {}) {
  const q = new Map(quotes.map((x) => [x.id, clone(x)]));
  const p = new Map(payments.map((x) => [x.id, clone(x)]));
  let seq = q.size;
  let pseq = p.size;
  const inquiryStatus = {};
  const now = () => new Date().toISOString();

  return {
    quotes: q,
    payments: p,
    inquiryStatus,
    async get(id) {
      return clone(q.get(id)) || null;
    },
    async findByTokenHash(hash) {
      return clone([...q.values()].find((x) => x.tokenHash === hash)) || null;
    },
    async list() {
      return [...q.values()].map(clone);
    },
    async create(fields) {
      seq += 1;
      const doc = {
        ...clone(fields),
        id: `q${seq}`,
        quoteNumber: quoteNumber(2026, seq),
        createdAt: now(),
      };
      q.set(doc.id, doc);
      return clone(doc);
    },
    async update(id, patch) {
      const doc = { ...q.get(id), ...clone(patch), updatedAt: now() };
      q.set(id, doc);
      return clone(doc);
    },
    async listPayments(qn) {
      return [...p.values()].filter((x) => x.quoteNumber === qn).map(clone);
    },
    async listQuotePayments() {
      return [...p.values()].filter((x) => x.kind === "quote").map(clone);
    },
    async findPaymentByReference(ref) {
      return clone([...p.values()].find((x) => x.paystackReference === ref)) || null;
    },
    async createPayment(fields) {
      pseq += 1;
      const doc = { ...clone(fields), id: `p${pseq}`, createdAt: fields.createdAt || now() };
      p.set(doc.id, doc);
      return clone(doc);
    },
    async updatePayment(id, patch) {
      const doc = { ...p.get(id), ...clone(patch) };
      p.set(id, doc);
      return clone(doc);
    },
    async setInquiryStatus(id, status) {
      if (id) inquiryStatus[id] = status;
    },
  };
}

function createFakeLocks() {
  const held = new Set();
  return {
    held,
    async take(key) {
      if (held.has(key)) return false;
      held.add(key);
      return true;
    },
    async release(key) {
      held.delete(key);
    },
  };
}

module.exports = { createFakeRepo, createFakeLocks };
