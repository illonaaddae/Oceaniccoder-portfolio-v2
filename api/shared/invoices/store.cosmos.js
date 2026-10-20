// The invoice and payment rows the Paystack webhook reads and writes on
// Cosmos DB (DATA_BACKEND=cosmos). Kept to what paystack-webhook/invoiceCharge.js
// needs, so that flow can be tested against shared/fakeCosmos.js.
//
// Both containers are partitioned by id. Updates read the row, ask the caller
// what to change given what is stored now, and replace with an IfMatch etag,
// retrying when another writer got in between.

const INVOICES = "invoices";
const PAYMENTS = "payments";
const LOCKS = "locks";
// The first replace plus three retries when the etag no longer matches.
const MAX_REPLACE_ATTEMPTS = 4;

const isCode = (err, code) => Boolean(err) && err.code === code;

async function readById(container, id) {
  try {
    const { resource } = await container.item(id, id).read();
    return resource || null;
  } catch (err) {
    // Older SDK versions threw 404 for a missing item instead of resolving.
    if (isCode(err, 404)) return null;
    throw err;
  }
}

async function queryFirst(container, query, parameters) {
  const { resources } = await container.items.query({ query, parameters }).fetchAll();
  return resources[0] || null;
}

/**
 * Read, decide, replace if nobody changed the row meanwhile.
 * `decide(current)` returns the fields to change, or null to leave the row
 * alone. Resolves { doc, changed } with the row as stored. A missing row
 * throws 404; a 412 on the last attempt is rethrown.
 */
async function updateWith(container, id, decide, now) {
  for (let attempt = 1; ; attempt++) {
    const current = await readById(container, id);
    if (!current) throw Object.assign(new Error(`Document not found: ${id}`), { code: 404 });
    const changes = decide(current);
    if (!changes) return { doc: current, changed: false };
    const { _rid, _self, _etag, _attachments, _ts, ...fields } = current;
    try {
      const { resource } = await container
        .item(id, id)
        .replace(
          { ...fields, ...changes, updatedAt: now().toISOString() },
          { accessCondition: { type: "IfMatch", condition: _etag } },
        );
      return { doc: resource, changed: true };
    } catch (err) {
      if (!isCode(err, 412) || attempt >= MAX_REPLACE_ATTEMPTS) throw err;
    }
  }
}

function createCosmosInvoiceStore(db, { now = () => new Date() } = {}) {
  const invoices = db.container(INVOICES);
  const payments = db.container(PAYMENTS);
  const locks = db.container(LOCKS);

  return {
    readPayment: (id) => readById(payments, id),

    findPaymentByReference: (reference) =>
      queryFirst(payments, "SELECT TOP 1 * FROM c WHERE c.paystackReference = @reference", [
        { name: "@reference", value: reference },
      ]),

    /** Creates the row as given (id included). A taken id throws code 409. */
    async createPayment(doc) {
      const stamp = now().toISOString();
      const { resource } = await payments.items.create({
        ...doc,
        createdAt: stamp,
        updatedAt: stamp,
      });
      return resource;
    },

    updatePayment: (id, decide) => updateWith(payments, id, decide, now),

    /** Up to two invoices with that number: enough to tell one from several. */
    async findInvoicesByNumber(invoiceNumber) {
      const { resources } = await invoices.items
        .query({
          query: "SELECT TOP 2 * FROM c WHERE c.invoiceNumber = @number",
          parameters: [{ name: "@number", value: invoiceNumber }],
        })
        .fetchAll();
      return resources;
    },

    readInvoice: (id) => readById(invoices, id),

    updateInvoice: (id, decide) => updateWith(invoices, id, decide, now),

    /** Notes on a lock row (shared/locks.js) that its holder keeps, by lock id. */
    updateLock: (id, decide) => updateWith(locks, id, decide, now),
  };
}

module.exports = { createCosmosInvoiceStore, MAX_REPLACE_ATTEMPTS };
