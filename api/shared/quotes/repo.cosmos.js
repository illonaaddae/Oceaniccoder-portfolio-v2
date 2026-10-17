// The quote repo on Cosmos DB, used when DATA_BACKEND=cosmos. Same methods,
// arguments and return shapes as repo.js; fakes.js mirrors both, and
// contract.test.js runs the same checks against fakes.js and this file.
//
// Differences from Appwrite that callers can't see:
//   - Updates read, merge and replace with an IfMatch etag, retrying when
//     another writer got in between. (Patch would avoid the read, but allows
//     only 10 operations per request.)
//   - Unique keys only apply inside one partition, and quotes are partitioned
//     by id, so a quote number is reserved through a lock row instead of a
//     unique index.
//   - A payment with a Paystack reference gets an id derived from it, so a
//     second row for the same reference fails with 409. Rows imported from
//     Appwrite keep their old ids and are found by query.
//   - JSON fields are written as JSON. Rows imported from Appwrite hold them
//     as strings; reads accept both.

const crypto = require("crypto");
const { newId } = require("../cosmos");
const { quoteNumber } = require("./model");

const QUOTES = "quotes";
const PAYMENTS = "payments";
const INQUIRIES = "project_inquiries";
const INVOICES = "invoices";

// Same fields and fallbacks as repo.js.
const JSON_FIELDS = {
  items: [],
  schedule: [],
  payState: { due: {} },
  highlights: [],
  runningCosts: [],
  optionalItems: [],
  extras: {},
};
const SKIP_ON_WRITE = new Set(["id", "createdAt", "updatedAt"]);
const SYSTEM_FIELDS = ["_rid", "_self", "_etag", "_attachments", "_ts"];
// The first replace plus three retries when the etag no longer matches.
const MAX_REPLACE_ATTEMPTS = 4;
const NUMBER_ATTEMPTS = 5;

const isCode = (err, code) => Boolean(err) && err.code === code;

/** Payment id for a Paystack reference: one row per reference. */
function paymentIdFor(reference) {
  return `pi_${crypto.createHash("sha256").update(reference).digest("hex")}`;
}

function withoutSystemFields(doc) {
  const out = { ...doc };
  for (const key of SYSTEM_FIELDS) delete out[key];
  return out;
}

function parse(raw, fallback) {
  if (raw === null || raw === undefined || raw === "") return structuredClone(fallback);
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return structuredClone(fallback);
  }
}

function toQuote(doc) {
  if (!doc) return null;
  const q = withoutSystemFields(doc);
  for (const [key, fallback] of Object.entries(JSON_FIELDS)) q[key] = parse(doc[key], fallback);
  return q;
}

function toPayment(doc) {
  if (!doc) return null;
  const amountMinor = Number.isInteger(doc.amountMinor)
    ? doc.amountMinor
    : Math.round(Number(doc.amount || 0) * 100);
  return { ...withoutSystemFields(doc), amountMinor };
}

function toInvoice(doc) {
  return doc ? withoutSystemFields(doc) : null;
}

// repo.js toDoc rules: id fields and `$` keys are never written. `_` keys are
// Cosmos system fields. An undefined value leaves the field as it is, as the
// Appwrite SDK does when it serialises the patch.
function cleanPatch(patch) {
  const out = {};
  for (const [key, value] of Object.entries(patch || {})) {
    if (key.startsWith("$") || key.startsWith("_") || SKIP_ON_WRITE.has(key)) continue;
    if (value !== undefined) out[key] = value;
  }
  return out;
}

function notFound(id) {
  return Object.assign(new Error(`Document not found: ${id}`), { code: 404 });
}

// Point read by id (every container here is partitioned by id). The SDK
// resolves a missing item with an undefined resource; older versions threw 404.
async function readById(container, id) {
  if (typeof id !== "string" || !id) return null;
  try {
    const { resource } = await container.item(id, id).read();
    return resource || null;
  } catch (err) {
    if (isCode(err, 404)) return null;
    throw err;
  }
}

async function queryAll(container, query, parameters = []) {
  const { resources } = await container.items.query({ query, parameters }).fetchAll();
  return resources;
}

// Newest first by createdAt, sorted here rather than with ORDER BY: Cosmos
// leaves out items that lack the ORDER BY field, and every row must show.
function newestFirst(rows) {
  const key = (row) => String(row.createdAt || "");
  return rows.sort((a, b) => (key(a) > key(b) ? -1 : key(a) < key(b) ? 1 : 0));
}

// Read, merge, replace if nobody changed the row meanwhile. Returns the row
// as stored. Throws 404 for a missing row, like Appwrite's updateDocument.
async function mergeAndReplace(container, id, patch) {
  const changes = cleanPatch(patch);
  for (let attempt = 1; ; attempt++) {
    const current = await readById(container, id);
    if (!current) throw notFound(id);
    const next = {
      ...withoutSystemFields(current),
      ...changes,
      updatedAt: new Date().toISOString(),
    };
    try {
      const { resource } = await container.item(id, id).replace(next, {
        accessCondition: { type: "IfMatch", condition: current._etag },
      });
      return resource;
    } catch (err) {
      if (!isCode(err, 412) || attempt >= MAX_REPLACE_ATTEMPTS) throw err;
    }
  }
}

