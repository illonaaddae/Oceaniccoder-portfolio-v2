// What scripts/reconcile-paystack.mjs decides, kept free of network access so
// it is unit-tested (reconcile.test.mjs).

import { createRequire } from "node:module";
import { parseZonedTime } from "./zoned-time.mjs";

const require = createRequire(import.meta.url);
const { paymentIdFor } = require("../../api/shared/quotes/repo.cosmos.js");

export class UsageError extends Error {}

// A runaway loop guard: 100 per page, so this is 100,000 transactions.
const MAX_PAGES = 1000;

const MODES = new Set(["live", "test"]);

/** Command-line arguments → { since (ISO string), mode }. Throws UsageError. */
export function parseReconcileArgs(argv) {
  let since;
  let mode;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--since") {
      since = argv[i + 1];
      i++;
    } else if (arg === "--mode") {
      mode = argv[i + 1];
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
  const zoned = parseZonedTime(since);
  if (!zoned) {
    throw new UsageError(`--since needs a time with Z or an offset, e.g. 2026-10-27T18:00:00Z`);
  }
  if (!MODES.has(mode)) throw new UsageError("--mode live or --mode test is required");
  return { since: zoned, mode };
}

/** "live" or "test" from a Paystack secret key's prefix. Never echoes the key. */
export function paystackKeyMode(key) {
  if (!key) throw new UsageError("PAYSTACK_SECRET_KEY must be set");
  if (typeof key === "string" && key.startsWith("sk_live_")) return "live";
  if (typeof key === "string" && key.startsWith("sk_test_")) return "test";
  throw new UsageError("PAYSTACK_SECRET_KEY is not a Paystack secret key (sk_live_ or sk_test_)");
}

/** The host of COSMOS_ENDPOINT, to show which account is read. */
export function cosmosHost(endpoint) {
  try {
    return new URL(endpoint).host;
  } catch {
    return "(unreadable COSMOS_ENDPOINT)";
  }
}

const txKey = (tx) => tx.id ?? tx.reference;

export async function listSuccessfulTransactions(fetchPage, perPage) {
  const all = [];
  const seen = new Set();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const body = await fetchPage(page);
    if (!body || !Array.isArray(body.data)) {
      throw new Error(`Paystack page ${page} has no data list`);
    }
    if (body.data.length === 0) return all;
    const fresh = body.data.filter((tx) => !seen.has(txKey(tx)));
    if (fresh.length === 0) {
      throw new Error(`Paystack page ${page} returned the same transactions as an earlier page`);
    }
    // A charge landing mid-run shifts rows onto the next page; keep one copy.
    for (const tx of fresh) seen.add(txKey(tx));
    all.push(...fresh);

    const meta = body.meta ?? {};
    const full = body.data.length >= perPage;
    const pageCount = Number(meta.pageCount);
    if (Number.isFinite(pageCount)) {
      if (!(pageCount > page)) return all;
    } else if (Object.hasOwn(meta, "next")) {
      if (!meta.next && !full) return all;
    } else if (full) {
      throw new Error(
        `Paystack page ${page} is full but has neither pageCount nor a cursor; can't tell if more follow`,
      );
    } else {
      return all;
    }
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

/**
 * 3 when a charge has no row or no settled row (replay its webhook), 4 when
 * the only lines left are settled with a problem (resolve or refund by hand),
 * 0 when everything is settled.
 */
export function reconcileExitCode({ unrecorded, unsettled, problems }) {
  if (unrecorded.length > 0 || unsettled.length > 0) return 3;
  return problems.length > 0 ? 4 : 0;
}

/** One report line for a transaction; amounts arrive in minor units. */
export function describeTransaction(tx) {
  const amount = typeof tx.amount === "number" ? (tx.amount / 100).toFixed(2) : "?";
  return `${tx.reference ?? "(no reference)"}  ${tx.paid_at ?? "?"}  ${amount} ${tx.currency ?? ""}`.trimEnd();
}
