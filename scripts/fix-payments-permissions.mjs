// Tighten permissions on the `payments` collection.
//
// The collection shipped with read("any") / create("any") / update("any"), which
// let any unauthenticated visitor list every client name, email, amount and
// Paystack reference, and insert or modify arbitrary payment records. It also had
// no delete permission at all, so a bad record could not be removed.
//
// This aligns it with the `invoices` collection: users-only, all four verbs.
// The Paystack webhook is unaffected — it authenticates with an API key, which
// bypasses collection permissions.
//
// Usage:
//   APPWRITE_API_KEY=... node scripts/fix-payments-permissions.mjs           # dry run
//   APPWRITE_API_KEY=... node scripts/fix-payments-permissions.mjs --apply
//
// The API key needs the `collections.read` and `collections.write` scopes.

import { Client, Databases } from "node-appwrite";

const endpoint = process.env.APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
const projectId = process.env.APPWRITE_PROJECT_ID || "6943431e00253c8f9883";
const databaseId = process.env.APPWRITE_DATABASE_ID || "6943493400018e7c314c";
const apiKey = process.env.APPWRITE_API_KEY;
const collectionId = "payments";

const apply = process.argv.includes("--apply");

const DESIRED = ['read("users")', 'create("users")', 'update("users")', 'delete("users")'];

if (!apiKey) {
  console.error("APPWRITE_API_KEY is required");
  process.exit(1);
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);

async function main() {
  const collection = await databases.getCollection(databaseId, collectionId);

  console.log(`Collection: ${collection.$id} (${collection.name})`);
  console.log(`  current: ${JSON.stringify(collection.$permissions)}`);
  console.log(`  desired: ${JSON.stringify(DESIRED)}`);
  console.log(`  documentSecurity: ${collection.documentSecurity}`);

  const alreadyCorrect =
    collection.$permissions.length === DESIRED.length &&
    DESIRED.every((permission) => collection.$permissions.includes(permission));

  if (alreadyCorrect) {
    console.log("\nAlready correct — nothing to do.");
    return;
  }

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to write this change.");
    return;
  }

  const updated = await databases.updateCollection(
    databaseId,
    collectionId,
    collection.name,
    DESIRED,
    collection.documentSecurity,
    collection.enabled,
  );

  console.log(`\nApplied. New permissions: ${JSON.stringify(updated.$permissions)}`);
}

main().catch((error) => {
  console.error(`Failed: ${error.message}`);
  process.exit(1);
});