function createCosmosQuoteRepo(db, { locks } = {}) {
  if (!locks) throw new Error("createCosmosQuoteRepo needs locks to reserve quote numbers");
  const quotes = db.container(QUOTES);
  const payments = db.container(PAYMENTS);
  const invoices = db.container(INVOICES);
  const inquiries = db.container(INQUIRIES);

  return {
    async get(id) {
      return toQuote(await readById(quotes, id));
    },

    async findByTokenHash(hash) {
      const [row] = await queryAll(quotes, "SELECT TOP 1 * FROM c WHERE c.tokenHash = @hash", [
        { name: "@hash", value: hash },
      ]);
      return toQuote(row);
    },

    // Every quote, newest first.
    async list() {
      return newestFirst(await queryAll(quotes, "SELECT * FROM c")).map(toQuote);
    },

    // Numbers are sequential per year. Each number is reserved with a lock
    // before the quote is written, so two admins creating at once get
    // different numbers; a taken number moves on to the next one.
    async create(fields, year = new Date().getFullYear()) {
      const [last] = await queryAll(
        quotes,
        "SELECT TOP 1 c.quoteNumber FROM c WHERE STARTSWITH(c.quoteNumber, @prefix) ORDER BY c.quoteNumber DESC",
        [{ name: "@prefix", value: `Q-${year}-` }],
      );
      const start = last ? Number(last.quoteNumber.slice(-4)) + 1 : 1;
      for (let attempt = 0; attempt < NUMBER_ATTEMPTS; attempt++) {
        const number = quoteNumber(year, start + attempt);
        const key = `quoteNumber:${number}`;
        if (!(await locks.take(key))) continue;
        try {
          const now = new Date().toISOString();
          const { resource } = await quotes.items.create({
            ...cleanPatch(fields),
            id: newId(),
            quoteNumber: number,
            createdAt: now,
            updatedAt: now,
          });
          return toQuote(resource);
        } catch (err) {
          // Free the number for the next create; the write error matters more
          // than a failed release.
          await locks.release(key).catch(() => {});
          throw err;
        }
      }
      throw new Error("Could not allocate a quote number");
    },

    // Accepted quotes whose maintenance offer hasn't gone out yet (the field
    // missing or null). The caller checks the rest.
    async listMaintenanceCandidates() {
      const rows = await queryAll(
        quotes,
        "SELECT * FROM c WHERE c.status = @status AND (NOT IS_DEFINED(c.maintenanceOfferSentAt) OR IS_NULL(c.maintenanceOfferSentAt))",
        [{ name: "@status", value: "accepted" }],
      );
      return newestFirst(rows).slice(0, 500).map(toQuote);
    },

    async update(id, patch) {
      return toQuote(await mergeAndReplace(quotes, id, patch));
    },

    async listPayments(qn) {
      const rows = await queryAll(payments, "SELECT * FROM c WHERE c.quoteNumber = @qn", [
        { name: "@qn", value: qn },
      ]);
      return newestFirst(rows).slice(0, 100).map(toPayment);
    },

    // Every quote payment row, newest first.
    async listQuotePayments() {
      const rows = await queryAll(payments, "SELECT * FROM c WHERE c.kind = @kind", [
        { name: "@kind", value: "quote" },
      ]);
      return newestFirst(rows).map(toPayment);
    },

    // Payment rows recorded against one invoice number. A missing number is
    // refused, as Appwrite refuses Query.equal on undefined.
    async listInvoicePayments(invoiceNumber) {
      if (invoiceNumber === undefined || invoiceNumber === null)
        throw Object.assign(new Error("Invalid query: Value must not be empty"), { code: 400 });
      const rows = await queryAll(payments, "SELECT * FROM c WHERE c.invoiceNumber = @number", [
        { name: "@number", value: invoiceNumber },
      ]);
      return newestFirst(rows).slice(0, 100).map(toPayment);
    },

    // New rows sit at the id derived from the reference; rows imported from
    // Appwrite keep their old ids, so fall back to a query.
    async findPaymentByReference(reference) {
      if (typeof reference !== "string" || !reference) return null;
      const direct = await readById(payments, paymentIdFor(reference));
      if (direct && direct.paystackReference === reference) return toPayment(direct);
      const [row] = await queryAll(
        payments,
        "SELECT TOP 1 * FROM c WHERE c.paystackReference = @reference",
        [{ name: "@reference", value: reference }],
      );
      return toPayment(row);
    },

    async getPayment(id) {
      return toPayment(await readById(payments, id));
    },

    // A second row for the same Paystack reference fails with code 409.
    async createPayment(fields) {
      const reference = fields && fields.paystackReference;
      const now = new Date().toISOString();
      const { resource } = await payments.items.create({
        ...cleanPatch(fields),
        id: typeof reference === "string" && reference ? paymentIdFor(reference) : newId(),
        createdAt: now,
        updatedAt: now,
      });
      return toPayment(resource);
    },

    async updatePayment(id, patch) {
      return toPayment(await mergeAndReplace(payments, id, patch));
    },

    async getInvoice(id) {
      return toInvoice(await readById(invoices, id));
    },

    async updateInvoice(id, patch) {
      return toInvoice(await mergeAndReplace(invoices, id, patch));
    },

    // Best effort, as in repo.js: the inquiry may have been deleted, and that
    // must not fail a quote action.
    async setInquiryStatus(id, status) {
      if (!id) return;
      try {
        await mergeAndReplace(inquiries, id, { status });
      } catch {
        /* see comment above */
      }
    },
  };
}

module.exports = { createCosmosQuoteRepo, paymentIdFor };
