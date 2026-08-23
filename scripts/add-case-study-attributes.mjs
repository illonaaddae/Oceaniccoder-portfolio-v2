// Adds the missing `challenge`, `solution` and `results` attributes to the
// projects collection.
//
// The Project type has declared all three since the case study feature landed,
// and CaseStudyContent.tsx renders each one when present, but the attributes
// were never created in Appwrite. Nothing surfaced the gap because the admin
// form did not expose the fields either, so no document ever carried them.
//
// Adding the fields to the form (OC-1) made the mismatch visible immediately:
// Appwrite rejects documents carrying unknown attributes, so saving any project
// failed with `Invalid document structure: Unknown attribute: "challenge"`.
//
// Sizing: this collection has previously hit the per row attribute size cap,
// which is why demoVideoUrl was moved to its own collection (see
// services/api/projectVideos.ts). These three are requested at 4000 characters
// and fall back to smaller sizes rather than leaving the collection half
// migrated. If none fit, they need their own collection, the same way.
//
// Optional, so the thirteen existing documents stay valid.
//
// Usage:
//   APPWRITE_API_KEY=... node scripts/add-case-study-attributes.mjs           # dry run
//   APPWRITE_API_KEY=... node scripts/add-case-study-attributes.mjs --apply
//
// Needs the `collections.read` and `collections.write` scopes.

import { Client, Databases } from "node-appwrite";

const endpoint = process.env.APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
const projectId = process.env.APPWRITE_PROJECT_ID || "6943431e00253c8f9883";
const databaseId = process.env.APPWRITE_DATABASE_ID || "6943493400018e7c314c";
const apiKey = process.env.APPWRITE_API_KEY;

const COLLECTION_ID = "projects";
const SIZES = [4000, 2000, 1000];
const KEYS = ["challenge", "solution", "results"];

const apply = process.argv.includes("--apply");

if (!apiKey) {
  console.error("APPWRITE_API_KEY is required");
  process.exit(1);
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);

async function main() {
  const collection = await databases.getCollection(databaseId, COLLECTION_ID);
  const present = new Set(collection.attributes.map((attribute) => attribute.key));

  const missing = KEYS.filter((key) => !present.has(key));
  if (missing.length === 0) {
    console.log("All three attributes already exist. Nothing to do.");
    return;
  }

  console.log(`Collection has ${present.size} attributes.`);
  console.log(`Missing: ${missing.join(", ")}`);

  if (!apply) {
    console.log("\nDry run. Re run with --apply to create them.");
    return;
  }

  for (const key of missing) {
    let created = false;
    for (const size of SIZES) {
      try {
        await databases.createStringAttribute(databaseId, COLLECTION_ID, key, size, false);
        console.log(`  ${key}: created at ${size} characters`);
        created = true;
        break;
      } catch (error) {
        const message = error?.message ?? String(error);
        const isSizeLimit = /size|row|limit|exceed|too large/i.test(message);
        if (isSizeLimit && size !== SIZES.at(-1)) {
          console.log(`  ${key}: ${size} did not fit, trying smaller`);
          continue;
        }
        console.error(`  ${key}: failed, ${message}`);
        break;
      }
    }
    if (!created) {
      console.error(
        `  ${key}: could not be created. The collection is likely at its row size ` +
          `limit, so these fields need their own collection, as demoVideoUrl does.`,
      );
    }
  }

  console.log("\nAppwrite builds attributes asynchronously. Wait a few seconds before saving a project.");
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});
