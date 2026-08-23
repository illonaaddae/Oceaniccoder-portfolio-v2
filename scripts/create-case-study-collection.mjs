// Creates the `project_case_studies` collection.
//
// The Project type has declared `challenge`, `solution` and `results` since the
// case study feature landed, and CaseStudyContent.tsx renders each one, but the
// attributes never existed in Appwrite. Nothing surfaced the gap because the
// admin form did not expose the fields either.
//
// Adding them to the form (OC-1) made it visible: saving any project failed with
// `Invalid document structure: Unknown attribute: "challenge"`.
//
// They cannot live on `projects`. That collection is at its row size cap, and
// Appwrite refused all three at 4000, 2000 and 1000 characters with "The maximum
// number or size of attributes for collection 'projects' has been reached".
// This is the same wall demoVideoUrl hit, so this follows the same answer: a
// side collection joined on read, exactly like project_videos.
//
// Usage:
//   APPWRITE_API_KEY=... node scripts/create-case-study-collection.mjs           # dry run
//   APPWRITE_API_KEY=... node scripts/create-case-study-collection.mjs --apply
//
// Needs the `collections.read`, `collections.write` and `attributes.write` scopes.

import { Client, Databases, Permission, Role, IndexType } from "node-appwrite";

const endpoint = process.env.APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
const projectId = process.env.APPWRITE_PROJECT_ID || "6943431e00253c8f9883";
const databaseId = process.env.APPWRITE_DATABASE_ID || "6943493400018e7c314c";
const apiKey = process.env.APPWRITE_API_KEY;

const COLLECTION_ID = "project_case_studies";
const COLLECTION_NAME = "Project Case Studies";
// Appwrite stores strings as utf8mb4, four bytes per character, against a row
// budget of roughly 64KB. Three fields at 8000 characters is 96KB and the third
// one is refused. 4000 each is 48KB and fits with room to spare.
const SIZE = 4000;

const apply = process.argv.includes("--apply");

if (!apiKey) {
  console.error("APPWRITE_API_KEY is required");
  process.exit(1);
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function collectionExists() {
  try {
    await databases.getCollection(databaseId, COLLECTION_ID);
    return true;
  } catch (error) {
    if (/could not be found|not found/i.test(error?.message ?? "")) return false;
    throw error;
  }
}

async function main() {
  const exists = await collectionExists();
  console.log(exists ? `${COLLECTION_ID} already exists.` : `${COLLECTION_ID} does not exist yet.`);

  if (!apply) {
    console.log("\nDry run. Re run with --apply to create it.");
    return;
  }

  if (!exists) {
    // Readable by anyone, because the public case study pages read it directly
    // from the browser. Writes are restricted to signed in users, which is how
    // the admin dashboard authenticates.
    await databases.createCollection(
      databaseId,
      COLLECTION_ID,
      COLLECTION_NAME,
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ],
      false,
    );
    console.log(`  created collection ${COLLECTION_ID}`);
  }

  const attributes = [
    { key: "projectId", size: 64, required: true },
    { key: "challenge", size: SIZE, required: false },
    { key: "solution", size: SIZE, required: false },
    { key: "results", size: SIZE, required: false },
  ];

  for (const { key, size, required } of attributes) {
    try {
      await databases.createStringAttribute(databaseId, COLLECTION_ID, key, size, required);
      console.log(`  ${key}: created, ${size} characters${required ? ", required" : ""}`);
    } catch (error) {
      const message = error?.message ?? String(error);
      if (/already exists/i.test(message)) {
        console.log(`  ${key}: already present`);
        continue;
      }
      console.error(`  ${key}: failed, ${message}`);
    }
  }

  // One case study per project. The index needs its attribute to finish
  // building first, which Appwrite does asynchronously.
  await wait(3000);
  try {
    await databases.createIndex(databaseId, COLLECTION_ID, "projectId_unique", IndexType.Unique, [
      "projectId",
    ]);
    console.log("  projectId_unique: created");
  } catch (error) {
    const message = error?.message ?? String(error);
    if (/already exists/i.test(message)) {
      console.log("  projectId_unique: already present");
    } else {
      console.error(`  projectId_unique: failed, ${message}`);
      console.error(
        "    Not fatal. The app works without it, but two rows for one project become possible.",
      );
    }
  }

  console.log("\nDone. Appwrite builds attributes asynchronously, so give it a few seconds.");
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});
