// Every Appwrite read and write for quotes and quote payments. This is the
// only module that changes when the quote flow moves to Cosmos.

const { sdk, DATABASE_ID } = require("../appwrite");
const { quoteNumber } = require("./model");

const { Query, ID } = sdk;
const QUOTES = "quotes";
const PAYMENTS = "payments";
const INQUIRIES = "project_inquiries";

// Stored as JSON strings; parsed on the way out.
const JSON_FIELDS = { items: [], schedule: [], payState: { due: {} } };
const SKIP_ON_WRITE = new Set(["id", "createdAt", "updatedAt"]);

function parse(raw, fallback) {
  if (raw == null || raw === "") return fallback;
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function toQuote(doc) {
  if (!doc) return null;
  const q = { ...doc, id: doc.$id, createdAt: doc.$createdAt, updatedAt: doc.$updatedAt };
  for (const [key, fallback] of Object.entries(JSON_FIELDS)) q[key] = parse(doc[key], fallback);
  return q;
}

function toDoc(patch) {
  const out = {};
  for (const [key, value] of Object.entries(patch)) {
    if (key.startsWith("$") || SKIP_ON_WRITE.has(key)) continue;
    out[key] = key in JSON_FIELDS ? JSON.stringify(value) : value;
  }
  return out;
}

function toPayment(doc) {
  if (!doc) return null;
  const amountMinor = Number.isInteger(doc.amountMinor)
    ? doc.amountMinor
    : Math.round(Number(doc.amount || 0) * 100);
  return { ...doc, id: doc.$id, createdAt: doc.$createdAt, amountMinor };
}

const isCode = (err, code) => Boolean(err) && err.code === code;

function createQuoteRepo(db) {
  return {
    async get(id) {
      try {
        return toQuote(await db.getDocument(DATABASE_ID, QUOTES, id));
      } catch (err) {
        if (isCode(err, 404)) return null;
        throw err;
      }
    },

    async findByTokenHash(hash) {
      const r = await db.listDocuments(DATABASE_ID, QUOTES, [
        Query.equal("tokenHash", [hash]),
        Query.limit(1),
      ]);
      return toQuote(r.documents[0]);
    },

    async list() {
      const r = await db.listDocuments(DATABASE_ID, QUOTES, [
        Query.orderDesc("$createdAt"),
        Query.limit(100),
      ]);
      return r.documents.map(toQuote);
    },

    // Numbers are sequential per year. The unique index on quoteNumber turns
    // two admins creating at once into a retry instead of a duplicate.
    async create(fields, year = new Date().getFullYear()) {
      const last = await db.listDocuments(DATABASE_ID, QUOTES, [
        Query.startsWith("quoteNumber", `Q-${year}-`),
        Query.orderDesc("quoteNumber"),
        Query.limit(1),
      ]);
      const start = last.documents[0] ? Number(last.documents[0].quoteNumber.slice(-4)) + 1 : 1;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const data = toDoc({ ...fields, quoteNumber: quoteNumber(year, start + attempt) });
          return toQuote(await db.createDocument(DATABASE_ID, QUOTES, ID.unique(), data));
        } catch (err) {
          if (!isCode(err, 409)) throw err;
        }
      }
      throw new Error("Could not allocate a quote number");
    },

    async update(id, patch) {
      return toQuote(await db.updateDocument(DATABASE_ID, QUOTES, id, toDoc(patch)));
    },

    async listPayments(qn) {
      const r = await db.listDocuments(DATABASE_ID, PAYMENTS, [
        Query.equal("quoteNumber", [qn]),
        Query.orderDesc("$createdAt"),
        Query.limit(100),
      ]);
      return r.documents.map(toPayment);
    },

    async listQuotePayments() {
      const r = await db.listDocuments(DATABASE_ID, PAYMENTS, [
        Query.equal("kind", ["quote"]),
        Query.limit(500),
      ]);
      return r.documents.map(toPayment);
    },

    async findPaymentByReference(reference) {
      const r = await db.listDocuments(DATABASE_ID, PAYMENTS, [
        Query.equal("paystackReference", [reference]),
        Query.limit(1),
      ]);
      return toPayment(r.documents[0]);
    },

    async createPayment(fields) {
      return toPayment(await db.createDocument(DATABASE_ID, PAYMENTS, ID.unique(), fields));
    },

    async updatePayment(id, patch) {
      return toPayment(await db.updateDocument(DATABASE_ID, PAYMENTS, id, patch));
    },

    // Best effort: the inquiry may have been deleted, or the status attribute
    // may not allow the value yet. Neither should fail a quote action.
    async setInquiryStatus(id, status) {
      if (!id) return;
      try {
        await db.updateDocument(DATABASE_ID, INQUIRIES, id, { status });
      } catch {
        /* see comment above */
      }
    },
  };
}

module.exports = { createQuoteRepo, toQuote, toDoc };
