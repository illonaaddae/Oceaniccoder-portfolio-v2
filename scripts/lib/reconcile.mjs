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

// Payment row statuses (api/shared/quotes/model.js, the invoice webhook).
// quote-pay writes `pending` before the charge, so a row alone proves nothing.
const SETTLED = new Set(["success", "paid"]);
// Settled after looking at the charge, but with money to sort out by hand
// (a mismatch, a second charge, a refund). Replaying the webhook won't change them.
const SETTLED_WITH_PROBLEM = new Set(["failed", "duplicate", "refunded"]);

/**
 * Sorts transactions by what Cosmos holds for them. A row matches when its
 * paystackReference is the reference (rows imported from Appwrite keep their
 * old ids) or its id is the one the Cosmos webhook derives from it.
 *   unrecorded  no row at all
 *   unsettled   rows exist, none settled (pending, abandoned, no status)
 *   problems    settled as failed, duplicate or refunded
 * unsettled and problems hold { transaction, status }.
 */
export function reconcileTransactions(transactions, payments) {
  const byReference = new Map();
  const byId = new Map(payments.map((p) => [p.id, p]));
  for (const payment of payments) {
    if (typeof payment.paystackReference !== "string") continue;
    const list = byReference.get(payment.paystackReference) ?? [];
    list.push(payment);
    byReference.set(payment.paystackReference, list);
  }

  const result = { unrecorded: [], unsettled: [], problems: [] };
  for (const tx of transactions) {
    const hasReference = typeof tx.reference === "string" && tx.reference;
    const rows = hasReference ? [...(byReference.get(tx.reference) ?? [])] : [];
    const derived = hasReference && byId.get(paymentIdFor(tx.reference));
    if (derived && !rows.includes(derived)) rows.push(derived);

    if (rows.length === 0) result.unrecorded.push(tx);
    else if (rows.some((r) => SETTLED.has(r.status))) continue;
    else {
      const problem = rows.find((r) => SETTLED_WITH_PROBLEM.has(r.status));
      const target = problem ? result.problems : result.unsettled;
      target.push({ transaction: tx, status: (problem ?? rows[0]).status ?? null });
    }
  }
  return result;
}

/** One report line for a transaction; amounts arrive in minor units. */
export function describeTransaction(tx) {
  const amount = typeof tx.amount === "number" ? (tx.amount / 100).toFixed(2) : "?";
  return `${tx.reference ?? "(no reference)"}  ${tx.paid_at ?? "?"}  ${amount} ${tx.currency ?? ""}`.trimEnd();
}
