// Backfill the `payments` audit log from invoices already marked paid.
//
// The payments collection only started receiving writes when the audit log
// shipped (commit 4698b6e, 2026-05-20). Invoices marked paid before that date
// have no matching payment record, so the admin Payments tab shows nothing.
//
// This creates one payment record per paid invoice that does not already have
// one, keyed on invoiceNumber. It is idempotent — re-running skips invoices
// that already have a record.
//
// Backfilled records get method="bank" and status="success", matching the
// convention in InvoicesTab.handleMarkPaid for off-platform payments. There is
// no Paystack reference to recover for these, so paystackReference is omitted
// and paidAt falls back to the invoice's $updatedAt (when it was marked paid).
//
// Usage:
//   APPWRITE_API_KEY=... node scripts/backfill-payments.mjs           # dry run
//   APPWRITE_API_KEY=... node scripts/backfill-payments.mjs --apply
//
// The API key needs the `documents.read` and `documents.write` scopes.

import { Client, Databases, ID, Query } from "node-appwrite";

const endpoint = process.env.APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
const projectId = process.env.APPWRITE_PROJECT_ID || "6943431e00253c8f9883";
const databaseId = process.env.APPWRITE_DATABASE_ID || "6943493400018e7c314c";
const apiKey = process.env.APPWRITE_API_KEY;

const INVOICES = "invoices";
const PAYMENTS = "payments";
const PAGE_SIZE = 100;

const apply = process.argv.includes("--apply");

if (!apiKey) {
  console.error("APPWRITE_API_KEY is required");
  process.exit(1);
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);

// Appwrite caps a single listDocuments call, so page through with a cursor.
async function listAll(collectionId, queries = []) {
  const documents = [];
  let cursor = null;

  for (;;) {
    const page = await databases.listDocuments(databaseId, collectionId, [
      ...queries,
      Query.limit(PAGE_SIZE),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
    ]);

    documents.push(...page.documents);
    if (page.documents.length < PAGE_SIZE) return documents;
    cursor = page.documents[page.documents.length - 1].$id;
  }
}

async function main() {
  const paidInvoices = await listAll(INVOICES, [Query.equal("status", ["paid"])]);
  const existingPayments = await listAll(PAYMENTS);

  const covered = new Set(existingPayments.map((payment) => payment.invoiceNumber));

  console.log(`Paid invoices:            ${paidInvoices.length}`);
  console.log(`Existing payment records: ${existingPayments.length}`);

  const missing = paidInvoices.filter((invoice) => !covered.has(invoice.invoiceNumber));

  if (missing.length === 0) {
    console.log("\nEvery paid invoice already has a payment record — nothing to do.");
    return;
  }

  console.log(`\nMissing a payment record: ${missing.length}\n`);
  for (const invoice of missing) {
    const paidAt = invoice.$updatedAt || invoice.$createdAt;
    console.log(
      `  ${invoice.invoiceNumber}  ${invoice.currency} ${invoice.total}  ` +
        `${invoice.clientName}  paidAt=${paidAt}`,
    );
  }

  if (!apply) {
    console.log(`\nDry run. Re-run with --apply to create these ${missing.length} record(s).`);
    return;
  }

  let created = 0;
  let failed = 0;

  for (const invoice of missing) {
    try {
      await databases.createDocument(databaseId, PAYMENTS, ID.unique(), {
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientName,
        clientEmail: invoice.clientEmail || "",
        amount: invoice.total,
        currency: invoice.currency,
        method: "bank",
        paidAt: invoice.$updatedAt || invoice.$createdAt,
        status: "success",
      });
      created += 1;
      console.log(`  created ${invoice.invoiceNumber}`);
    } catch (error) {
      failed += 1;
      console.error(`  FAILED ${invoice.invoiceNumber}: ${error.message}`);
    }
  }

  console.log(`\nCreated ${created}, failed ${failed}.`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`Failed: ${error.message}`);
  process.exit(1);
});
