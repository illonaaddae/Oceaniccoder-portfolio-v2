// Lists successful Paystack transactions since a time and reports the ones
// with no settled `payments` row in Cosmos, so a charge taken around the
// cutover is never left unrecorded. Read-only: it writes nothing anywhere.
//
// A row matches when its paystackReference is the transaction reference (rows
// imported from Appwrite keep their old ids) or its id is `pi_` + sha256 of
// the reference (rows the Cosmos webhook writes). Only a success or paid row
// settles it: quote-pay writes a pending row before the charge. Rows settled
// as failed, duplicate or refunded are listed for a look by hand.
//
// Usage, with PAYSTACK_SECRET_KEY, COSMOS_ENDPOINT and COSMOS_KEY (the
// read-only key is enough) in .env.cutover (chmod 600, never committed):
//   node --env-file=.env.cutover scripts/reconcile-paystack.mjs \
//     --since 2026-10-27T18:00:00Z --mode live
//
// --since  a time with Z or an offset
// --mode   live or test; must match the key's sk_live_/sk_test_ prefix. The
//          mode and the Cosmos host are printed first; keys never are.
//
// Exit codes: 0 every transaction is settled, 3 some are unrecorded or
// unsettled, 4 none are but some need a look by hand (failed, duplicate or
// refunded on a successful charge), 2 bad arguments, 1 any other failure
// (Paystack or Cosmos error).

import { createRequire } from "node:module";
import {
  UsageError,
  cosmosHost,
  describeTransaction,
  listSuccessfulTransactions,
  parseReconcileArgs,
  paystackKeyMode,
  reconcileExitCode,
  reconcileTransactions,
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
  const { since, mode } = parseReconcileArgs(process.argv.slice(2));
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error("PAYSTACK_SECRET_KEY must be set");
  const keyMode = paystackKeyMode(secret);
  if (keyMode !== mode) {
    throw new UsageError(`--mode ${mode} given, but PAYSTACK_SECRET_KEY is a ${keyMode} key`);
  }
  const payments = createClient().database(DATABASE_ID).container("payments");
  console.log(`Paystack mode: ${keyMode.toUpperCase()}`);
  console.log(`Cosmos account: ${cosmosHost(process.env.COSMOS_ENDPOINT)}\n`);

  const transactions = await listSuccessfulTransactions(
    paystackPageFetcher(secret, since),
    PER_PAGE,
  );
  const { resources: rows } = await payments.items
    .query("SELECT c.id, c.paystackReference, c.status FROM c")
    .fetchAll();
  const { unrecorded, unsettled, problems } = reconcileTransactions(transactions, rows);

  console.log(`Successful Paystack transactions since ${since}: ${transactions.length}`);
  console.log(`Payments rows in Cosmos: ${rows.length}`);
  if (problems.length > 0) {
    console.log(`\n${problems.length} recorded as failed, duplicate or refunded (check by hand):`);
    for (const { transaction, status } of problems) {
      console.log(`  ${describeTransaction(transaction)}  [${status}]`);
    }
  }
  const code = reconcileExitCode({ unrecorded, unsettled, problems });
  if (code === 0) {
    console.log("\nEvery transaction has a settled payments row.");
    return 0;
  }
  if (code === 4) {
    console.log("\nEvery transaction has a row; resolve or refund the ones above by hand.");
    return 4;
  }

  if (unrecorded.length > 0) {
    console.log(`\n${unrecorded.length} transaction(s) with no payments row:`);
    for (const tx of unrecorded) console.log(`  ${describeTransaction(tx)}`);
  }
  if (unsettled.length > 0) {
    console.log(`\n${unsettled.length} transaction(s) whose row exists but is not settled:`);
    for (const { transaction, status } of unsettled) {
      console.log(`  ${describeTransaction(transaction)}  [${status ?? "no status"}]`);
    }
  }
  console.log(`
To replay one, with DATA_BACKEND=cosmos live and WRITE_HOLD unset:
  1. Paystack dashboard > Transactions, search the reference and open it.
  2. Resend its webhook from the transaction page. Paystack also retries on
     its own (every 3 min x4, then hourly for 72 h in live mode).
  3. Check the function log for /api/paystack-webhook, then run this again
     until nothing is listed.`);
  return code;
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
