// Lists successful Paystack transactions since a time and reports the ones
// with no `payments` row in Cosmos, so a charge taken around the cutover is
// never left unrecorded. Read-only: it writes nothing anywhere.
//
// A row counts when its paystackReference is the transaction reference (rows
// imported from Appwrite keep their old ids) or its id is `pi_` + sha256 of
// the reference (rows the Cosmos webhook writes).
//
// Usage:
//   PAYSTACK_SECRET_KEY=... COSMOS_ENDPOINT=... COSMOS_KEY=... \
//     node scripts/reconcile-paystack.mjs --since 2026-10-28T18:00:00Z
//
// Exit codes: 0 every transaction is recorded, 3 some are not, 2 bad
// arguments, 1 any other failure (Paystack or Cosmos error).

import { createRequire } from "node:module";
import {
  UsageError,
  describeTransaction,
  findUnrecorded,
  listSuccessfulTransactions,
  parseReconcileArgs,
} from "./lib/reconcile.mjs";

const require = createRequire(import.meta.url);
const { DATABASE_ID, createClient } = require("../api/shared/cosmos.js");

const PAYSTACK = "https://api.paystack.co";
const PER_PAGE = 100;

function paystackPageFetcher(secret, since) {
  return async (page) => {
    const query = new URLSearchParams({
      status: "success",
      from: since,
      perPage: String(PER_PAGE),
      page: String(page),
    });
    const res = await fetch(`${PAYSTACK}/transaction?${query}`, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(15000),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body || body.status === false) {
      throw new Error(`Paystack ${res.status}: ${body?.message ?? "unreadable response"}`);
    }
    return body;
  };
}

async function main() {
  const { since } = parseReconcileArgs(process.argv.slice(2));
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error("PAYSTACK_SECRET_KEY must be set");
  const payments = createClient().database(DATABASE_ID).container("payments");

  const transactions = await listSuccessfulTransactions(paystackPageFetcher(secret, since));
  const { resources: rows } = await payments.items
    .query("SELECT c.id, c.paystackReference FROM c")
    .fetchAll();
  const unrecorded = findUnrecorded(transactions, rows);

  console.log(`Successful Paystack transactions since ${since}: ${transactions.length}`);
  console.log(`Payments rows in Cosmos: ${rows.length}`);
  if (unrecorded.length === 0) {
    console.log("\nEvery transaction has a payments row.");
    return 0;
  }

  console.log(`\n${unrecorded.length} transaction(s) with no payments row:`);
  for (const tx of unrecorded) console.log(`  ${describeTransaction(tx)}`);
  console.log(`
To replay one, with DATA_BACKEND=cosmos live and WRITE_HOLD unset:
  1. Paystack dashboard > Transactions, search the reference and open it.
  2. Resend its webhook from the transaction page. Paystack also retries on
     its own (every 3 min x4, then hourly for 72 h in live mode).
  3. Check the function log for /api/paystack-webhook, then run this again
     until nothing is listed.`);
  return 3;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    if (err instanceof UsageError) {
      console.error(
        `${err.message}\nUsage notes are at the top of scripts/reconcile-paystack.mjs.`,
      );
      process.exit(2);
    }
    console.error(`Reconcile failed: ${err && err.stack ? err.stack : err}`);
    process.exit(1);
  },
);
