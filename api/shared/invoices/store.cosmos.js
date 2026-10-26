// The invoice, payment and alert lock rows the Paystack webhook reads and
// writes on Cosmos DB. Kept to what paystack-webhook/invoiceCharge.js
// needs, so that flow can be tested against shared/fakeCosmos.js.
//
// Every container is partitioned by id. Updates read the row, ask the caller
// what to change given what is stored now, and replace with an IfMatch etag,
// retrying when another writer got in between (shared/cosmosRows.js).

const { readById, updateWith } = require("../cosmosRows");

const INVOICES = "invoices";
const PAYMENTS = "payments";
const LOCKS = "locks";
async function queryFirst(container, query, parameters) {
  const { resources } = await container.items.query({ query, parameters }).fetchAll();
  return resources[0] || null;
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

    updatePayment: (id, decide) => updateWith(payments, id, decide, { now }),

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

    updateInvoice: (id, decide) => updateWith(invoices, id, decide, { now }),

    /** Notes on a lock row (shared/locks.js) that its holder keeps, by lock id. */
    updateLock: (id, decide) => updateWith(locks, id, decide, { now }),
  };
}

module.exports = { createCosmosInvoiceStore };
