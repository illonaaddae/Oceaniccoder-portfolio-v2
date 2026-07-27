// Adds the missing `preferredContact` attribute to the project_inquiries
// collection.
//
// The inquiry form has collected a "Preferred contact method" (Email / Phone /
// WhatsApp) since commit 4698b6e (2026-05-20) and sends it as `preferredContact`,
// but the attribute was never created. Appwrite rejects documents carrying
// unknown attributes, so EVERY inquiry submission has failed since that date —
// the form showed "Something went wrong. Please try again." and the lead was
// lost. The collection holds only two documents, both from 12–13 May 2026.
//
// InquiryPage is .jsx, so the mismatch with the TypeScript ProjectInquiry type
// (which also lacks the field) was never type-checked.
//
// Adding the attribute rather than stripping the field: the form deliberately
// asks for it and it is useful when replying to a lead. Optional, so the two
// existing documents stay valid.
//
// Usage:
//   APPWRITE_API_KEY=... node scripts/add-preferred-contact-attribute.mjs           # dry run
//   APPWRITE_API_KEY=... node scripts/add-preferred-contact-attribute.mjs --apply
//
// Needs the `collections.read` and `collections.write` scopes.

import { Client, Databases } from "node-appwrite";

const endpoint = process.env.APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
const projectId = process.env.APPWRITE_PROJECT_ID || "6943431e00253c8f9883";
const databaseId = process.env.APPWRITE_DATABASE_ID || "6943493400018e7c314c";
const apiKey = process.env.APPWRITE_API_KEY;

const COLLECTION_ID = "project_inquiries";
const KEY = "preferredContact";
const SIZE = 50;

const apply = process.argv.includes("--apply");

if (!apiKey) {
  console.error("APPWRITE_API_KEY is required");
  process.exit(1);
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);

async function main() {
  const collection = await databases.getCollection(databaseId, COLLECTION_ID);
  const existing = collection.attributes.find((attribute) => attribute.key === KEY);

  console.log(`Collection: ${collection.$id}`);
  console.log(`  attributes: ${collection.attributes.map((a) => a.key).join(", ")}`);

  if (existing) {
    console.log(`\n"${KEY}" already exists (status: ${existing.status}) — nothing to do.`);
    return;
  }

  console.log(`\nMissing: ${KEY} (string, size ${SIZE}, optional)`);

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to create it.");
    return;
  }

  await databases.createStringAttribute(databaseId, COLLECTION_ID, KEY, SIZE, false);
  console.log(`\nCreated. Appwrite provisions attributes asynchronously — poll until available.`);

  // An attribute is unusable until status === "available"; report the real state
  // rather than assuming success.
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const updated = await databases.getCollection(databaseId, COLLECTION_ID);
    const attribute = updated.attributes.find((a) => a.key === KEY);
    if (attribute?.status === "available") {
      console.log(`  status: available — inquiry submissions will now succeed.`);
      return;
    }
    if (attribute?.status === "failed") {
      console.error(`  status: failed — ${attribute.error || "no error detail"}`);
      process.exit(1);
    }
    console.log(`  status: ${attribute?.status ?? "unknown"} — waiting...`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.error("Timed out waiting for the attribute to become available.");
  process.exit(1);
}

main().catch((error) => {
  console.error(`Failed: ${error.message}`);
  process.exit(1);
});
