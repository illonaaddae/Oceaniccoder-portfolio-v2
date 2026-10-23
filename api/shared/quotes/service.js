// Wires the real dependencies for the quote functions and the webhook.
// DATA_BACKEND picks Appwrite or Cosmos; WRITE_HOLD pauses the service while
// the data moves (see ../backend.js).

const { getDatabases } = require("../appwrite");
const { getDatabase } = require("../cosmos");
const { dataBackend, writeHold } = require("../backend");
const { HttpError } = require("../http");
const { createQuoteRepo } = require("./repo");
const { createCosmosQuoteRepo } = require("./repo.cosmos");
const { createLocks, createCosmosLocks } = require("../locks");
const { createNotifier } = require("./notify");
const { initializeTransaction, verifyTransaction } = require("../paystack");
const { settleQuotePayment } = require("./settle");

const WRITE_HOLD_MESSAGE =
  "Quotes and payments are paused for maintenance. Please try again in under an hour.";

function createStores() {
  if (dataBackend() === "cosmos") {
    const db = getDatabase();
    const locks = createCosmosLocks(db);
    return { repo: createCosmosQuoteRepo(db, { locks }), locks };
  }
  const db = getDatabases();
  return { repo: createQuoteRepo(db), locks: createLocks(db) };
}

// Every quote function calls this inside its try, so the 503 reaches the
// client through handleError. The webhook answers 500 instead, which Paystack
// retries the same way.
function createServices() {
  if (writeHold()) throw new HttpError(503, WRITE_HOLD_MESSAGE);
  return {
    ...createStores(),
    verify: verifyTransaction,
    initialize: initializeTransaction,
    notify: createNotifier(),
    now: () => new Date(),
  };
}

async function handleQuoteCharge(reference, services = createServices()) {
  return settleQuotePayment({ ...services, now: () => services.now().toISOString(), reference });
}

module.exports = { createServices, handleQuoteCharge };
