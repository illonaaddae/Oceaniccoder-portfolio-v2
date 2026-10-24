// Wires the real dependencies for the quote functions and the webhook.
// Quotes, payments and locks live in Cosmos DB whatever DATA_BACKEND says;
// WRITE_HOLD pauses the service while data moves (see ../backend.js).

const { getDatabase } = require("../cosmos");
const { writeHold } = require("../backend");
const { HttpError } = require("../http");
const { createCosmosQuoteRepo } = require("./repo.cosmos");
const { createCosmosLocks } = require("../locks");
const { createNotifier } = require("./notify");
const { initializeTransaction, verifyTransaction } = require("../paystack");
const { settleQuotePayment } = require("./settle");

const WRITE_HOLD_MESSAGE =
  "Quotes and payments are paused for maintenance. Please try again in under an hour.";

function createStores() {
  const db = getDatabase();
  const locks = createCosmosLocks(db);
  return { repo: createCosmosQuoteRepo(db, { locks }), locks };
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
