// Wires the real dependencies for the quote functions and the webhook.

const { getDatabases } = require("../appwrite");
const { createQuoteRepo } = require("./repo");
const { createLocks } = require("../locks");
const { createNotifier } = require("./notify");
const { initializeTransaction, verifyTransaction } = require("../paystack");
const { settleQuotePayment } = require("./settle");

function createServices() {
  const db = getDatabases();
  return {
    repo: createQuoteRepo(db),
    locks: createLocks(db),
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
