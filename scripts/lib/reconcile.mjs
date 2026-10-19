// What scripts/reconcile-paystack.mjs decides, kept free of network access so
// it is unit-tested (reconcile.test.mjs).

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { paymentIdFor } = require("../../api/shared/quotes/repo.cosmos.js");

export class UsageError extends Error {}

// A runaway loop guard: 100 per page, so this is 100,000 transactions.
const MAX_PAGES = 1000;

/** Command-line arguments → { since } as an ISO string. Throws UsageError. */
export function parseReconcileArgs(argv) {
  let since;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--since") {
      since = argv[i + 1];
      i++;
    } else if (arg === "--apply") {
      throw new UsageError(
        "--apply is not implemented: this script only reports. Replay each missing payment from the Paystack dashboard.",
      );
    } else {
      throw new UsageError(`unknown argument: ${arg}`);
    }
  }
  if (!since) throw new UsageError("--since <ISO time> is required");
  if (!/^\d{4}-\d{2}-\d{2}/.test(since) || Number.isNaN(Date.parse(since))) {
    throw new UsageError(`--since must be an ISO date or time, not "${since}"`);
  }
  return { since: new Date(since).toISOString() };
}

/**
 * Every successful transaction since `since`. `fetchPage(page)` answers with
 * Paystack's list body ({ data, meta: { page, pageCount } }).
 */
export async function listSuccessfulTransactions(fetchPage) {
  const all = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const body = await fetchPage(page);
    if (!body || !Array.isArray(body.data)) {
      throw new Error(`Paystack page ${page} has no data list`);
    }
    all.push(...body.data);
    const pageCount = Number(body.meta?.pageCount);
    if (body.data.length === 0 || !(pageCount > page)) return all;
  }
  throw new Error(`stopped after ${MAX_PAGES} pages of Paystack transactions`);
}

/**
 * Transactions with no payments row. A row counts when its paystackReference
 * is the reference (rows imported from Appwrite keep their old ids) or its id
 * is the one the Cosmos webhook derives from the reference.
 */
export function findUnrecorded(transactions, payments) {
  const references = new Set();
  const ids = new Set();
  for (const payment of payments) {
    if (typeof payment.paystackReference === "string") references.add(payment.paystackReference);
    ids.add(payment.id);
  }
  return transactions.filter((tx) => {
    if (typeof tx.reference !== "string" || !tx.reference) return true;
    return !references.has(tx.reference) && !ids.has(paymentIdFor(tx.reference));
  });
}

/** One report line for a transaction; amounts arrive in minor units. */
export function describeTransaction(tx) {
  const amount = typeof tx.amount === "number" ? (tx.amount / 100).toFixed(2) : "?";
  return `${tx.reference ?? "(no reference)"}  ${tx.paid_at ?? "?"}  ${amount} ${tx.currency ?? ""}`.trimEnd();
}
